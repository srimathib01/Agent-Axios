"""Initialize config package."""
from .settings import config, Config, DevelopmentConfig, ProductionConfig

# Export module-level variables for retrieval service compatibility
FAISS_INDEX_DIR = Config.FAISS_INDEX_DIR
RETRIEVAL_CONFIG = Config.RETRIEVAL_CONFIG
LOGGING_CONFIG = Config.LOGGING_CONFIG

__all__ = [
    'config', 
    'Config', 
    'DevelopmentConfig', 
    'ProductionConfig',
    'FAISS_INDEX_DIR',
    'RETRIEVAL_CONFIG',
    'LOGGING_CONFIG',
]
