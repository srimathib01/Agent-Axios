"""Analysis model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Analysis(Base):
    """Analysis model for tracking vulnerability scans."""
    
    __tablename__ = 'analyses'
    
    analysis_id = Column(Integer, primary_key=True, autoincrement=True)
    repo_url = Column(String(500), nullable=False)
    repo_id = Column(Integer, ForeignKey('repositories.repo_id'), nullable=True, index=True)
    analysis_type = Column(String(20), nullable=False)  # SHORT, MEDIUM, HARD
    status = Column(String(20), default='pending')  # pending, running, completed, failed
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    config_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    total_files = Column(Integer, default=0)
    total_chunks = Column(Integer, default=0)
    total_findings = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    repository = relationship('Repository', back_populates='analyses')
    code_chunks = relationship('CodeChunk', back_populates='analysis', cascade='all, delete-orphan')
    cve_findings = relationship('CVEFinding', back_populates='analysis', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'analysis_id': self.analysis_id,
            'repo_url': self.repo_url,
            'repo_id': self.repo_id,
            'analysis_type': self.analysis_type,
            'status': self.status,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'config': self.config_json,
            'error_message': self.error_message,
            'total_files': self.total_files,
            'total_chunks': self.total_chunks,
            'total_findings': self.total_findings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
