"""Recognition audit logs table model."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

JSONVariant = JSON().with_variant(JSONB, "postgresql")

class RecognitionAuditLog(Base):
    __tablename__ = "recognition_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    searched_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    searched_student_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    top_match_student_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cosine_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    threshold_used: Mapped[float | None] = mapped_column(Float, nullable=True)
    accepted_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    
    top_k_results_json: Mapped[dict[str, Any]] = mapped_column(JSONVariant, nullable=False, server_default="{}")
    image_metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONVariant, nullable=False, server_default="{}")
    
    processing_duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    recognition_model_version: Mapped[str] = mapped_column(String(64), nullable=False, server_default="v1")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
