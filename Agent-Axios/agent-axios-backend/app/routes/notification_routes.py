"""Notification routes."""
from flask import Blueprint, request, jsonify
from app.services.auth_service import require_auth, get_current_user
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

notification_bp = Blueprint('notifications', __name__)


@notification_bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """Get user notifications with pagination.
    
    Query params:
    - page: Page number (default 1)
    - perPage: Items per page (default 20)
    - unreadOnly: Filter unread only (default false)
    """
    try:
        user = get_current_user()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('perPage', 20, type=int)
        unread_only = request.args.get('unreadOnly', 'false').lower() == 'true'
        
        result = NotificationService.get_notifications(
            user_id=user.user_id,
            page=page,
            per_page=per_page,
            unread_only=unread_only
        )
        
        if result is None:
            return jsonify({'error': 'Failed to get notifications'}), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        return jsonify({'error': 'Failed to get notifications'}), 500


@notification_bp.route('/<int:notification_id>/read', methods=['POST'])
@require_auth
def mark_as_read(notification_id):
    """Mark notification as read."""
    try:
        user = get_current_user()
        notification = NotificationService.mark_as_read(notification_id, user.user_id)
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        return jsonify(notification.to_dict())
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        return jsonify({'error': 'Failed to mark as read'}), 500


@notification_bp.route('/read-all', methods=['POST'])
@require_auth
def mark_all_as_read():
    """Mark all notifications as read."""
    try:
        user = get_current_user()
        count = NotificationService.mark_all_as_read(user.user_id)
        
        if count is None:
            return jsonify({'error': 'Failed to mark all as read'}), 500
        
        return jsonify({
            'message': f'{count} notifications marked as read',
            'count': count
        })
        
    except Exception as e:
        logger.error(f"Error marking all as read: {str(e)}")
        return jsonify({'error': 'Failed to mark all as read'}), 500


@notification_bp.route('/<int:notification_id>', methods=['DELETE'])
@require_auth
def delete_notification(notification_id):
    """Delete notification."""
    try:
        user = get_current_user()
        success = NotificationService.delete_notification(notification_id, user.user_id)
        
        if not success:
            return jsonify({'error': 'Notification not found'}), 404
        
        return jsonify({'message': 'Notification deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}")
        return jsonify({'error': 'Failed to delete notification'}), 500
