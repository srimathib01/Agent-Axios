"""Chat message model for AI assistant conversations."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class ChatMessage(Base):
    """Chat message model for storing AI assistant conversations."""
    
    __tablename__ = 'chat_messages'
    
    message_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False, index=True)
    session_id = Column(String(100), nullable=False, index=True)  # Group messages by session
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    analysis_id = Column(Integer, ForeignKey('analyses.analysis_id'), nullable=True)  # Optional link to analysis
    is_streaming = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='chat_messages')
    analysis = relationship('Analysis', backref='chat_messages')
    
    def to_dict(self):
        """Convert chat message to dictionary."""
        return {
            'message_id': self.message_id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'analysis_id': self.analysis_id,
            'is_streaming': self.is_streaming,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
