"""Authentication service for user management."""
import secrets
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from app.models import User, db
import logging

logger = logging.getLogger(__name__)

# Simple token storage (in production, use Redis or database)
_active_tokens = {}

class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def generate_token(user_id, expires_in=24):
        """Generate simple token for user.
        
        Args:
            user_id: User ID
            expires_in: Hours until token expires (default 24)
            
        Returns:
            Token string
        """
        try:
            # Generate a secure random token
            token = secrets.token_urlsafe(32)
            
            # Store token with expiration
            expires_at = datetime.utcnow() + timedelta(hours=expires_in)
            _active_tokens[token] = {
                'user_id': user_id,
                'expires_at': expires_at
            }
            
            logger.info(f"Generated token for user {user_id}")
            return token
        except Exception as e:
            logger.error(f"Error generating token: {str(e)}")
            raise
    
    @staticmethod
    def decode_token(token):
        """Validate and decode token.
        
        Args:
            token: Token string
            
        Returns:
            Decoded payload dict or None if invalid
        """
        try:
            token_data = _active_tokens.get(token)
            if not token_data:
                logger.warning("Token not found")
                return None
            
            # Check if expired
            if datetime.utcnow() > token_data['expires_at']:
                logger.warning("Token has expired")
                # Clean up expired token
                _active_tokens.pop(token, None)
                return None
            
            return {'user_id': token_data['user_id']}
        except Exception as e:
            logger.warning(f"Error decoding token: {str(e)}")
            return None
    
    @staticmethod
    def revoke_token(token):
        """Revoke a token (logout).
        
        Args:
            token: Token to revoke
        """
        try:
            if token in _active_tokens:
                _active_tokens.pop(token)
                logger.info("Token revoked")
        except Exception as e:
            logger.error(f"Error revoking token: {str(e)}")
    
    @staticmethod
    def register_user(email, password, first_name, last_name, company=None):
        """Register a new user.
        
        Args:
            email: User email
            password: User password
            first_name: User first name
            last_name: User last name
            company: Optional company name
            
        Returns:
            Tuple of (user, token) or (None, error_message)
        """
        try:
            # Check if user already exists
            existing_user = db.session.query(User).filter_by(email=email).first()
            if existing_user:
                return None, "Email already registered"
            
            # Create new user
            user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                company=company
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            # Generate token
            token = AuthService.generate_token(user.user_id)
            
            logger.info(f"User registered: {email}")
            return user, token
            
        except Exception as e:
            logger.error(f"Error registering user: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def login_user(email, password):
        """Login user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Tuple of (user, token) or (None, error_message)
        """
        try:
            # Find user
            user = db.session.query(User).filter_by(email=email).first()
            
            if not user:
                return None, "Invalid email or password"
            
            if not user.is_active:
                return None, "Account is deactivated"
            
            # Check password
            if not user.check_password(password):
                return None, "Invalid email or password"
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Generate token
            token = AuthService.generate_token(user.user_id)
            
            logger.info(f"User logged in: {email}")
            return user, token
            
        except Exception as e:
            logger.error(f"Error logging in user: {str(e)}")
            return None, str(e)
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User object or None
        """
        try:
            return db.session.query(User).filter_by(user_id=user_id).first()
        except Exception as e:
            logger.error(f"Error getting user: {str(e)}")
            return None
    
    @staticmethod
    def update_user_profile(user_id, **kwargs):
        """Update user profile.
        
        Args:
            user_id: User ID
            **kwargs: Fields to update (first_name, last_name, company, avatar_url)
            
        Returns:
            Updated user or None
        """
        try:
            user = db.session.query(User).filter_by(user_id=user_id).first()
            if not user:
                return None
            
            allowed_fields = ['first_name', 'last_name', 'company', 'avatar_url']
            for field, value in kwargs.items():
                if field in allowed_fields and value is not None:
                    setattr(user, field, value)
            
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"User profile updated: {user.email}")
            return user
            
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def change_password(user_id, old_password, new_password):
        """Change user password.
        
        Args:
            user_id: User ID
            old_password: Current password
            new_password: New password
            
        Returns:
            True if successful, error message otherwise
        """
        try:
            user = db.session.query(User).filter_by(user_id=user_id).first()
            if not user:
                return "User not found"
            
            if not user.check_password(old_password):
                return "Invalid current password"
            
            user.set_password(new_password)
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Password changed for user: {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Error changing password: {str(e)}")
            db.session.rollback()
            return str(e)
    
    @staticmethod
    def request_password_reset(email):
        """Request password reset token.
        
        Args:
            email: User email
            
        Returns:
            Reset token or None
        """
        try:
            user = db.session.query(User).filter_by(email=email).first()
            if not user:
                # Don't reveal if email exists
                return None
            
            token = user.generate_reset_token()
            db.session.commit()
            
            logger.info(f"Password reset requested for: {email}")
            return token
            
        except Exception as e:
            logger.error(f"Error requesting password reset: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def reset_password(token, new_password):
        """Reset password with token.
        
        Args:
            token: Reset token
            new_password: New password
            
        Returns:
            True if successful, error message otherwise
        """
        try:
            user = db.session.query(User).filter_by(reset_token=token).first()
            if not user:
                return "Invalid or expired reset token"
            
            if not user.verify_reset_token(token):
                return "Invalid or expired reset token"
            
            user.set_password(new_password)
            user.clear_reset_token()
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Password reset for user: {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}")
            db.session.rollback()
            return str(e)


def require_auth(f):
    """Decorator to require authentication for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Decode token
        payload = AuthService.decode_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get user
        user = AuthService.get_user_by_id(payload['user_id'])
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # Add user to request context
        request.current_user = user
        
        return f(*args, **kwargs)
    
    return decorated_function


def get_current_user():
    """Get current authenticated user from request context."""
    return getattr(request, 'current_user', None)
