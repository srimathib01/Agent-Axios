"""Codebase indexing service using FAISS for semantic code search with intelligent caching."""
import os
import pickle
import numpy as np
from typing import List, Dict, Any, Optional, Callable
import faiss
from langsmith import traceable
from app.models import CodeChunk
from app.services.cohere_service import CohereEmbeddingService
import logging

logger = logging.getLogger(__name__)


class CodebaseIndexingService:
    """Handles FAISS indexing and searching of codebase chunks with caching support."""
    
    BATCH_SIZE = 10
    
    def __init__(self, index_path: str = None, repo_url: str = None, repo_path: str = None):
        self.cohere_embedding = CohereEmbeddingService(use_cache=True)  # Enable caching
        self.dimension = self.cohere_embedding.dimensions  # 1024
        self.index = None
        self.metadata = []  # Store chunk metadata
        self.repo_url = repo_url
        self.repo_path = repo_path
        
        # Use smart caching if repo info provided
        if repo_url and repo_path:
            from app.services.caching_service import get_cache_manager
            cache_manager = get_cache_manager()
            self.index_path, self.metadata_path, self.index_exists = cache_manager.index_cache.get_index_path(
                repo_url, repo_path
            )
            
            if self.index_exists:
                logger.info(f"Reusable index found at {self.index_path}")
        else:
            self.index_path = index_path or "data/faiss_indexes/codebase_index.faiss"
            self.metadata_path = self.index_path.replace('.faiss', '_metadata.pkl')
            self.index_exists = os.path.exists(self.index_path) and os.path.exists(self.metadata_path)
        
        logger.info(f"Initialized CodebaseIndexingService with {self.dimension}-dim vectors")
    
    @traceable(name="index_chunks", run_type="tool")
    def index_chunks(
        self,
        chunks: List[CodeChunk],
        progress_callback: Optional[Callable[[int, int], None]] = None,
        force_reindex: bool = False
    ):
        """
        Create FAISS index from code chunks with smart caching.
        
        Args:
            chunks: List of CodeChunk objects to index
            progress_callback: Optional progress callback (current, total)
            force_reindex: Force reindexing even if cache exists
        """
        if not chunks:
            logger.warning("No chunks provided for indexing")
            return
        
        # Try to load existing index if not forcing reindex
        if not force_reindex and hasattr(self, 'index_exists') and self.index_exists:
            logger.info("Attempting to load existing index from cache...")
            if self.load_index():
                logger.info(f"✓ Successfully loaded cached index with {self.index.ntotal} vectors - skipping reindexing")
                if progress_callback:
                    progress_callback(len(chunks), len(chunks))
                return
            else:
                logger.warning("Failed to load cached index, proceeding with reindexing")
        
        total = len(chunks)
        logger.info(f"Indexing {total} chunks into FAISS")
        
        # Initialize FAISS index (Inner Product for cosine similarity with normalized vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        
        # Process in batches
        all_vectors = []
        
        for i in range(0, total, self.BATCH_SIZE):
            batch = chunks[i:i + self.BATCH_SIZE]
            
            try:
                # Prepare texts for embedding
                texts = []
                for chunk in batch:
                    text = f"File: {chunk.file_path}\nLines {chunk.line_start}-{chunk.line_end}\n\n{chunk.chunk_text}"
                    texts.append(text)
                
                # Generate embeddings
                embeddings = self.cohere_embedding.generate_embeddings(texts, input_type="search_document")
                
                # Normalize vectors for cosine similarity
                embeddings_array = np.array(embeddings, dtype='float32')
                faiss.normalize_L2(embeddings_array)
                
                all_vectors.append(embeddings_array)
                
                # Store metadata
                for chunk in batch:
                    self.metadata.append({
                        'chunk_id': chunk.chunk_id,
                        'analysis_id': chunk.analysis_id,
                        'file_path': chunk.file_path,
                        'line_start': chunk.line_start,
                        'line_end': chunk.line_end,
                        'language': chunk.language,
                        'chunk_text': chunk.chunk_text[:500]  # Store snippet for quick access
                    })
                
                # Report progress
                processed = min(i + self.BATCH_SIZE, total)
                if progress_callback:
                    progress_callback(processed, total)
                
                logger.info(f"Indexed batch {i // self.BATCH_SIZE + 1}: {processed}/{total} chunks")
                
            except Exception as e:
                logger.error(f"Failed to index batch {i // self.BATCH_SIZE + 1}: {str(e)}")
                continue
        
        # Add all vectors to index
        if all_vectors:
            all_vectors_array = np.vstack(all_vectors)
            self.index.add(all_vectors_array)
            logger.info(f"Successfully indexed {self.index.ntotal} vectors")
        
        # Save index to disk
        self.save_index()
    
    def save_index(self):
        """Save FAISS index and metadata to disk."""
        try:
            # Create directory if needed
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            
            # Save FAISS index
            faiss.write_index(self.index, self.index_path)
            
            # Save metadata
            with open(self.metadata_path, 'wb') as f:
                pickle.dump(self.metadata, f)
            
            logger.info(f"Saved FAISS index to {self.index_path}")
            logger.info(f"Saved metadata to {self.metadata_path}")
            
        except Exception as e:
            logger.error(f"Failed to save index: {str(e)}")
    
    def load_index(self):
        """Load FAISS index and metadata from disk."""
        try:
            if not os.path.exists(self.index_path):
                logger.warning(f"Index file not found: {self.index_path}")
                return False
            
            # Load FAISS index
            self.index = faiss.read_index(self.index_path)
            
            # Load metadata
            with open(self.metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
            
            logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load index: {str(e)}")
            return False
    
    @traceable(name="search_codebase", run_type="retriever")
    def search(
        self,
        query: str,
        top_k: int = 10,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Search codebase using semantic similarity.
        
        Args:
            query: Search query describing the vulnerability or code pattern
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
        
        Returns:
            List of matching code chunks with metadata
        """
        if self.index is None or self.index.ntotal == 0:
            logger.warning("No index available for search")
            return []
        
        try:
            # Generate query embedding
            query_embedding = self.cohere_embedding.generate_embeddings([query], input_type="search_query")[0]
            
            # Normalize for cosine similarity
            query_vector = np.array([query_embedding], dtype='float32')
            faiss.normalize_L2(query_vector)
            
            # Search
            scores, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))
            
            # Filter by threshold and format results
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx >= 0 and score >= similarity_threshold:
                    metadata = self.metadata[idx]
                    results.append({
                        'chunk_id': metadata['chunk_id'],
                        'file_path': metadata['file_path'],
                        'line_start': metadata['line_start'],
                        'line_end': metadata['line_end'],
                        'language': metadata['language'],
                        'similarity_score': float(score),
                        'chunk_snippet': metadata['chunk_text']
                    })
            
            logger.info(f"Found {len(results)} matches above threshold {similarity_threshold}")
            return results
            
        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return []
    
    @traceable(name="search_multiple_queries", run_type="retriever")
    def search_multiple(
        self,
        queries: List[str],
        top_k_per_query: int = 10,
        similarity_threshold: float = 0.5,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search codebase with multiple queries and deduplicate results.
        
        Args:
            queries: List of search queries
            top_k_per_query: Results per query
            similarity_threshold: Minimum similarity score
            progress_callback: Optional progress callback
        
        Returns:
            Deduplicated list of matching chunks sorted by best score
        """
        all_results = {}  # chunk_id -> result (keeping best score)
        total = len(queries)
        
        for i, query in enumerate(queries):
            results = self.search(query, top_k=top_k_per_query, similarity_threshold=similarity_threshold)
            
            for result in results:
                chunk_id = result['chunk_id']
                # Keep result with highest score
                if chunk_id not in all_results or result['similarity_score'] > all_results[chunk_id]['similarity_score']:
                    all_results[chunk_id] = result
            
            if progress_callback:
                progress_callback(i + 1, total)
            
            logger.info(f"Query {i + 1}/{total}: found {len(results)} matches")
        
        # Sort by score descending
        sorted_results = sorted(all_results.values(), key=lambda x: x['similarity_score'], reverse=True)
        
        logger.info(f"Total unique matches across {total} queries: {len(sorted_results)}")
        return sorted_results
