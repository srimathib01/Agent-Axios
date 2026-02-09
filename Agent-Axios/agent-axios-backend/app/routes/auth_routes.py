"""Authentication routes."""
from flask import Blueprint, request, jsonify
from app.services.auth_service import AuthService, require_auth, get_current_user
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user.
    
    Expected JSON:
    {
        "email": "user@example.com",
        "password": "password123",
        "firstName": "John",
        "lastName": "Doe",
        "company": "Optional Company"
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        first_name = data['firstName'].strip()
        last_name = data['lastName'].strip()
        company = data.get('company', '').strip() or None
        
        # Validate password length
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        # Register user
        user, result = AuthService.register_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            company=company
        )
        
        if not user:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'access_token': result,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user.
    
    Expected JSON:
    {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    try:
        data = request.json
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Login user
        user, result = AuthService.login_user(email, password)
        
        if not user:
            return jsonify({'error': result}), 401
        
        return jsonify({
            'access_token': result,
            'user': user.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Logout user (revoke token)."""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            AuthService.revoke_token(token)
        
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'message': 'Logged out successfully'})  # Always succeed


@auth_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get current user profile."""
    try:
        user = get_current_user()
        return jsonify(user.to_dict())
    except Exception as e:
        logger.error(f"Error getting profile: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    """Update user profile.
    
    Expected JSON:
    {
        "firstName": "John",
        "lastName": "Doe",
        "company": "Company Name"
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Map frontend field names to backend
        update_data = {}
        if 'firstName' in data:
            update_data['first_name'] = data['firstName']
        if 'lastName' in data:
            update_data['last_name'] = data['lastName']
        if 'company' in data:
            update_data['company'] = data['company']
        if 'avatarUrl' in data:
            update_data['avatar_url'] = data['avatarUrl']
        
        updated_user = AuthService.update_user_profile(user.user_id, **update_data)
        
        if not updated_user:
            return jsonify({'error': 'Failed to update profile'}), 500
        
        return jsonify(updated_user.to_dict())
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    """Change user password.
    
    Expected JSON:
    {
        "currentPassword": "old_password",
        "newPassword": "new_password"
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data or 'currentPassword' not in data or 'newPassword' not in data:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        current_password = data['currentPassword']
        new_password = data['newPassword']
        
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        result = AuthService.change_password(user.user_id, current_password, new_password)
        
        if result is not True:
            return jsonify({'error': result}), 400
        
        return jsonify({'message': 'Password changed successfully'})
        
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def request_password_reset():
    """Request password reset.
    
    Expected JSON:
    {
        "email": "user@example.com"
    }
    """
    try:
        data = request.json
        
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].strip().lower()
        
        token = AuthService.request_password_reset(email)
        
        # Always return success to prevent email enumeration
        # In production, send email with reset link
        logger.info(f"Password reset token (dev mode): {token}")
        
        return jsonify({
            'message': 'If email exists, reset instructions will be sent',
            'token': token  # Only include in dev mode
        })
        
    except Exception as e:
        logger.error(f"Error requesting password reset: {str(e)}")
        return jsonify({'error': 'Failed to process request'}), 500


@auth_bp.route('/reset-password/confirm', methods=['POST'])
def confirm_password_reset():
    """Confirm password reset with token.
    
    Expected JSON:
    {
        "token": "reset_token",
        "newPassword": "new_password"
    }
    """
    try:
        data = request.json
        
        if not data or 'token' not in data or 'newPassword' not in data:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        token = data['token']
        new_password = data['newPassword']
        
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        result = AuthService.reset_password(token, new_password)
        
        if result is not True:
            return jsonify({'error': result}), 400
        
        return jsonify({'message': 'Password reset successfully'})
        
    except Exception as e:
        logger.error(f"Error confirming password reset: {str(e)}")
        return jsonify({'error': 'Failed to reset password'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@require_auth
def refresh_token():
    """Refresh authentication token."""
    try:
        user = get_current_user()
        new_token = AuthService.generate_token(user.user_id)
        
        return jsonify({'access_token': new_token})
        
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        return jsonify({'error': 'Failed to refresh token'}), 500
