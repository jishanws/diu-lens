from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Column, DateTime, Integer, String, Text, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

JSONVariant = JSON().with_variant(JSONB, "postgresql")

class IncidentSnapshot(Base):
    __tablename__ = "incident_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    correlation_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    student_id: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    
    traceback_summary: Mapped[str] = mapped_column(Text, nullable=False)
    processing_context: Mapped[dict[str, Any]] = mapped_column(JSONVariant, nullable=False, server_default="{}")
    request_metadata: Mapped[dict[str, Any]] = mapped_column(JSONVariant, nullable=False, server_default="{}")
    task_metadata: Mapped[dict[str, Any]] = mapped_column(JSONVariant, nullable=False, server_default="{}")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
