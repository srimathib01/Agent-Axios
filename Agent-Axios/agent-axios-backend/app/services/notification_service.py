"""Notification service for user notifications."""
from app.models import Notification, db
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for notification operations."""
    
    @staticmethod
    def create_notification(user_id, type, title, message, severity='info', link=None, metadata=None):
        """Create a new notification.
        
        Args:
            user_id: User ID
            type: Notification type (scan_complete, scan_failed, etc.)
            title: Notification title
            message: Notification message
            severity: Severity level (info, warning, error, success)
            link: Optional link to resource
            metadata: Optional metadata dict
            
        Returns:
            Notification object or None
        """
        try:
            notification = Notification(
                user_id=user_id,
                type=type,
                title=title,
                message=message,
                severity=severity,
                link=link,
                metadata=json.dumps(metadata) if metadata else None
            )
            
            db.session.add(notification)
            db.session.commit()
            
            logger.info(f"Notification created for user {user_id}: {type}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_notifications(user_id, page=1, per_page=20, unread_only=False):
        """Get user notifications with pagination.
        
        Args:
            user_id: User ID
            page: Page number
            per_page: Items per page
            unread_only: Filter for unread only
            
        Returns:
            Dict with notifications, total, page info
        """
        try:
            query = db.session.query(Notification).filter_by(user_id=user_id)
            
            if unread_only:
                query = query.filter_by(is_read=False)
            
            query = query.order_by(Notification.created_at.desc())
            
            total = query.count()
            notifications = query.limit(per_page).offset((page - 1) * per_page).all()
            
            unread_count = db.session.query(Notification).filter_by(
                user_id=user_id,
                is_read=False
            ).count()
            
            return {
                'notifications': [n.to_dict() for n in notifications],
                'total': total,
                'unread_count': unread_count,
                'page': page,
                'per_page': per_page,
                'pages': (total + per_page - 1) // per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting notifications: {str(e)}")
            return None
    
    @staticmethod
    def mark_as_read(notification_id, user_id):
        """Mark notification as read.
        
        Args:
            notification_id: Notification ID
            user_id: User ID
            
        Returns:
            Notification or None
        """
        try:
            notification = db.session.query(Notification).filter_by(
                notification_id=notification_id,
                user_id=user_id
            ).first()
            
            if not notification:
                return None
            
            if not notification.is_read:
                notification.is_read = True
                notification.read_at = datetime.utcnow()
                db.session.commit()
                logger.info(f"Notification {notification_id} marked as read")
            
            return notification
            
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def mark_all_as_read(user_id):
        """Mark all user notifications as read.
        
        Args:
            user_id: User ID
            
        Returns:
            Number of notifications marked or None
        """
        try:
            result = db.session.query(Notification).filter_by(
                user_id=user_id,
                is_read=False
            ).update({
                'is_read': True,
                'read_at': datetime.utcnow()
            })
            
            db.session.commit()
            logger.info(f"Marked {result} notifications as read for user {user_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error marking all as read: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def delete_notification(notification_id, user_id):
        """Delete notification.
        
        Args:
            notification_id: Notification ID
            user_id: User ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            notification = db.session.query(Notification).filter_by(
                notification_id=notification_id,
                user_id=user_id
            ).first()
            
            if not notification:
                return False
            
            db.session.delete(notification)
            db.session.commit()
            
            logger.info(f"Notification {notification_id} deleted")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting notification: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def notify_scan_complete(user_id, repo_name, analysis_id, vulnerability_count):
        """Create notification for completed scan.
        
        Args:
            user_id: User ID
            repo_name: Repository name
            analysis_id: Analysis ID
            vulnerability_count: Number of vulnerabilities found
        """
        severity = 'error' if vulnerability_count > 0 else 'success'
        title = f"Scan Complete: {repo_name}"
        message = f"Found {vulnerability_count} vulnerabilities"
        
        return NotificationService.create_notification(
            user_id=user_id,
            type='scan_complete',
            title=title,
            message=message,
            severity=severity,
            link=f'/reports?analysis_id={analysis_id}',
            metadata={'analysis_id': analysis_id, 'repo_name': repo_name}
        )
    
    @staticmethod
    def notify_scan_failed(user_id, repo_name, error_message):
        """Create notification for failed scan.
        
        Args:
            user_id: User ID
            repo_name: Repository name
            error_message: Error message
        """
        return NotificationService.create_notification(
            user_id=user_id,
            type='scan_failed',
            title=f"Scan Failed: {repo_name}",
            message=error_message,
            severity='error',
            metadata={'repo_name': repo_name}
        )
