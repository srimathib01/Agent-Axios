"""FixSuggestion model for storing AI-generated security fixes."""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class FixSuggestion(Base):
    """
    AI-generated fix suggestion for a detected vulnerability.

    Stores the complete fix including search/replace blocks for
    precise code application using Void's DiffZone pattern.
    """

    __tablename__ = "fix_suggestions"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Vulnerability reference (from Phase 1 or frontend)
    vulnerability_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    cwe_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Fix content
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    search_blocks: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    replace_blocks: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)

    # Code context used for generation
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    original_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    framework: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Status tracking
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    # Status values: pending, streaming, completed, applied, rejected, failed

    # LLM metadata
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    generation_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "vulnerability_id": self.vulnerability_id,
            "cwe_id": self.cwe_id,
            "severity": self.severity,
            "raw_content": self.raw_content,
            "search_blocks": self.search_blocks or [],
            "replace_blocks": self.replace_blocks or [],
            "file_path": self.file_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "original_code": self.original_code,
            "language": self.language,
            "framework": self.framework,
            "status": self.status,
            "model_used": self.model_used,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "generation_time_ms": self.generation_time_ms,
            "confidence_score": self.confidence_score,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
        }

    def set_streaming(self):
        """Mark as currently streaming."""
        self.status = "streaming"

    def set_completed(
        self,
        raw_content: str,
        search_blocks: List[str],
        replace_blocks: List[str],
        generation_time_ms: int = None,
        prompt_tokens: int = None,
        completion_tokens: int = None,
    ):
        """Mark as successfully completed."""
        self.status = "completed"
        self.raw_content = raw_content
        self.search_blocks = search_blocks
        self.replace_blocks = replace_blocks
        self.completed_at = datetime.utcnow()
        self.generation_time_ms = generation_time_ms
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens

    def set_applied(self):
        """Mark as applied to the codebase."""
        self.status = "applied"
        self.applied_at = datetime.utcnow()

    def set_rejected(self):
        """Mark as rejected by user."""
        self.status = "rejected"

    def set_failed(self, error_message: str):
        """Mark as failed with error."""
        self.status = "failed"
        self.error_message = error_message
        self.completed_at = datetime.utcnow()


class ChatSession(Base):
    """Chat session for vulnerability explanations and discussions."""

    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    # Context
    vulnerability_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Session state
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "vulnerability_id": self.vulnerability_id,
            "file_path": self.file_path,
            "message_count": self.message_count,
            "total_tokens": self.total_tokens,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
        }


class ChatMessage(Base):
    """Individual chat message in a session."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Message content
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Token tracking
    tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "tokens": self.tokens,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
