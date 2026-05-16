from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime, Float, Integer, String, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

JSONVariant = JSON().with_variant(JSONB, "postgresql")

class SystemHealthSnapshot(Base):
    __tablename__ = "system_health_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    overall_status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    queue_depth: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_workers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    retry_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    failed_task_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_processing_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_recognition_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    critical_events_json: Mapped[dict[str, Any]] = mapped_column(JSONVariant, nullable=False, server_default="{}")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
