import json
import logging
from collections import Counter

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.core.auth import bearer_scheme, require_admin, require_super_admin
from app.core.enrollment_db import (
    assert_enrollment_processable,
    EnrollmentInvalidStateError,
    EnrollmentPersistenceError,
    EnrollmentNotFoundError,
    approve_enrollment,
    get_enrollments_snapshot_from_db,
    record_processing_completed_in_db,
    reject_enrollment,
    reset_enrollment,
)
from app.core.embeddings_db import (
    FaceEmbeddingPersistenceError,
    persist_face_embeddings,
)
from app.core.face_pipeline import FacePipelineError, process_student_images
from app.core.storage import get_storage_service
from app.db.models import Enrollment, EnrollmentImage
from app.db.models.recognition_audit_logs import RecognitionAuditLog


router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


class RejectEnrollmentRequest(BaseModel):
    reason: str | None = None


@router.get("/enrollments")
async def list_admin_enrollments(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    snapshot = get_enrollments_snapshot_from_db()
    return {
        "total": snapshot.get("total", 0),
        "latest": snapshot.get("latest"),
        "enrollments": snapshot.get("enrollments", []),
    }


from sqlalchemy import select, desc, func, literal_column, union_all
from app.core.task_db import create_biometric_task_record, BiometricTask
from app.db.session import get_session_factory
from app.db.models.admin_users import AdminUser
from app.core.config import settings
from app.core.approval_hygiene import NEAR_DUPLICATE_DHASH_MAX_DISTANCE

@router.get("/config")
async def get_system_config(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    
    session_factory = get_session_factory()
    with session_factory() as db:
        admin_count = db.scalar(select(func.count()).select_from(AdminUser)) or 0
        
    return {
        "verification": {
            "auto_approval_threshold": settings.face_match_distance_threshold,
            "minimum_face_quality_blur": settings.enrollment_min_blur_variance,
            "duplicate_enrollment_sensitivity": NEAR_DUPLICATE_DHASH_MAX_DISTANCE,
        },
        "security": {
            "session_timeout_minutes": settings.access_token_expire_minutes,
        },
        "administrators": {
            "active_admin_accounts": admin_count,
        }
    }


@router.get("/enrollments/{student_id}/samples")
async def inspect_enrollment_samples(
    student_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    session_factory = get_session_factory()
    storage = get_storage_service()
    with session_factory() as db:
        enrollment = db.scalar(
            select(Enrollment)
            .where(Enrollment.student_id == student_id)
            .order_by(desc(Enrollment.id))
            .limit(1)
        )
        if enrollment is None:
            return JSONResponse(
                status_code=404,
                content={"success": False, "message": "Enrollment not found."},
            )

        rows = db.scalars(
            select(EnrollmentImage)
            .where(EnrollmentImage.enrollment_id == enrollment.id)
            .order_by(EnrollmentImage.angle.asc(), EnrollmentImage.image_index.asc(), EnrollmentImage.id.asc())
        ).all()

        samples = []
        for row in rows:
            preview_available = False
            if row.file_path:
                resolved = storage.resolve_relative_path(row.file_path)
                preview_available = resolved.exists() and resolved.is_file()
            samples.append(
                {
                    "id": row.id,
                    "student_id": student_id,
                    "capture_angle": row.angle,
                    "image_index": row.image_index,
                    "file_path": row.file_path,
                    "preview_available": preview_available,
                    "detection_score": row.detection_confidence,
                    "blur_score": row.blur_score,
                    "brightness_score": row.brightness,
                    "face_box": row.face_box,
                    "face_area_ratio": row.face_area_ratio,
                    "center_offset": row.center_offset,
                    "yaw": row.yaw,
                    "pitch": row.pitch,
                    "roll": row.roll,
                    "quality_score": row.quality_score,
                    "capture_latency_ms": row.capture_latency_ms,
                    "perceptual_hash": row.perceptual_hash,
                    "duplicate_distance": row.duplicate_distance,
                    "replay_flags": row.replay_flags,
                    "validation_status": row.validation_status,
                    "rejection_reason": row.rejection_reason,
                    "accepted": row.passed_validation,
                    "timestamp": row.captured_at.isoformat() if row.captured_at else None,
                }
            )

        return {
            "success": True,
            "student_id": student_id,
            "enrollment_id": enrollment.id,
            "validation_passed": enrollment.validation_passed,
            "samples": samples,
        }

@router.get("/biometric-tasks")
async def list_biometric_tasks(
    status: str | None = None,
    student_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    session_factory = get_session_factory()
    with session_factory() as db:
        query = select(BiometricTask)
        if status:
            query = query.where(BiometricTask.status == status)
        if student_id:
            query = query.where(BiometricTask.student_id == student_id)
        
        query = query.order_by(desc(BiometricTask.created_at))
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(total_query) or 0
        
        # Paginate
        query = query.limit(limit).offset(offset)
        tasks = db.scalars(query).all()
        
        return {
            "total": total,
            "tasks": [
                {
                    "id": t.id,
                    "celery_task_id": t.celery_task_id,
                    "student_id": t.student_id,
                    "task_type": t.task_type,
                    "status": t.status,
                    "retry_count": t.retry_count,
                    "started_at": t.started_at.isoformat() if t.started_at else None,
                    "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                    "failed_at": t.failed_at.isoformat() if t.failed_at else None,
                    "error_message": t.error_message,
                    "worker_hostname": t.worker_hostname,
                    "processing_duration_ms": t.processing_duration_ms,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in tasks
            ]
        }


from app.tasks.biometric_tasks import process_student_enrollment_task

@router.post("/enrollments/{student_id}/approve")
async def approve_enrollment_admin(
    student_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    if not student_id.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "student_id is required."},
        )

    try:
        result = approve_enrollment(student_id)
    except EnrollmentPersistenceError as exc:
        logger.exception("Persistence error during enrollment approval.")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Database error: {exc}"},
        )
    except Exception as exc:
        logger.exception("Unexpected error during enrollment approval.")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Unexpected error: {exc}"},
        )

    payload: dict[str, object] = {
        "success": result.success,
        "approved": bool(result.success),
        "message": result.message,
        "processing_attempted": False,
        "processing_passed": False,
        "processed_images_count": 0,
        "embeddings_generated_count": 0,
        "processing_error": None,
    }
    if result.debug_details is not None:
        payload["hygiene_debug"] = result.debug_details
    if not result.success:
        return payload

    if result.was_updated:
        try:
            process_student_enrollment_task.delay(student_id)
            payload["processing_attempted"] = True
            payload["message"] = "Enrollment approved and queued for background processing."
        except Exception as exc:
            logger.exception("Failed to queue background processing task.")
            payload["processing_attempted"] = False
            payload["processing_error"] = f"Queuing failed: {exc}"
            payload["message"] = "Enrollment approved, but failed to queue biometric processing."
    else:
        payload["processing_attempted"] = False
        payload["message"] = "Enrollment was already approved."
        
    return payload


@router.post("/enrollments/{student_id}/reject")
async def reject_enrollment_admin(
    student_id: str,
    payload: RejectEnrollmentRequest | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    if not student_id.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "student_id is required."},
        )

    try:
        result = reject_enrollment(
            student_id,
            reason=payload.reason if payload is not None else None,
        )
    except EnrollmentPersistenceError as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(exc)},
        )

    return {"success": result.success, "message": result.message}


