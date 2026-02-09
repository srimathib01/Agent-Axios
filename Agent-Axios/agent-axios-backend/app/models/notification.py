"""Notification model for user notifications."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Notification(Base):
    """Notification model for storing user notifications."""
    
    __tablename__ = 'notifications'
    
    notification_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # scan_complete, scan_failed, vulnerability_found, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, default='info')  # info, warning, error, success
    is_read = Column(Boolean, nullable=False, default=False)
    link = Column(String(500), nullable=True)  # Link to related resource
    notification_metadata = Column(Text, nullable=True)  # JSON string for additional data (renamed to avoid SQLAlchemy reserved name)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship('User', back_populates='notifications')
    
    def to_dict(self):
        """Convert notification to dictionary."""
        return {
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'severity': self.severity,
            'is_read': self.is_read,
            'link': self.link,
            'notification_metadata': self.notification_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
        }
