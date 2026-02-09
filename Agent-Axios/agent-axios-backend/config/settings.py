"""Configuration settings for Agent Axios Backend."""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///agent_axios.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'false').lower() == 'true'
    
    # Azure OpenAI (GPT-4.1)
    AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
    AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
    AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
    AZURE_OPENAI_MODEL = os.getenv('AZURE_OPENAI_MODEL', 'gpt-4.1')
    
    # Azure Cohere Embeddings
    COHERE_EMBED_ENDPOINT = os.getenv('COHERE_EMBED_ENDPOINT')
    COHERE_EMBED_API_KEY = os.getenv('COHERE_EMBED_API_KEY')
    COHERE_EMBED_MODEL = os.getenv('COHERE_EMBED_MODEL', 'Cohere-embed-v3-english')
    COHERE_EMBED_DIMENSIONS = int(os.getenv('COHERE_EMBED_DIMENSIONS', '1024'))
    
    # Azure Cohere Reranker
    COHERE_RERANK_ENDPOINT = os.getenv('COHERE_RERANK_ENDPOINT')
    COHERE_RERANK_API_KEY = os.getenv('COHERE_RERANK_API_KEY')
    COHERE_RERANK_MODEL = os.getenv('COHERE_RERANK_MODEL', 'Rerank-v3-5')

    # External CVE retrieval service (FAISS + Cohere embeddings)
    CVE_SERVICE_BASE_URL = os.getenv('CVE_SERVICE_BASE_URL', 'http://140.238.227.29:5000')
    CVE_SERVICE_TIMEOUT = int(os.getenv('CVE_SERVICE_TIMEOUT', '15'))
    
    # FAISS
    FAISS_INDEX_DIR = os.getenv('FAISS_INDEX_DIR', 'data/faiss_indexes')
    CVE_FAISS_INDEX_PATH = os.getenv('CVE_FAISS_INDEX_PATH', 'data/faiss_indexes/cve_index.faiss')
    CODEBASE_FAISS_INDEX_PATH = os.getenv('CODEBASE_FAISS_INDEX_PATH', 'data/faiss_indexes/codebase_index.faiss')
    
    # Retrieval Configuration (for CVE search)
    RETRIEVAL_CONFIG = {
        "default_limit": 10,
        "max_limit": 100,
        "similarity_threshold": -10.0,  # Lowered to allow all results including L2 distance > 1.0
        "search_params": {"metric_type": "COSINE", "params": {"nprobe": 10}},
    }
    
    # Logging Configuration (for retrieval service)
    LOGGING_CONFIG = {
        "level": "INFO",
        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        "file": "logs/retrieval.log",
    }
    
    # Flask-SocketIO
    SOCKETIO_ASYNC_MODE = os.getenv('SOCKETIO_ASYNC_MODE', 'eventlet')
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.getenv('SOCKETIO_CORS_ALLOWED_ORIGINS', '*')
    SOCKETIO_ENABLE_LOGS = os.getenv('SOCKETIO_ENABLE_LOGS', 'false').lower() == 'true'
    
    # LangSmith
    LANGSMITH_TRACING = os.getenv('LANGSMITH_TRACING', 'true').lower() == 'true'
    LANGSMITH_API_KEY = os.getenv('LANGSMITH_API_KEY')
    LANGSMITH_PROJECT = os.getenv('LANGSMITH_PROJECT', 'Agent-Axios-Backend')
    LANGSMITH_ENDPOINT = os.getenv('LANGSMITH_ENDPOINT', 'https://api.smith.langchain.com')
    
    # Analysis Configuration
    MAX_WORKERS = int(os.getenv('MAX_WORKERS', '5'))
    EMBEDDING_BATCH_SIZE = int(os.getenv('EMBEDDING_BATCH_SIZE', '10'))
    PROGRESS_UPDATE_INTERVAL = int(os.getenv('PROGRESS_UPDATE_INTERVAL', '2'))
    
    # Analysis Types Configuration
    ANALYSIS_CONFIGS = {
        'SHORT': {
            'max_files': 500,
            'max_chunks_per_file': 20,
            'faiss_top_k': 30,
            'rerank_top_n': 5,
            'validation_enabled': False,
            'cve_top_k': 10,  # Top CVEs from initial search
            'cves_to_analyze': 5,  # Number of CVEs to decompose
            'queries_per_cve': 2,  # Decomposed queries per CVE
            'code_matches_per_query': 3,  # Code matches per query
            'estimated_time': '2-3 minutes',
            'description': 'Quick scan with reduced depth'
        },
        'MEDIUM': {
            'max_files': 2000,
            'max_chunks_per_file': 50,
            'faiss_top_k': 50,
            'rerank_top_n': 10,
            'validation_enabled': True,
            'cve_top_k': 20,  # Top CVEs from initial search
            'cves_to_analyze': 10,  # Number of CVEs to decompose
            'queries_per_cve': 3,  # Decomposed queries per CVE
            'code_matches_per_query': 5,  # Code matches per query
            'estimated_time': '5-10 minutes',
            'description': 'Balanced scan with GPT-4 validation'
        },
        'HARD': {
            'max_files': None,
            'max_chunks_per_file': None,
            'faiss_top_k': 100,
            'rerank_top_n': 20,
            'validation_enabled': True,
            'cve_top_k': 30,  # Top CVEs from initial search
            'cves_to_analyze': 20,  # Number of CVEs to decompose
            'queries_per_cve': 5,  # Decomposed queries per CVE
            'code_matches_per_query': 10,  # Code matches per query
            'estimated_time': '15-40 minutes',
            'description': 'Deep scan with comprehensive analysis'
        }
    }

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.getenv('FRONTEND_URL', 'http://localhost:3000')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
