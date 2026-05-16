from typing import Any
from sqlalchemy import BigInteger, Column, Integer, String, Text, DateTime
from app.db.base import Base
from app.db.models.mixins import TimestampMixin

class BiometricTask(Base, TimestampMixin):
    __tablename__ = "biometric_tasks"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    request_id = Column(String(128), index=True, nullable=True)
    correlation_id = Column(String(128), index=True, nullable=True)
    celery_task_id = Column(String(255), unique=True, index=True, nullable=False)
    student_id = Column(String(255), index=True, nullable=False)
    task_type = Column(String(255), nullable=False)
    status = Column(String(50), index=True, nullable=False, default="queued")
    retry_count = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    worker_hostname = Column(String(255), nullable=True)
    processing_duration_ms = Column(BigInteger, nullable=True)
