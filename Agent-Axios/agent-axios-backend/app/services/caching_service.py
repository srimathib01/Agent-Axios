"""
Comprehensive caching service for improved performance.
Implements multi-level caching:
1. Embedding cache - avoid re-computing embeddings for same text
2. Repository metadata cache - cache repository structure analysis
3. FAISS index reuse - detect unchanged codebases and reuse indexes
"""
import os
import json
import hashlib
import pickle
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingCache:
    """Disk-based cache for embeddings to avoid re-computation."""
    
    def __init__(self, cache_dir: str = "data/cache/embeddings"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.memory_cache = {}  # In-memory LRU for session
        self.max_memory_items = 1000
        logger.info(f"Initialized EmbeddingCache at {self.cache_dir}")
    
    def _hash_text(self, text: str, model: str = "cohere") -> str:
        """Generate cache key from text and model."""
        content = f"{model}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get(self, text: str, model: str = "cohere") -> Optional[List[float]]:
        """Get cached embedding if available."""
        cache_key = self._hash_text(text, model)
        
        # Check memory cache first
        if cache_key in self.memory_cache:
            logger.debug(f"Memory cache hit for text: {text[:50]}...")
            return self.memory_cache[cache_key]
        
        # Check disk cache
        cache_file = self.cache_dir / f"{cache_key}.npy"
        if cache_file.exists():
            try:
                embedding = np.load(cache_file).tolist()
                # Add to memory cache
                if len(self.memory_cache) < self.max_memory_items:
                    self.memory_cache[cache_key] = embedding
                logger.debug(f"Disk cache hit for text: {text[:50]}...")
                return embedding
            except Exception as e:
                logger.warning(f"Failed to load cached embedding: {e}")
                return None
        
        return None
    
    def set(self, text: str, embedding: List[float], model: str = "cohere"):
        """Cache an embedding."""
        cache_key = self._hash_text(text, model)
        
        # Save to memory cache
        if len(self.memory_cache) < self.max_memory_items:
            self.memory_cache[cache_key] = embedding
        
        # Save to disk cache
        cache_file = self.cache_dir / f"{cache_key}.npy"
        try:
            np.save(cache_file, np.array(embedding))
            logger.debug(f"Cached embedding for text: {text[:50]}...")
        except Exception as e:
            logger.warning(f"Failed to cache embedding: {e}")
    
    def get_batch(self, texts: List[str], model: str = "cohere") -> Tuple[List[Optional[List[float]]], List[int]]:
        """
        Get cached embeddings for a batch of texts.
        
        Returns:
            - List of embeddings (None for cache misses)
            - List of indices that need computation
        """
        embeddings = []
        missing_indices = []
        
        for i, text in enumerate(texts):
            cached = self.get(text, model)
            embeddings.append(cached)
            if cached is None:
                missing_indices.append(i)
        
        logger.info(f"Batch cache: {len(texts) - len(missing_indices)}/{len(texts)} hits")
        return embeddings, missing_indices
    
    def set_batch(self, texts: List[str], embeddings: List[List[float]], model: str = "cohere"):
        """Cache a batch of embeddings."""
        for text, embedding in zip(texts, embeddings):
            self.set(text, embedding, model)
    
    def clear_old(self, days: int = 30):
        """Clear cache entries older than specified days."""
        cutoff = datetime.now().timestamp() - (days * 86400)
        removed = 0
        
        for cache_file in self.cache_dir.glob("*.npy"):
            if cache_file.stat().st_mtime < cutoff:
                cache_file.unlink()
                removed += 1
        
        logger.info(f"Removed {removed} old cache entries (older than {days} days)")


class RepositoryMetadataCache:
    """Cache for repository structure analysis to avoid re-scanning."""
    
    def __init__(self, cache_dir: str = "data/cache/repo_metadata"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized RepositoryMetadataCache at {self.cache_dir}")
    
    def _get_repo_hash(self, repo_url: str, commit_hash: Optional[str] = None) -> str:
        """Generate cache key from repo URL and commit hash."""
        key = f"{repo_url}:{commit_hash or 'latest'}"
        return hashlib.sha256(key.encode()).hexdigest()
    
    def _get_cache_file(self, repo_url: str, commit_hash: Optional[str] = None) -> Path:
        """Get cache file path for a repository."""
        cache_key = self._get_repo_hash(repo_url, commit_hash)
        return self.cache_dir / f"{cache_key}.json"
    
    def get(self, repo_url: str, commit_hash: Optional[str] = None, max_age_hours: int = 24) -> Optional[Dict[str, Any]]:
        """
        Get cached repository metadata.
        
        Args:
            repo_url: Repository URL
            commit_hash: Specific commit hash (optional)
            max_age_hours: Maximum age in hours before considering stale
        
        Returns:
            Cached metadata or None
        """
        cache_file = self._get_cache_file(repo_url, commit_hash)
        
        if not cache_file.exists():
            logger.debug(f"No cache for repo: {repo_url}")
            return None
        
        # Check age
        age_seconds = datetime.now().timestamp() - cache_file.stat().st_mtime
        if age_seconds > (max_age_hours * 3600):
            logger.debug(f"Cache expired for repo: {repo_url} (age: {age_seconds/3600:.1f}h)")
            return None
        
        try:
            with open(cache_file, 'r') as f:
                metadata = json.load(f)
            logger.info(f"Cache hit for repo: {repo_url}")
            return metadata
        except Exception as e:
            logger.warning(f"Failed to load cached metadata: {e}")
            return None
    
    def set(self, repo_url: str, metadata: Dict[str, Any], commit_hash: Optional[str] = None):
        """Cache repository metadata."""
        cache_file = self._get_cache_file(repo_url, commit_hash)
        
        try:
            # Add timestamp
            metadata['cached_at'] = datetime.now().isoformat()
            metadata['commit_hash'] = commit_hash
            
            with open(cache_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Cached metadata for repo: {repo_url}")
        except Exception as e:
            logger.warning(f"Failed to cache metadata: {e}")
    
    def clear_old(self, days: int = 7):
        """Clear cache entries older than specified days."""
        cutoff = datetime.now().timestamp() - (days * 86400)
        removed = 0
        
        for cache_file in self.cache_dir.glob("*.json"):
            if cache_file.stat().st_mtime < cutoff:
                cache_file.unlink()
                removed += 1
        
        logger.info(f"Removed {removed} old repo metadata entries (older than {days} days)")


class IndexCache:
    """Manages FAISS index reuse based on repository state."""
    
    def __init__(self, index_base_dir: str = "data/faiss_indexes"):
        self.index_base_dir = Path(index_base_dir)
        self.index_base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized IndexCache at {self.index_base_dir}")
    
    def _calculate_repo_fingerprint(self, repo_path: str) -> str:
        """
        Calculate a fingerprint of the repository based on file contents.
        Uses file sizes and modification times for efficiency.
        """
        import git
        
        try:
            # Try to get git commit hash (most reliable)
            repo = git.Repo(repo_path)
            commit_hash = repo.head.commit.hexsha
            logger.info(f"Using git commit hash as fingerprint: {commit_hash[:8]}")
            return commit_hash
        except:
            # Fallback: hash of file structure and sizes
            logger.warning("Not a git repo, using file-based fingerprint")
            fingerprint_data = []
            
            for root, dirs, files in os.walk(repo_path):
                # Skip hidden and common ignore directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__']]
                
                for filename in sorted(files):
                    if not filename.startswith('.'):
                        filepath = os.path.join(root, filename)
                        try:
                            stat = os.stat(filepath)
                            rel_path = os.path.relpath(filepath, repo_path)
                            fingerprint_data.append(f"{rel_path}:{stat.st_size}")
                        except:
                            pass
            
            fingerprint = hashlib.sha256('\n'.join(fingerprint_data).encode()).hexdigest()
            return fingerprint
    
    def get_index_path(self, repo_url: str, repo_path: str) -> Tuple[str, str, bool]:
        """
        Get index path and determine if existing index can be reused.
        
        Returns:
            - Index file path
            - Metadata file path  
            - Boolean indicating if index exists and is valid
        """
        # Calculate fingerprint
        fingerprint = self._calculate_repo_fingerprint(repo_path)
        
        # Generate cache key from repo URL and fingerprint
        cache_key = hashlib.sha256(f"{repo_url}:{fingerprint}".encode()).hexdigest()
        
        index_dir = self.index_base_dir / cache_key
        index_file = index_dir / "codebase_index.faiss"
        metadata_file = index_dir / "codebase_index_metadata.pkl"
        
        # Check if valid index exists
        valid = (
            index_file.exists() and 
            metadata_file.exists() and
            index_file.stat().st_size > 0
        )
        
        if valid:
            logger.info(f"Found existing index for repo (fingerprint: {fingerprint[:8]})")
        else:
            logger.info(f"No existing index for repo (fingerprint: {fingerprint[:8]})")
            index_dir.mkdir(parents=True, exist_ok=True)
        
        return str(index_file), str(metadata_file), valid


class CacheManager:
    """Unified cache manager for all caching operations."""
    
    def __init__(self):
        self.embedding_cache = EmbeddingCache()
        self.repo_cache = RepositoryMetadataCache()
        self.index_cache = IndexCache()
        logger.info("Initialized CacheManager")
    
    def cleanup_old_caches(self, embedding_days: int = 30, repo_days: int = 7):
        """Clean up old cache entries."""
        logger.info("Cleaning up old cache entries...")
        self.embedding_cache.clear_old(embedding_days)
        self.repo_cache.clear_old(repo_days)
        logger.info("Cache cleanup complete")


# Global cache manager instance
_cache_manager = None


def get_cache_manager() -> CacheManager:
    """Get or create the global cache manager."""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager
