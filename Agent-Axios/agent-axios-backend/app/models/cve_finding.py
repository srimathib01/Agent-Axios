"""CVEFinding model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class CVEFinding(Base):
    """CVE finding model for storing detected vulnerabilities."""
    
    __tablename__ = 'cve_findings'
    
    finding_id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey('analyses.analysis_id', ondelete='CASCADE'), nullable=False)
    cve_id = Column(String(50), nullable=False)
    file_path = Column(String(500), nullable=False)
    chunk_id = Column(Integer, ForeignKey('code_chunks.chunk_id', ondelete='SET NULL'), nullable=True)
    severity = Column(String(20), nullable=True)  # critical, high, medium, low
    confidence_score = Column(Float, nullable=False)  # 0.0 - 1.0
    validation_status = Column(String(20), default='pending')  # pending, confirmed, false_positive, needs_review
    validation_explanation = Column(Text, nullable=True)
    cve_description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    analysis = relationship('Analysis', back_populates='cve_findings')
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'finding_id': self.finding_id,
            'analysis_id': self.analysis_id,
            'cve_id': self.cve_id,
            'file_path': self.file_path,
            'chunk_id': self.chunk_id,
            'severity': self.severity,
            'confidence_score': self.confidence_score,
            'validation_status': self.validation_status,
            'validation_explanation': self.validation_explanation,
            'cve_description': self.cve_description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
