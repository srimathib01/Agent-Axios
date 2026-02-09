"""Main application entry point."""
import os
import sys
import logging
from app import create_app, socketio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """Run the Flask-SocketIO application."""
    app = create_app()
    
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Agent Axios Backend on {host}:{port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"LangSmith tracking: {'enabled' if os.getenv('LANGCHAIN_TRACING_V2') else 'disabled'}")
    
    # Run with SocketIO
    socketio.run(
        app,
        host=host,
        port=port,
        debug=debug,
        use_reloader=debug,
        log_output=True
    )

if __name__ == '__main__':
    main()
