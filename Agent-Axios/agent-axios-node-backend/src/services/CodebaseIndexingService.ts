/**
 * Codebase Indexing Service
 * FAISS-based semantic search with Cohere embeddings
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import logger from '../utils/logger';

// FAISS types - faiss-node accepts various array formats
interface FaissIndex {
  add: (vectors: number[][] | Float32Array) => void;
  search: (query: number[] | Float32Array, k: number) => { distances: Float32Array; labels: Int32Array };
  ntotal: () => number;
  write: (filepath: string) => void;
}

interface CodeChunk {
  id: number;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
}

export class CodebaseIndexingService {
  private repoPath: string | null = null;
  private analysisId: number | null = null;
  private index: FaissIndex | null = null;
  private chunks: CodeChunk[] = [];
  private embeddingDimension: number;
  private actualEmbeddingDimension: number | null = null;

  // Cohere embedding config from env
  private cohereEndpoint: string;
  private cohereApiKey: string;
  private cohereModel: string;

  constructor(repoPath?: string, analysisId?: number) {
    this.repoPath = repoPath || null;
    this.analysisId = analysisId || null;
    this.embeddingDimension = parseInt(process.env.COHERE_EMBED_DIMENSIONS || '1024', 10);

    this.cohereEndpoint = process.env.COHERE_EMBED_ENDPOINT || '';
    this.cohereApiKey = process.env.COHERE_EMBED_API_KEY || '';
    this.cohereModel = process.env.COHERE_EMBED_MODEL || 'Cohere-embed-v3-english';

    logger.info('CodebaseIndexingService initialized');
  }

  /**
   * Get embeddings from Cohere API
   */
  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!this.cohereApiKey) {
        logger.warn('Cohere API key not configured, using mock embeddings');
        const dim = this.actualEmbeddingDimension || this.embeddingDimension;
        return texts.map(() => Array(dim).fill(0).map(() => Math.random()));
      }

      const response = await axios.post(
        `${this.cohereEndpoint}embeddings`,
        {
          input: texts,
          model: this.cohereModel,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.cohereApiKey,
          },
          timeout: 60000,
        }
      );

      let embeddings: number[][] = [];

      // Handle Azure OpenAI-style response
      if (response.data.data) {
        embeddings = response.data.data.map((item: any) => item.embedding);
      }
      // Handle Cohere-style response
      else if (response.data.embeddings) {
        embeddings = response.data.embeddings;
      } else {
        throw new Error('Unexpected embedding response format');
      }

      // Auto-detect actual embedding dimension from first response
      if (embeddings.length > 0 && !this.actualEmbeddingDimension) {
        this.actualEmbeddingDimension = embeddings[0].length;
        logger.info(`Detected embedding dimension: ${this.actualEmbeddingDimension}`);
      }

      return embeddings;
    } catch (error: any) {
      logger.error(`Embedding API error: ${error.message}`);
      // Fallback to random embeddings for development
      logger.warn('Using random embeddings as fallback');
      const dim = this.actualEmbeddingDimension || this.embeddingDimension;
      return texts.map(() => Array(dim).fill(0).map(() => Math.random()));
    }
  }

  /**
   * Chunk code files into smaller pieces
   */
  private async chunkCodebase(repoPath: string): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    let chunkId = 0;

    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.rb',
      '.php', '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.scala',
      '.vue', '.svelte', '.sql', '.sh', '.bash', '.yaml', '.yml', '.json'
    ];

    const walkDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          // Skip node_modules, .git, etc
          if (stat.isDirectory()) {
            if (!['node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', '.next'].includes(file)) {
              walkDir(filePath);
            }
            continue;
          }

          const ext = path.extname(file).toLowerCase();
          if (!codeExtensions.includes(ext)) continue;

          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const chunkSize = 50; // lines per chunk

            for (let i = 0; i < lines.length; i += chunkSize) {
              const chunkLines = lines.slice(i, i + chunkSize);
              const chunkContent = chunkLines.join('\n').trim();

              if (chunkContent.length > 50) { // Skip very small chunks
                chunks.push({
                  id: chunkId++,
                  filePath: path.relative(repoPath, filePath),
                  content: chunkContent,
                  startLine: i + 1,
                  endLine: Math.min(i + chunkSize, lines.length),
                  language: ext.slice(1),
                });
              }
            }
          } catch (readError) {
            // Skip files that can't be read
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
      }
    };

    walkDir(repoPath);
    logger.info(`Chunked codebase into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Build FAISS index for the codebase
   */
  async buildIndex(repoPath: string, analysisId: number): Promise<void> {
    try {
      this.repoPath = repoPath;
      this.analysisId = analysisId;

      logger.info(`Building FAISS index for ${repoPath}`);

      // 1. Chunk code files
      this.chunks = await this.chunkCodebase(repoPath);

      if (this.chunks.length === 0) {
        logger.warn('No code chunks found to index');
        return;
      }

      // 2. Generate embeddings in batches
      const batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || '10', 10);
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < this.chunks.length; i += batchSize) {
        const batch = this.chunks.slice(i, i + batchSize);
        const texts = batch.map(chunk =>
          `File: ${chunk.filePath}\n${chunk.content.substring(0, 500)}`
        );

        const embeddings = await this.getEmbeddings(texts);
        allEmbeddings.push(...embeddings);

        logger.info(`Embedded ${Math.min(i + batchSize, this.chunks.length)}/${this.chunks.length} chunks`);
      }

      // 3. Build FAISS index using detected dimension
      try {
        // Use the actual dimension from embeddings if detected
        const dimension = this.actualEmbeddingDimension || this.embeddingDimension;
        logger.info(`Building FAISS index with dimension: ${dimension}`);

        // Verify all embeddings have the same dimension
        const validEmbeddings = allEmbeddings.filter(e => e.length === dimension);
        if (validEmbeddings.length !== allEmbeddings.length) {
          logger.warn(`Filtered ${allEmbeddings.length - validEmbeddings.length} embeddings with wrong dimension`);
        }

        if (validEmbeddings.length === 0) {
          throw new Error('No valid embeddings to index');
        }

        const faiss = require('faiss-node');
        this.index = new faiss.IndexFlatL2(dimension);

        // faiss-node add() expects a 2D array where each row is an embedding
        // Try batch add first, fall back to individual adds if it fails
        try {
          this.index!.add(validEmbeddings);
        } catch (batchError: any) {
          logger.warn(`Batch add failed (${batchError.message}), adding embeddings individually...`);
          // Add embeddings one at a time
          for (const embedding of validEmbeddings) {
            this.index!.add([embedding]);
          }
        }

        logger.info(`✓ FAISS index built with ${this.index!.ntotal()} vectors`);

        // 4. Save index to disk
        const indexDir = path.join(process.env.FAISS_DIR || './data/faiss_indexes', String(analysisId));
        if (!fs.existsSync(indexDir)) {
          fs.mkdirSync(indexDir, { recursive: true });
        }

        this.index!.write(path.join(indexDir, 'index.faiss'));
        fs.writeFileSync(
          path.join(indexDir, 'chunks.json'),
          JSON.stringify(this.chunks, null, 2)
        );
        // Save dimension for future loads
        fs.writeFileSync(
          path.join(indexDir, 'config.json'),
          JSON.stringify({ dimension }, null, 2)
        );

        logger.info(`✓ Index saved to ${indexDir}`);
      } catch (faissError: any) {
        logger.error(`FAISS error: ${faissError.message}`);
        logger.warn('Continuing without FAISS - will use basic text search');
      }
    } catch (error: any) {
      logger.error(`Failed to build index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search the codebase semantically
   */
  async search(query: string, limit: number = 10, minScore: number = 0.3): Promise<any[]> {
    try {
      logger.info(`Searching codebase for: ${query}`);

      // If FAISS index is available and has vectors, use it
      if (this.index && this.index.ntotal() > 0 && this.chunks.length > 0) {
        try {
          const [queryEmbedding] = await this.getEmbeddings([query]);
          const k = Math.min(limit, this.index.ntotal());
          const { distances, labels } = this.index.search(queryEmbedding, k);

          // Convert typed arrays to regular arrays for processing
          const labelsArray = Array.from(labels);
          const distancesArray = Array.from(distances);

          const results = labelsArray
            .map((label: number, i: number) => {
              if (label < 0 || label >= this.chunks.length) return null;
              const chunk = this.chunks[label];
              const score = 1 / (1 + distancesArray[i]); // Convert distance to score
              return {
                ...chunk,
                score,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null && r.score >= minScore);

          logger.info(`Found ${results.length} results via FAISS`);
          return results;
        } catch (faissSearchError: any) {
          logger.warn(`FAISS search failed, falling back to text search: ${faissSearchError.message}`);
          // Fall through to text search
        }
      }

      // Fallback: basic text search using chunks
      if (this.chunks.length > 0) {
        logger.info(`Using text search fallback (${this.chunks.length} chunks available)`);
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

        const results = this.chunks
          .map(chunk => {
            const contentLower = chunk.content.toLowerCase();
            const filePathLower = chunk.filePath.toLowerCase();
            // Score based on how many query terms match in content or file path
            const contentMatches = queryTerms.filter(term => contentLower.includes(term)).length;
            const pathMatches = queryTerms.filter(term => filePathLower.includes(term)).length;
            const matchCount = contentMatches + pathMatches * 0.5; // Weight path matches less
            const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
            return { ...chunk, score };
          })
          .filter(chunk => chunk.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        logger.info(`Found ${results.length} results via text search`);
        return results;
      }

      logger.warn('No chunks available for search');
      return [];
    } catch (error: any) {
      logger.error(`Search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Load existing index
   */
  async loadIndex(analysisId: number): Promise<boolean> {
    try {
      this.analysisId = analysisId;
      const indexDir = path.join(process.env.FAISS_DIR || './data/faiss_indexes', String(analysisId));

      const indexPath = path.join(indexDir, 'index.faiss');
      const chunksPath = path.join(indexDir, 'chunks.json');
      const configPath = path.join(indexDir, 'config.json');

      if (!fs.existsSync(indexPath) || !fs.existsSync(chunksPath)) {
        logger.warn(`No existing index found for analysis ${analysisId}`);
        return false;
      }

      try {
        // Load config to get dimension
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          this.actualEmbeddingDimension = config.dimension;
        }

        const faiss = require('faiss-node');
        this.index = faiss.IndexFlatL2.read(indexPath);
        this.chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));

        logger.info(`✓ Loaded existing index with ${this.chunks.length} chunks`);
        return true;
      } catch (faissError: any) {
        logger.error(`Failed to load FAISS index: ${faissError.message}`);
        return false;
      }
    } catch (error: any) {
      logger.error(`Failed to load index: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all chunks (for tools that need raw access)
   */
  getChunks(): CodeChunk[] {
    return this.chunks;
  }
}
