"""Incident timeline reconstruction and failure snapshotting."""

import logging
import traceback
from typing import Any
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.core.tracing import (
    request_id_ctx,
    correlation_id_ctx,
    task_id_ctx,
    student_id_ctx,
    worker_hostname_ctx,
    processing_state_ctx,
)
from app.db.models import (
    AuditLog,
    BiometricTask,
    IncidentSnapshot,
    RecognitionAuditLog,
)

logger = logging.getLogger(__name__)


def snapshot_failure(db: Session, exc: Exception, additional_metadata: dict[str, Any] | None = None) -> IncidentSnapshot | None:
    """Persist a critical failure snapshot with traceback and tracing context."""
    try:
        req_id = request_id_ctx.get()
        corr_id = correlation_id_ctx.get()
        t_id = task_id_ctx.get()
        s_id = student_id_ctx.get()
        
        processing_context = {
            "worker_hostname": worker_hostname_ctx.get(),
            "processing_state": processing_state_ctx.get(),
        }
        
        request_metadata = {"error_type": type(exc).__name__, "message": str(exc)}
        if additional_metadata:
            request_metadata.update(additional_metadata)
            
        traceback_summary = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        
        snapshot = IncidentSnapshot(
            request_id=req_id,
            correlation_id=corr_id,
            task_id=t_id,
            student_id=s_id,
            traceback_summary=traceback_summary,
            processing_context=processing_context,
            request_metadata=request_metadata,
            task_metadata={},
        )
        db.add(snapshot)
        db.commit()
        return snapshot
    except Exception as inner_exc:
        logger.exception("Failed to snapshot failure: %s", inner_exc)
        return None


def reconstruct_incident_timeline(db: Session, request_id: str) -> dict[str, Any]:
    """Reconstruct the lifecycle of a request across all related tables."""
    # Since a single correlation_id can span multiple request_ids (e.g. retries),
    # we first find the correlation_id. If none exists, we assume request_id is the correlation scope.
    
    # 1. Find relevant biometric tasks
    tasks = db.scalars(
        select(BiometricTask)
        .where(
            (BiometricTask.request_id == request_id) | 
            (BiometricTask.correlation_id == request_id)
        )
        .order_by(BiometricTask.created_at)
    ).all()
    
    # Collect all correlation_ids from tasks to expand search if needed
    correlation_ids = {request_id}
    for t in tasks:
        if t.correlation_id:
            correlation_ids.add(t.correlation_id)
        if t.request_id:
            correlation_ids.add(t.request_id)
            
    # 2. Get Audit Logs
    audit_logs = db.scalars(
        select(AuditLog)
        .where(
            (AuditLog.request_id.in_(correlation_ids)) |
            (AuditLog.correlation_id.in_(correlation_ids))
        )
        .order_by(AuditLog.created_at)
    ).all()
    
    # 3. Get Recognition Events
    recognition_events = db.scalars(
        select(RecognitionAuditLog)
        .where(RecognitionAuditLog.request_id.in_(correlation_ids))
        .order_by(RecognitionAuditLog.created_at)
    ).all()
    
    # 4. Get Snapshots
    snapshots = db.scalars(
        select(IncidentSnapshot)
        .where(
            (IncidentSnapshot.request_id.in_(correlation_ids)) |
            (IncidentSnapshot.correlation_id.in_(correlation_ids))
        )
        .order_by(IncidentSnapshot.created_at)
    ).all()
    
    # Analyze retries
    retries = sum(t.retry_count for t in tasks)
    
    # Compile
    return {
        "request_id": request_id,
        "correlated_ids": list(correlation_ids),
        "total_retries": retries,
        "biometric_tasks": [
            {
                "id": t.id,
                "task_id": t.celery_task_id,
                "task_type": t.task_type,
                "status": t.status,
                "retry_count": t.retry_count,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "error_message": t.error_message,
            }
            for t in tasks
        ],
        "audit_events": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "message": a.message,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in audit_logs
        ],
        "recognition_events": [
            {
                "id": r.id,
                "request_id": r.request_id,
                "top_match_student_id": r.top_match_student_id,
                "accepted_match": r.accepted_match,
                "confidence_score": r.confidence_score,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recognition_events
        ],
        "failures": [
            {
                "id": s.id,
                "traceback_summary": s.traceback_summary,
                "processing_context": s.processing_context,
                "request_metadata": s.request_metadata,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in snapshots
        ],
    }