import logging
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.db.models import BiometricTask
from app.db.session import get_session_factory

logger = logging.getLogger(__name__)

def create_biometric_task_record(celery_task_id: str, student_id: str, task_type: str = "enrollment_processing") -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            # Check for existing to make it idempotent
            existing = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == celery_task_id))
            if existing:
                return

            task = BiometricTask(
                celery_task_id=celery_task_id,
                student_id=student_id,
                task_type=task_type,
                status="queued"
            )
            db.add(task)
            db.commit()
            logger.info("[biometric-task] created student_id=%s task_id=%s status=queued", student_id, celery_task_id)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("[biometric-task] failed to create record for task_id=%s: %s", celery_task_id, str(exc))

def mark_task_processing(celery_task_id: str, worker_hostname: str) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == celery_task_id).with_for_update())
            if task:
                task.status = "processing"
                task.started_at = datetime.now(timezone.utc)
                task.worker_hostname = worker_hostname
                db.commit()
                logger.info("[biometric-task] processing student_id=%s task_id=%s status=processing", task.student_id, celery_task_id)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("[biometric-task] failed to mark processing for task_id=%s: %s", celery_task_id, str(exc))

def mark_task_completed(celery_task_id: str, processing_duration_ms: int | None = None) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == celery_task_id).with_for_update())
            if task:
                task.status = "success"
                task.completed_at = datetime.now(timezone.utc)
                if processing_duration_ms is not None:
                    task.processing_duration_ms = processing_duration_ms
                db.commit()
                logger.info("[biometric-task] success student_id=%s task_id=%s status=success duration=%s", task.student_id, celery_task_id, processing_duration_ms)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("[biometric-task] failed to mark completed for task_id=%s: %s", celery_task_id, str(exc))

def mark_task_failed(celery_task_id: str, error_message: str, processing_duration_ms: int | None = None) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == celery_task_id).with_for_update())
            if task:
                task.status = "failed"
                task.failed_at = datetime.now(timezone.utc)
                task.error_message = error_message
                if processing_duration_ms is not None:
                    task.processing_duration_ms = processing_duration_ms
                db.commit()
                logger.info("[biometric-task] failed student_id=%s task_id=%s status=failed duration=%s error=%s", task.student_id, celery_task_id, processing_duration_ms, error_message)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("[biometric-task] failed to mark failed for task_id=%s: %s", celery_task_id, str(exc))

def increment_retry_count(celery_task_id: str) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == celery_task_id).with_for_update())
            if task:
                task.status = "retrying"
                task.retry_count += 1
                db.commit()
                logger.info("[biometric-task] retrying student_id=%s task_id=%s retry_count=%s", task.student_id, celery_task_id, task.retry_count)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("[biometric-task] failed to increment retry for task_id=%s: %s", celery_task_id, str(exc))
