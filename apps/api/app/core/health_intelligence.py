"""System Health Intelligence and Diagnostics."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
import redis

from app.core.celery_app import celery_app
from app.core.config import settings
from app.db.models import (
    BiometricTask,
    RecognitionAuditLog,
    SystemHealthSnapshot,
)

logger = logging.getLogger(__name__)


def check_redis_health() -> bool:
    """Ping Redis to check connectivity."""
    try:
        r = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        return r.ping()
    except Exception as exc:
        logger.error("Redis health check failed: %s", exc)
        return False


def get_active_workers() -> int:
    """Get count of active Celery workers."""
    try:
        i = celery_app.control.inspect(timeout=2.0)
        pings = i.ping()
        return len(pings) if pings else 0
    except Exception as exc:
        logger.error("Failed to inspect active workers: %s", exc)
        return 0


def gather_system_diagnostics(db: Session) -> dict[str, Any]:
    """Gather metrics from DB and Redis to evaluate system health."""
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    
    # DB Connectivity check
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("DB health check failed: %s", exc)
        db_healthy = False

    redis_healthy = check_redis_health()
    active_workers = get_active_workers() if redis_healthy else 0
    
    # BiometricTask metrics (last 1 hour)
    queue_depth = db.scalar(
        select(func.count(BiometricTask.id)).where(BiometricTask.status == "queued")
    ) or 0
    
    stuck_tasks = db.scalar(
        select(func.count(BiometricTask.id))
        .where(BiometricTask.status == "processing")
        .where(BiometricTask.started_at < now - timedelta(minutes=15))
    ) or 0
    
    # Recent tasks
    recent_tasks_query = select(BiometricTask).where(BiometricTask.created_at >= one_hour_ago)
    recent_tasks = db.scalars(recent_tasks_query).all()
    
    total_recent_tasks = len(recent_tasks)
    recent_failed_tasks = sum(1 for t in recent_tasks if t.status == "failed")
    recent_retries = sum(t.retry_count for t in recent_tasks)
    
    recent_durations = [t.processing_duration_ms for t in recent_tasks if t.processing_duration_ms is not None]
    avg_processing_duration = sum(recent_durations) / len(recent_durations) if recent_durations else None
    
    retry_rate = recent_retries / total_recent_tasks if total_recent_tasks > 0 else 0.0
    failed_task_rate = recent_failed_tasks / total_recent_tasks if total_recent_tasks > 0 else 0.0
    
    # Recognition metrics (last 1 hour)
    recent_recognitions = db.scalars(
        select(RecognitionAuditLog).where(RecognitionAuditLog.created_at >= one_hour_ago)
    ).all()
    
    total_recognitions = len(recent_recognitions)
    rec_durations = [r.processing_duration_ms for r in recent_recognitions if r.processing_duration_ms is not None]
    avg_recognition_duration = sum(rec_durations) / len(rec_durations) if rec_durations else None
    
    # Health Evaluation
    overall_status = "healthy"
    critical_events = []
    degraded_components = []
    
    if not redis_healthy:
        overall_status = "critical"
        critical_events.append("Redis connectivity failed.")
        degraded_components.append("redis")
        
    if not db_healthy:
        overall_status = "critical"
        critical_events.append("Database connectivity failed or slow.")
        degraded_components.append("postgres")
        
    if active_workers == 0 and redis_healthy and total_recent_tasks > 0:
        overall_status = "critical"
        critical_events.append("No active workers detected while tasks exist.")
        degraded_components.append("celery_workers")
        
    if queue_depth > 50:
        if overall_status != "critical":
            overall_status = "degraded"
        critical_events.append(f"Queue backlog high: {queue_depth} tasks.")
        degraded_components.append("queue")
        
    if stuck_tasks > 0:
        if overall_status != "critical":
            overall_status = "degraded"
        critical_events.append(f"{stuck_tasks} processing tasks appear stuck (>15m).")
        degraded_components.append("processing")
        
    if retry_rate > 1.0:
        if overall_status != "critical":
            overall_status = "degraded"
        critical_events.append(f"High task retry rate: {retry_rate:.2f}")
        degraded_components.append("tasks")
        
    if failed_task_rate > 0.1:
        if overall_status != "critical":
            overall_status = "degraded"
        critical_events.append(f"High failed task rate: {failed_task_rate:.2%}")
        degraded_components.append("tasks")
        
    diagnostics = {
        "overall_status": overall_status,
        "queue_depth": queue_depth,
        "active_workers": active_workers,
        "retry_rate": retry_rate,
        "failed_task_rate": failed_task_rate,
        "avg_processing_duration": avg_processing_duration,
        "avg_recognition_duration": avg_recognition_duration,
        "critical_events": critical_events,
        "degraded_components": list(set(degraded_components)),
        "stuck_tasks": stuck_tasks,
        "total_recent_tasks": total_recent_tasks,
        "total_recent_recognitions": total_recognitions,
    }
    
    logger.info(
        "[system-health] health_state=%s degraded_component=%s queue_depth=%s retry_rate=%.2f worker_count=%s",
        overall_status,
        ",".join(degraded_components) or "none",
        queue_depth,
        retry_rate,
        active_workers,
    )
    
    return diagnostics


def run_and_persist_health_check(db: Session) -> SystemHealthSnapshot:
    """Run diagnostics and persist the snapshot."""
    diagnostics = gather_system_diagnostics(db)
    
    snapshot = SystemHealthSnapshot(
        overall_status=diagnostics["overall_status"],
        queue_depth=diagnostics["queue_depth"],
        active_workers=diagnostics["active_workers"],
        retry_rate=diagnostics["retry_rate"],
        failed_task_rate=diagnostics["failed_task_rate"],
        avg_processing_duration=diagnostics["avg_processing_duration"],
        avg_recognition_duration=diagnostics["avg_recognition_duration"],
        critical_events_json={"events": diagnostics["critical_events"], "degraded": diagnostics["degraded_components"]},
    )
    db.add(snapshot)
    db.commit()
    
    return snapshot
