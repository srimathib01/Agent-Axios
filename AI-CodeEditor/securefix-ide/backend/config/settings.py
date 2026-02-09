"""
Configuration settings for SecureFix AI Fix Engine Backend.
"""
import os
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    # Application
    APP_NAME: str = "SecureFix AI Fix Engine"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./securefix.db"

    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-12-01-preview"
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4.1"

    # Alternative: Standard OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"

    # LLM Settings
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 2048
    LLM_STREAMING: bool = True

    # Context Extraction Settings
    CONTEXT_LINES_BEFORE: int = 15
    CONTEXT_LINES_AFTER: int = 15
    MAX_IMPORTS_TO_INCLUDE: int = 50

    # WebSocket Settings
    WS_PING_INTERVAL: int = 30
    WS_PING_TIMEOUT: int = 120

    # CORS Settings - stored as string, converted to list
    CORS_ORIGINS: str = "*"

    # Phase 1 Backend Integration (Optional - for fetching vulnerability data)
    PHASE1_BACKEND_URL: Optional[str] = "http://localhost:5000"

    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# Singleton settings instance
settings = Settings()


# Fix Generation Configuration
FIX_GENERATION_CONFIG = {
    "max_retries": 3,
    "retry_delay_seconds": 1,
    "timeout_seconds": 120,
    "max_fix_length": 10000,
}

# Supported Languages
SUPPORTED_LANGUAGES = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".c": "c",
    ".rs": "rust",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
}
