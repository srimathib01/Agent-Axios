/**
 * Codebase Search Tool
 * Semantic search using FAISS indexing
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import { getIndexingService } from './context';
import logger from '../utils/logger';

// Legacy: keep for backwards compatibility
let legacyIndexingService: any = null;

export function setIndexingService(service: any): void {
  legacyIndexingService = service;
}

export const createSearchCodebaseSemanticallTool = (conversationSession: ConversationSession) => {
  return tool(
    async (
      { query, limit = 10, minScore = 0.3 }: { query: string; limit?: number; minScore?: number },
      config?: LangGraphRunnableConfig
    ) => {
      try {
        logger.info(`Semantic search: ${query.substring(0, 100)}`);
        config?.writer?.('🔍 Searching codebase semantically...');

        // Get indexing service from shared context or legacy
        const indexingService = getIndexingService() || legacyIndexingService;

        if (!indexingService) {
          logger.warn('Indexing service not initialized');
          return JSON.stringify({
            error: 'Codebase not indexed yet. Run build_codebase_index first.',
            success: false,
            results: [],
          });
        }

        config?.writer?.(`🔎 Searching for: "${query.substring(0, 50)}..."`);

        // Perform semantic search
        const results = await indexingService.search(query, limit, minScore);

        logger.info(`✓ Found ${results.length} relevant code chunks`);
        config?.writer?.(`✅ Found ${results.length} relevant code chunks`);

        return JSON.stringify({
          success: true,
          results,
          query,
          total_found: results.length,
        });
      } catch (error: any) {
        logger.error(`✗ Error in semantic search: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({
          error: error.message,
          success: false,
          results: [],
        });
      }
    },
    {
      name: 'search_codebase_semantically',
      description: `Search the codebase using semantic similarity to find relevant code chunks.

WHEN TO USE:
- To find code patterns that may be vulnerable
- To locate specific functionality in the codebase
- To identify areas of interest for vulnerability analysis

PREREQUISITE:
- You MUST call build_codebase_index first to create the search index

INPUT:
{
  "query": "SQL injection vulnerability in user input",
  "limit": 10,        // optional, max results (default: 10)
  "minScore": 0.3     // optional, minimum similarity score (default: 0.3)
}

RETURNS:
JSON object with:
- success: Boolean
- results: Array of relevant code chunks with file paths and content
- total_found: Number of results found

EXAMPLE QUERIES:
- "SQL query string concatenation"
- "eval() with user input"
- "command execution shell"
- "hardcoded credentials password"
- "file path traversal"`,
      schema: z.object({
        query: z.string().min(1).describe('Search query describing what to find'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default: 10)'),
        minScore: z.number().nullable().optional().describe('Minimum similarity score 0-1 (default: 0.3)'),
      }),
    }
  );
};
