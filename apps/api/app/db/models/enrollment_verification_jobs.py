"""Asynchronous enrollment verification job model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin


class EnrollmentVerificationJob(TimestampMixin, Base):
    __tablename__ = "enrollment_verification_jobs"
    __table_args__ = (
        UniqueConstraint("student_id", "idempotency_key_hash", name="uq_verification_student_idempotency"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    verification_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.student_id", ondelete="CASCADE"), index=True, nullable=False
    )
    idempotency_key_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    owner_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="queued")
    stage: Mapped[str] = mapped_column(String(32), nullable=False, default="uploading")
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    temporary_images_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    failed_angles_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    stage_durations_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    upload_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    queued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validation_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    embedding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    database_committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
