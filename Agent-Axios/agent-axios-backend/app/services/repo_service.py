"""Repository cloning service with LangSmith tracking and caching."""
import os
import tempfile
import shutil
import hashlib
from pathlib import Path
from git import Repo, GitCommandError
from langsmith import traceable
import logging

logger = logging.getLogger(__name__)

class RepoService:
    """Handles repository cloning and cleanup with intelligent caching."""
    
    def __init__(self, cache_dir: str = "data/cache/repositories"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized RepoService with cache at {self.cache_dir}")
    
    def _get_repo_cache_key(self, repo_url: str, branch: str = None) -> str:
        """Generate cache key from repo URL and branch."""
        key = f"{repo_url}:{branch or 'default'}"
        return hashlib.sha256(key.encode()).hexdigest()
    
    @traceable(name="clone_repository", run_type="tool")
    def clone(self, repo_url: str, branch: str = None, use_cache: bool = True) -> str:
        """
        Clone a git repository with intelligent caching.
        
        Args:
            repo_url: Git repository URL (https or ssh)
            branch: Optional branch name (defaults to repo's default branch)
            use_cache: Whether to use cached repository (default: True)
        
        Returns:
            str: Absolute path to cloned repository (cached or fresh)
        
        Raises:
            GitCommandError: If cloning fails
        """
        # Check cache first if enabled
        if use_cache:
            cache_key = self._get_repo_cache_key(repo_url, branch)
            cached_path = self.cache_dir / cache_key
            
            if cached_path.exists():
                try:
                    # Verify it's a valid git repo
                    cached_repo = Repo(str(cached_path))
                    
                    # Try to pull latest changes
                    try:
                        origin = cached_repo.remotes.origin
                        origin.pull()
                        logger.info(f"✓ Using cached repository at {cached_path} (updated)")
                    except:
                        logger.info(f"✓ Using cached repository at {cached_path} (offline mode)")
                    
                    logger.info(f"Cache hit! Last commit: {cached_repo.head.commit.hexsha[:8]}")
                    return str(cached_path)
                except Exception as e:
                    logger.warning(f"Cached repo invalid, re-cloning: {e}")
                    shutil.rmtree(cached_path, ignore_errors=True)

        temp_dir = None
        try:
            # Determine target directory (cache or temp)
            if use_cache:
                cache_key = self._get_repo_cache_key(repo_url, branch)
                temp_dir = str(self.cache_dir / cache_key)
                logger.info(f"Cloning {repo_url} to cache: {temp_dir}")
            else:
                temp_dir = tempfile.mkdtemp(prefix='agent_axios_')
                logger.info(f"Cloning {repo_url} to temp: {temp_dir}")
            
            # Clone repository
            clone_kwargs = {
                'depth': 1,  # Shallow clone for speed
                'single_branch': True
            }
            
            if branch:
                clone_kwargs['branch'] = branch
            
            repo = Repo.clone_from(repo_url, temp_dir, **clone_kwargs)
            
            logger.info(f"✓ Successfully cloned {repo_url}")
            logger.info(f"  Branch: {repo.active_branch.name}")
            logger.info(f"  Commit: {repo.head.commit.hexsha[:8]}")
            if use_cache:
                logger.info(f"  Cached for future use")
            
            return temp_dir
            
        except GitCommandError as e:
            logger.error(f"✗ Failed to clone {repo_url}: {str(e)}")
            # Cleanup on failure
            if temp_dir and os.path.exists(temp_dir) and not use_cache:
                shutil.rmtree(temp_dir)
            raise Exception(f"Failed to clone repository: {str(e)}")
    
    @staticmethod
    def cleanup(repo_path: str):
        """
        Remove cloned repository directory.
        
        Args:
            repo_path: Path to repository directory
        """
        try:
            if os.path.exists(repo_path):
                shutil.rmtree(repo_path)
                logger.info(f"Cleaned up repository at {repo_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {repo_path}: {str(e)}")
    
    @traceable(name="get_repo_metadata", run_type="tool")
    def get_metadata(self, repo_path: str) -> dict:
        """
        Extract repository metadata.
        
        Args:
            repo_path: Path to cloned repository
        
        Returns:
            dict: Repository metadata (branch, commit, etc.)
        """
        try:
            repo = Repo(repo_path)
            
            return {
                'branch': repo.active_branch.name,
                'commit': repo.head.commit.hexsha,
                'commit_message': repo.head.commit.message.strip(),
                'author': str(repo.head.commit.author),
                'commit_date': repo.head.commit.committed_datetime.isoformat(),
                'remotes': [remote.url for remote in repo.remotes]
            }
        except Exception as e:
            logger.warning(f"Failed to get metadata: {str(e)}")
            return {}
