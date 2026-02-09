"""
SecureFix AI Fix Engine - FastAPI Main Application

Phase 2.3: AI-powered security fix generation with streaming support.

Features:
- WebSocket streaming for real-time fix generation (Cursor-style)
- Security-focused prompts with CWE/OWASP context
- Search/replace block output for precise code application
- Chat interface for vulnerability explanations
- Quick actions for common security queries
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add the backend directory to path for imports
sys.path.insert(0, str(__file__).rsplit("\\", 1)[0])
sys.path.insert(0, str(__file__).rsplit("/", 1)[0])

from config.settings import settings
from app.models import init_db
from app.routes import fix_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting SecureFix AI Fix Engine...")
    await init_db()
    logger.info("Database initialized")

    # Check LLM configuration
    if settings.AZURE_OPENAI_API_KEY:
        logger.info(f"Azure OpenAI configured: {settings.AZURE_OPENAI_DEPLOYMENT}")
    elif settings.OPENAI_API_KEY:
        logger.info(f"OpenAI configured: {settings.OPENAI_MODEL}")
    else:
        logger.warning("No LLM API key configured - fix generation will not work!")

    yield

    # Shutdown
    logger.info("Shutting down SecureFix AI Fix Engine...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
    SecureFix AI Fix Engine - Phase 2.3 Implementation

    ## Features
    - **Streaming Fix Generation**: Real-time AI-powered security fixes via WebSocket
    - **Security-Focused Prompts**: CWE-aware, OWASP-guided fix suggestions
    - **Search/Replace Blocks**: Precise code changes for DiffZone visualization
    - **Chat Interface**: Interactive vulnerability explanations
    - **Quick Actions**: One-click security analysis (explain, OWASP guidance, alternatives)

    ## WebSocket Endpoints
    - `/api/fix/ws/fix` - Streaming fix generation
    - `/api/fix/ws/chat` - Interactive chat

    ## REST Endpoints
    - `POST /api/fix/generate` - Generate fix (non-streaming)
    - `GET /api/fix/history` - Get fix history
    - `POST /api/fix/quick-action` - Execute quick action
    """,
    version="2.3.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(fix_router)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "2.3.0",
        "llm_configured": bool(settings.AZURE_OPENAI_API_KEY or settings.OPENAI_API_KEY)
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": settings.APP_NAME,
        "version": "2.3.0",
        "description": "AI-powered security fix generation engine",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "fix_websocket": "/api/fix/ws/fix",
            "chat_websocket": "/api/fix/ws/chat",
            "generate_fix": "POST /api/fix/generate",
            "fix_history": "GET /api/fix/history",
            "quick_action": "POST /api/fix/quick-action"
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )
