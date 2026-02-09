"""CVEDataset model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from .base import Base

class CVEDataset(Base):
    """CVE dataset model for storing CVE information."""
    
    __tablename__ = 'cve_dataset'
    
    cve_id = Column(String(50), primary_key=True)
    cve_json = Column(Text, nullable=False)  # Full CVE details as JSON
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=True)
    cvss_score = Column(Float, nullable=True)
    embedding_id = Column(Integer, nullable=True)  # FAISS vector ID
    last_updated = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'cve_id': self.cve_id,
            'description': self.description,
            'severity': self.severity,
            'cvss_score': self.cvss_score,
            'embedding_id': self.embedding_id,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
