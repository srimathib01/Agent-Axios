"""Repository model for tracking analyzed repositories."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Repository(Base):
    """Repository model for storing repository information."""
    
    __tablename__ = 'repositories'
    
    repo_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(100), nullable=True)
    framework = Column(String(100), nullable=True)
    stars = Column(Integer, nullable=False, default=0)
    is_starred = Column(Boolean, nullable=False, default=False)
    last_scan_at = Column(DateTime, nullable=True)
    last_scan_status = Column(String(50), nullable=True)  # pending, in_progress, completed, failed
    total_scans = Column(Integer, nullable=False, default=0)
    vulnerability_count = Column(Integer, nullable=False, default=0)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    medium_count = Column(Integer, nullable=False, default=0)
    low_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Additional metadata (renamed from 'metadata' to avoid SQLAlchemy reserved name)
    repo_metadata = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship('User', back_populates='repositories')
    analyses = relationship('Analysis', back_populates='repository', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert repository to dictionary."""
        return {
            'repo_id': self.repo_id,
            'user_id': self.user_id,
            'name': self.name,
            'url': self.url,
            'description': self.description,
            'language': self.language,
            'framework': self.framework,
            'stars': self.stars,
            'is_starred': self.is_starred,
            'last_scan_at': self.last_scan_at.isoformat() if self.last_scan_at else None,
            'last_scan_status': self.last_scan_status,
            'total_scans': self.total_scans,
            'vulnerability_count': self.vulnerability_count,
            'critical_count': self.critical_count,
            'high_count': self.high_count,
            'medium_count': self.medium_count,
            'low_count': self.low_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'repo_metadata': self.repo_metadata,
        }
