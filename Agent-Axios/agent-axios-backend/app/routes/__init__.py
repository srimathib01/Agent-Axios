"""Routes package initialization."""
from .api import api_bp
from .auth_routes import auth_bp
from .repository_routes import repo_bp
from .notification_routes import notification_bp
from .chat_routes import chat_bp
from .dashboard_routes import dashboard_bp
from .report_routes import report_bp
from . import socketio_events

__all__ = ['api_bp', 'auth_bp', 'repo_bp', 'notification_bp', 'chat_bp', 'dashboard_bp', 'report_bp', 'socketio_events']