@router.post("/enrollments/{student_id}/reset")
async def reset_enrollment_admin(
    student_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_super_admin(credentials)
    if not student_id.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "student_id is required."},
        )

    try:
        result = reset_enrollment(student_id)
    except EnrollmentPersistenceError as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(exc)},
        )

    return {"success": result.success, "message": result.message}


@router.post("/enrollments/{student_id}/process")
async def process_enrollment_admin(
    student_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    if not student_id.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "student_id is required."},
        )

    task = process_student_enrollment_task.delay(student_id)
    create_biometric_task_record(task.id, student_id, "enrollment_processing")

    return {
        "success": True,
        "message": "Enrollment processing queued successfully.",
    }


@router.get("/recognition-audit")
async def list_recognition_audit_logs(
    student_id: str | None = None,
    accepted: bool | None = None,
    min_confidence: float | None = None,
    max_confidence: float | None = None,
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    session_factory = get_session_factory()
    with session_factory() as db:
        query = select(RecognitionAuditLog)
        if student_id:
            query = query.where(
                (RecognitionAuditLog.searched_student_id == student_id) |
                (RecognitionAuditLog.top_match_student_id == student_id)
            )
        if accepted is not None:
            query = query.where(RecognitionAuditLog.accepted_match == accepted)
        if min_confidence is not None:
            query = query.where(RecognitionAuditLog.confidence_score >= min_confidence)
        if max_confidence is not None:
            query = query.where(RecognitionAuditLog.confidence_score <= max_confidence)
        
        query = query.order_by(desc(RecognitionAuditLog.created_at))
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(total_query) or 0
        
        # Paginate
        query = query.limit(limit).offset(offset)
        logs = db.scalars(query).all()
        
        return {
            "total": total,
            "logs": [
                {
                    "id": log.id,
                    "request_id": log.request_id,
                    "searched_by_admin_id": log.searched_by_admin_id,
                    "searched_student_id": log.searched_student_id,
                    "top_match_student_id": log.top_match_student_id,
                    "confidence_score": log.confidence_score,
                    "cosine_distance": log.cosine_distance,
                    "threshold_used": log.threshold_used,
                    "accepted_match": log.accepted_match,
                    "top_k_results_json": log.top_k_results_json,
                    "image_metadata_json": log.image_metadata_json,
                    "processing_duration_ms": log.processing_duration_ms,
                    "recognition_model_version": log.recognition_model_version,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in logs
            ]
        }


from app.core.config import settings
from app.core.recognition_analytics import (
    get_confidence_distributions,
    get_distance_distributions,
    get_recognition_quality_metrics,
    investigate_false_positives,
    get_threshold_recommendations,
)

@router.get("/recognition-analytics")
async def get_recognition_analytics(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    
    current_threshold = float(settings.face_match_distance_threshold)
    
    session_factory = get_session_factory()
    with session_factory() as db:
        metrics = get_recognition_quality_metrics(db)
        conf_dist = get_confidence_distributions(db)
        dist_dist = get_distance_distributions(db)
        recommendations = get_threshold_recommendations(db, current_threshold)
        recent_false_positives = investigate_false_positives(db, current_threshold, limit=10)
        
        return {
            "metrics": metrics,
            "confidence_distributions": conf_dist,
            "distance_distributions": dist_dist,
            "recommendations": recommendations,
            "recent_suspicious_edge_cases": recent_false_positives,
        }

from app.core.incident_timeline import reconstruct_incident_timeline

@router.get("/incidents/{request_id}")
async def get_incident_timeline(
    request_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    
    session_factory = get_session_factory()
    with session_factory() as db:
        timeline = reconstruct_incident_timeline(db, request_id)
        return timeline


from app.db.models.system_health_snapshots import SystemHealthSnapshot
from app.core.health_intelligence import gather_system_diagnostics

@router.get("/system-health")
async def get_system_health(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    
    session_factory = get_session_factory()
    with session_factory() as db:
        current = gather_system_diagnostics(db)
        
        # Get recent critical snapshots
        recent_incidents = db.scalars(
            select(SystemHealthSnapshot)
            .where(SystemHealthSnapshot.overall_status != "healthy")
            .order_by(desc(SystemHealthSnapshot.created_at))
            .limit(5)
        ).all()
        
        return {
            "current_status": current["overall_status"],
            "degraded_components": current["degraded_components"],
            "queue_depth": current["queue_depth"],
            "active_workers": current["active_workers"],
            "retry_rate": current["retry_rate"],
            "failed_task_rate": current["failed_task_rate"],
            "avg_processing_duration": current["avg_processing_duration"],
            "avg_recognition_duration": current["avg_recognition_duration"],
            "critical_events": current["critical_events"],
            "recent_incidents": [
                {
                    "id": i.id,
                    "status": i.overall_status,
                    "created_at": i.created_at.isoformat() if i.created_at else None,
                    "events": i.critical_events_json.get("events", [])
                }
                for i in recent_incidents
            ]
        }

from typing import Any
from fastapi import HTTPException
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from app.core.enrollment_db import get_enrollment_details_by_student_id
from app.db.models.enrollments import Enrollment
from app.db.models.audit_logs import AuditLog
from app.db.models.students import Student
from app.db.models.admin_users import AdminUser


def _audit_result_for_event(event_type: str) -> str:
    if event_type in {"processing_failed", "enrollment_failed"}:
        return "failed"
    if event_type in {"enrollment_validated", "enrollment_approved", "enrollment_rejected", "enrollment_reset", "processing_completed"}:
        return "success"
    return "recorded"


def _sample_threshold_recommendations(samples: list[EnrollmentImage]) -> list[dict[str, object]]:
    recommendations: list[dict[str, object]] = []
    if not samples:
        return [
            {
                "metric": "sample_size",
                "recommendation": "Collect calibration and enrollment samples from real DIU devices before tuning thresholds.",
            }
        ]

    def values(attr: str) -> list[float]:
        result: list[float] = []
        for sample in samples:
            value = getattr(sample, attr, None)
            if isinstance(value, int | float):
                result.append(float(value))
        return result

    blur_values = values("blur_score")
    brightness_values = values("brightness")
    quality_values = values("quality_score")
    face_values = values("face_area_ratio")
    center_values = values("center_offset")

    if quality_values and sum(quality_values) / len(quality_values) < 75:
        recommendations.append(
            {
                "metric": "quality_score",
                "recommendation": "Do not lower thresholds yet; identify the dominant failing metric and improve capture conditions.",
                "observed_average": round(sum(quality_values) / len(quality_values), 2),
            }
        )
    if blur_values and min(blur_values) < settings.enrollment_min_blur_variance * 1.2:
        recommendations.append(
            {
                "metric": "blur",
                "recommendation": "Increase hold-still guidance or camera focus checks before changing blur threshold.",
                "observed_min": round(min(blur_values), 2),
                "threshold": settings.enrollment_min_blur_variance,
            }
        )
    if brightness_values and (
        min(brightness_values) < settings.enrollment_min_brightness + 10
        or max(brightness_values) > settings.enrollment_max_brightness - 10
    ):
        recommendations.append(
            {
                "metric": "lighting",
                "recommendation": "Tune room lighting and camera exposure before considering brightness threshold changes.",
                "observed_range": [round(min(brightness_values), 2), round(max(brightness_values), 2)],
                "threshold_range": [
                    settings.enrollment_min_brightness,
                    settings.enrollment_max_brightness,
                ],
            }
        )
    if face_values and min(face_values) < settings.enrollment_min_face_area_ratio * 1.15:
        recommendations.append(
            {
                "metric": "distance",
                "recommendation": "Students are near the minimum face size. Improve distance guidance or camera placement.",
                "observed_min": round(min(face_values), 3),
                "threshold": settings.enrollment_min_face_area_ratio,
            }
        )
    if center_values and max(center_values) > settings.enrollment_max_center_offset * 0.9:
        recommendations.append(
            {
                "metric": "centering",
                "recommendation": "Improve framing overlay alignment. Keep the current centering threshold strict.",
                "observed_max": round(max(center_values), 3),
                "threshold": settings.enrollment_max_center_offset,
            }
        )
    if not recommendations:
        recommendations.append(
            {
                "metric": "overall",
                "recommendation": "Stored samples are comfortably within thresholds. Continue collecting more device-specific data.",
            }
        )
    return recommendations


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = 1,
    limit: int = 25,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    page = max(1, page)
    bounded_limit = max(1, min(limit, 100))
    offset = (page - 1) * bounded_limit

    session_factory = get_session_factory()
    with session_factory() as db:
        audit_q = select(
            AuditLog.id.label("log_id"),
            AuditLog.created_at.label("created_at"),
            literal_column("'enrollment'").label("log_type")
        )
        rec_q = select(
            RecognitionAuditLog.id.label("log_id"),
            RecognitionAuditLog.created_at.label("created_at"),
            literal_column("'recognition'").label("log_type")
        )
        combined = union_all(audit_q, rec_q).cte("combined_logs")

        total = db.scalar(select(func.count()).select_from(combined)) or 0
        total_pages = max(1, (total + bounded_limit - 1) // bounded_limit) if total > 0 else 1

        page_records = db.execute(
            select(combined.c.log_id, combined.c.log_type)
            .order_by(desc(combined.c.created_at))
            .offset(offset)
            .limit(bounded_limit)
        ).all()

        enrollment_ids = [r.log_id for r in page_records if r.log_type == 'enrollment']
        recognition_ids = [r.log_id for r in page_records if r.log_type == 'recognition']

        enrollment_map = {}
        if enrollment_ids:
            enrollment_rows = db.execute(
                select(AuditLog, Student.student_id)
                .outerjoin(Student, AuditLog.student_id == Student.id)
                .where(AuditLog.id.in_(enrollment_ids))
            ).all()
            for row in enrollment_rows:
                enrollment_map[row[0].id] = row

        recognition_map = {}
        if recognition_ids:
            recognition_rows = db.execute(
                select(RecognitionAuditLog, AdminUser.email)
                .outerjoin(AdminUser, RecognitionAuditLog.searched_by_admin_id == AdminUser.id)
                .where(RecognitionAuditLog.id.in_(recognition_ids))
            ).all()
            for row in recognition_rows:
                recognition_map[row[0].id] = row

        items: list[dict[str, object]] = []
        for r in page_records:
            if r.log_type == 'enrollment':
                if r.log_id in enrollment_map:
                    audit, student_public_id = enrollment_map[r.log_id]
                    items.append(
                        {
                            "id": f"audit-{audit.id}",
                            "timestamp": audit.created_at.isoformat() if audit.created_at else None,
                            "action_type": audit.event_type,
                            "affected_record": student_public_id,
                            "operator_identity": "Backend workflow",
                            "operation_result": _audit_result_for_event(audit.event_type),
                            "source": "enrollment",
                            "request_id": audit.request_id,
                            "correlation_id": audit.correlation_id,
                            "detail": audit.message,
                        }
                    )
            elif r.log_type == 'recognition':
                if r.log_id in recognition_map:
                    recognition, admin_email = recognition_map[r.log_id]
                    result = "success" if recognition.accepted_match else "review_required"
                    affected_record = recognition.top_match_student_id or recognition.searched_student_id
                    items.append(
                        {
                            "id": f"recognition-{recognition.id}",
                            "timestamp": recognition.created_at.isoformat() if recognition.created_at else None,
                            "action_type": "recognition_search_executed",
                            "affected_record": affected_record,
                            "operator_identity": admin_email or "System",
                            "operation_result": result,
                            "source": "recognition",
                            "request_id": recognition.request_id,
                            "correlation_id": None,
                            "detail": (
                                "Similarity scan accepted a candidate match."
                                if recognition.accepted_match
                                else "Similarity scan completed; manual verification may be required."
                            ),
                            "recognition": {
                                "confidence_score": recognition.confidence_score,
                                "cosine_distance": recognition.cosine_distance,
                                "threshold_used": recognition.threshold_used,
                                "processing_duration_ms": recognition.processing_duration_ms,
                            },
                        }
                    )

        return {
            "items": items,
            "total": total,
            "page": page,
            "totalPages": total_pages,
        }

@router.get("/enrollments/{student_id}")
async def get_admin_enrollment_details(
    student_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    require_admin(credentials)
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            return get_enrollment_details_by_student_id(db, student_id)
        except EnrollmentNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

@router.get("/storage/{path:path}")
async def get_admin_storage_file(
    path: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> FileResponse:
    require_admin(credentials)
    storage = get_storage_service()
    absolute_path = storage.resolve_relative_path(path)
    if not absolute_path.exists() or not absolute_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(absolute_path)

@router.get("/enrollments-metrics")
async def get_enrollments_metrics(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    require_admin(credentials)
    session_factory = get_session_factory()
    with session_factory() as db:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        pending_review = db.scalar(
            select(func.count(Enrollment.id))
            .where(Enrollment.status == "validated")
        ) or 0
        
        approved_today = db.scalar(
            select(func.count(AuditLog.id))
            .where(
                AuditLog.event_type == "enrollment_approved",
                AuditLog.created_at >= today_start
            )
        ) or 0
        
        rejected_today = db.scalar(
            select(func.count(AuditLog.id))
            .where(
                AuditLog.event_type == "enrollment_rejected",
                AuditLog.created_at >= today_start
            )
        ) or 0
        
        oldest_pending_timestamp = db.scalar(
            select(func.min(Enrollment.updated_at))
            .where(Enrollment.status == "validated")
        )
        total_enrollment_attempts = db.scalar(select(func.count(Enrollment.id))) or 0
        accepted_enrollments = db.scalar(
            select(func.count(Enrollment.id)).where(Enrollment.validation_passed.is_(True))
        ) or 0
        failed_attempts = db.scalar(
            select(func.count(AuditLog.id)).where(AuditLog.event_type == "enrollment_failed")
        ) or 0
        samples = db.scalars(select(EnrollmentImage)).all()
        quality_scores = [
            float(sample.quality_score)
            for sample in samples
            if isinstance(sample.quality_score, int | float)
        ]
        rejection_counter: Counter[str] = Counter()
        replay_counter: Counter[str] = Counter()
        for sample in samples:
            if sample.rejection_reason:
                rejection_counter.update([sample.rejection_reason])
            if sample.replay_flags:
                try:
                    flags = json.loads(sample.replay_flags)
                except json.JSONDecodeError:
                    flags = []
                if isinstance(flags, list):
                    replay_counter.update(str(flag) for flag in flags)

        return {
            "pending_review": pending_review,
            "approved_today": approved_today,
            "rejected_today": rejected_today,
            "oldest_pending_timestamp": oldest_pending_timestamp.isoformat() if oldest_pending_timestamp else None,
            "enrollment_quality": {
                "total_attempts": total_enrollment_attempts,
                "accepted_enrollments": accepted_enrollments,
                "failed_attempts": failed_attempts,
                "acceptance_rate": round((accepted_enrollments / total_enrollment_attempts) * 100.0, 2)
                if total_enrollment_attempts
                else 0,
                "total_samples": len(samples),
                "average_quality_score": round(sum(quality_scores) / len(quality_scores), 2)
                if quality_scores
                else None,
                "rejection_reasons": dict(rejection_counter),
                "replay_flags": dict(replay_counter),
                "threshold_recommendations": _sample_threshold_recommendations(samples),
            },
        }
