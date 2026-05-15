import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.db.models import BiometricTask
from app.db.session import get_session_factory
from app.core.task_db import mark_task_failed
from app.core.enrollment_db import record_processing_completed_in_db

logger = logging.getLogger(__name__)

def recover_zombie_tasks(timeout_minutes: int = 15) -> int:
    """Find and recover tasks that have been processing for too long."""
    session_factory = get_session_factory()
    recovered_count = 0
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)

    with session_factory() as db:
        try:
            # Find tasks stuck in "processing" older than timeout
            zombie_tasks = db.scalars(
                select(BiometricTask)
                .where(
                    BiometricTask.status == "processing",
                    BiometricTask.started_at < cutoff_time
                )
            ).all()

            for task in zombie_tasks:
                student_id = task.student_id
                task_id = task.celery_task_id
                duration_ms = None
                if task.started_at:
                    started_at = task.started_at
                    if started_at.tzinfo is None:
                        started_at = started_at.replace(tzinfo=timezone.utc)
                    duration_ms = int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000)

                logger.warning(                    "[zombie-task-recovery] recovering task_id=%s student_id=%s stale_duration_ms=%s action=mark_failed",
                    task_id, student_id, duration_ms
                )
                
                # 1. Mark task as failed
                mark_task_failed(
                    celery_task_id=task_id,
                    error_message=f"Zombie task recovered after {timeout_minutes} minutes timeout",
                    processing_duration_ms=duration_ms
                )
                
                # 2. Mark enrollment processing as failed (idempotent, safe)
                record_processing_completed_in_db(
                    student_id=student_id,
                    processed_images_count=0,
                    processing_passed=False
                )
                
                recovered_count += 1

        except SQLAlchemyError as exc:
            logger.error("[zombie-task-recovery] db error: %s", str(exc))

    return recovered_count
