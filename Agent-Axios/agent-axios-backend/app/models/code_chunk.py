"""CodeChunk model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class CodeChunk(Base):
    """Code chunk model for storing parsed code segments."""
    
    __tablename__ = 'code_chunks'
    
    chunk_id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey('analyses.analysis_id', ondelete='CASCADE'), nullable=False)
    file_path = Column(String(500), nullable=False)
    chunk_text = Column(Text, nullable=False)
    line_start = Column(Integer, nullable=False)
    line_end = Column(Integer, nullable=False)
    embedding_id = Column(Integer, nullable=True)  # FAISS vector ID
    language = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    analysis = relationship('Analysis', back_populates='code_chunks')
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'chunk_id': self.chunk_id,
            'analysis_id': self.analysis_id,
            'file_path': self.file_path,
            'chunk_text': self.chunk_text,
            'line_start': self.line_start,
            'line_end': self.line_end,
            'embedding_id': self.embedding_id,
            'language': self.language,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
