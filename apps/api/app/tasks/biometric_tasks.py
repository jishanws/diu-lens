import logging
import redis
import time
import socket
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from starlette.datastructures import UploadFile
from fastapi import HTTPException
from celery.exceptions import SoftTimeLimitExceeded
from celery import shared_task

from app.core.config import settings
from app.core.celery_app import celery_app
from app.core.enrollment_db import (
    EnrollmentNotFoundError,
    EnrollmentInvalidStateError,
    EnrollmentPersistenceError,
    assert_enrollment_processable,
    mark_enrollment_as_processing,
    record_processing_completed_in_db,
)
from app.core.face_pipeline import FacePipelineError, process_student_images
from app.core.embeddings_db import FaceEmbeddingPersistenceError, persist_face_embeddings
from app.core.face_matching import FaceMatchingError
from app.core.storage import get_storage_service
from app.core.task_db import mark_task_processing, mark_task_completed, mark_task_failed, increment_retry_count
from app.core.task_recovery import recover_zombie_tasks
from app.core.enrollment_verification_jobs import TERMINAL_STATUSES, expire_stale_jobs, get_job, update_job

logger = logging.getLogger(__name__)

redis_client = redis.from_url(settings.redis_url)

from app.core.health_intelligence import run_and_persist_health_check

@celery_app.task(bind=True)
def monitor_system_health_task(self) -> dict:
    """Periodic task to run operational health diagnostics."""
    logger.info("[system-health-monitor] starting scheduled health check")
    
    lock_key = "lock:system_health_monitor"
    lock = redis_client.lock(lock_key, timeout=60)
    
    if not lock.acquire(blocking=False):
        logger.info("[system-health-monitor] skipped, already running")
        return {"success": True, "skipped": True}
        
    try:
        from app.db.session import get_session_factory
        session_factory = get_session_factory()
        with session_factory() as db:
            snapshot = run_and_persist_health_check(db)
            logger.info(
                "[system-health-monitor] finished scan, status=%s degraded=%s queue_depth=%s",
                snapshot.overall_status,
                snapshot.critical_events_json.get("degraded", []),
                snapshot.queue_depth,
            )
            return {
                "success": True, 
                "skipped": False, 
                "status": snapshot.overall_status,
                "queue_depth": snapshot.queue_depth,
            }
    except Exception as exc:
        logger.error("[system-health-monitor] error during health check: %s", exc)
        return {"success": False, "error": str(exc)}
    finally:
        try:
            lock.release()
        except redis.exceptions.LockError:
            pass


@celery_app.task(bind=True)
def recover_zombie_tasks_task(self) -> dict:
    """Periodic task to detect and recover zombie biometric tasks."""
    logger.info("[zombie-task-recovery] starting scheduled scan")
    
    # Use a redis lock to ensure only one beat/worker recovers at a time
    lock_key = "lock:zombie_recovery"
    lock = redis_client.lock(lock_key, timeout=300)
    
    if not lock.acquire(blocking=False):
        logger.info("[zombie-task-recovery] skipped, already running")
        return {"success": True, "recovered": 0, "skipped": True}
        
    try:
        recovered = recover_zombie_tasks(timeout_minutes=15)
        expired_verifications = expire_stale_jobs()
        storage = get_storage_service()
        for verification_id in expired_verifications:
            storage.clear_temporary_verification(verification_id)
        logger.info("[zombie-task-recovery] finished scan, recovered=%s", recovered)
        return {
            "success": True, "recovered": recovered,
            "expired_verifications": len(expired_verifications), "skipped": False,
        }
    except Exception as exc:
        logger.error("[zombie-task-recovery] error during recovery: %s", exc)
        return {"success": False, "error": str(exc)}
    finally:
        try:
            lock.release()
        except redis.exceptions.LockError:
            pass

@celery_app.task(
    bind=True,
    autoretry_for=(FacePipelineError, EnrollmentPersistenceError, FaceEmbeddingPersistenceError),
    retry_backoff=True,
    retry_backoff_max=120,
    max_retries=3,
)
def process_student_enrollment_task(self, student_id: str) -> dict:
    """Background task to extract and persist biometric embeddings for a student."""
    logger.info("[celery-processing] start student_id=%s task_id=%s", student_id, self.request.id)
    
    start_time = time.time()
    mark_task_processing(self.request.id, socket.gethostname())

    lock_key = f"lock:biometric_process:{student_id}"
    lock = redis_client.lock(lock_key, timeout=600)
    
    if not lock.acquire(blocking=False):
        logger.warning("[celery-processing] skipped duplicate task student_id=%s task_id=%s", student_id, self.request.id)
        # We don't mark as failed if it's just skipping duplicate lock
        return {"success": False, "error": "Task is already processing"}
        
    logger.info("[celery-processing] lock acquired student_id=%s task_id=%s", student_id, self.request.id)
        
    try:
        try:
            assert_enrollment_processable(student_id)
            mark_enrollment_as_processing(student_id)
        except EnrollmentNotFoundError as exc:
            logger.error("[celery-processing] error student_id=%s reason=%s", student_id, exc)
            mark_task_failed(self.request.id, str(exc), int((time.time() - start_time) * 1000))
            return {"success": False, "error": str(exc)}
        except EnrollmentInvalidStateError as exc:
            logger.error("[celery-processing] invalid state student_id=%s reason=%s", student_id, exc)
            mark_task_failed(self.request.id, str(exc), int((time.time() - start_time) * 1000))
            return {"success": False, "error": str(exc)}
        except EnrollmentPersistenceError as exc:
            if self.request.retries >= self.max_retries:
                mark_task_failed(self.request.id, str(exc), int((time.time() - start_time) * 1000))
            else:
                increment_retry_count(self.request.id)
            raise

        try:
            storage = get_storage_service()
            logger.info(
                "event=embedding_generation_started student_id=%s task_id=%s",
                student_id,
                self.request.id,
            )
            result = process_student_images(student_id, storage=storage)
            processed_images_count = int(result.get("processed_images_count", 0))
            embeddings_generated_count = int(result.get("embeddings_generated_count", 0))
            processing_passed = bool(result.get("processing_passed", False))

            if processing_passed and embeddings_generated_count > 0:
                persisted = persist_face_embeddings(
                    student_id=student_id,
                    processed_crops=list(result.get("processed_crops", [])),
                )
                logger.info(
                    "event=embedding_generation_succeeded student_id=%s inserted=%s deactivated=%s",
                    student_id,
                    int(persisted.get("inserted_count", 0)),
                    int(persisted.get("deactivated_count", 0)),
                )
            elif processing_passed and embeddings_generated_count <= 0:
                processing_passed = False

            record_processing_completed_in_db(
                student_id,
                processed_images_count=processed_images_count,
                processing_passed=processing_passed,
            )

            if processing_passed:
                mark_task_completed(self.request.id, int((time.time() - start_time) * 1000))
            else:
                mark_task_failed(self.request.id, "Processing failed", int((time.time() - start_time) * 1000))

            return {
                "success": processing_passed,
                "processed_images_count": processed_images_count,
                "embeddings_generated_count": embeddings_generated_count,
            }
        except (FacePipelineError, EnrollmentPersistenceError, FaceEmbeddingPersistenceError) as exc:
            logger.exception(
                "event=embedding_generation_failed student_id=%s task_id=%s error_type=%s",
                student_id,
                self.request.id,
                type(exc).__name__,
            )
            if self.request.retries >= self.max_retries:
                mark_task_failed(self.request.id, str(exc), int((time.time() - start_time) * 1000))
            else:
                increment_retry_count(self.request.id)
            raise
        except Exception as exc:
            logger.exception("[celery-processing] unhandled error student_id=%s", student_id)
            record_processing_completed_in_db(
                student_id,
                processed_images_count=0,
                processing_passed=False,
            )
            mark_task_failed(self.request.id, str(exc), int((time.time() - start_time) * 1000))
            raise
    finally:
        try:
            lock.release()
        except redis.exceptions.LockError:
            pass


def _temporary_upload_files(job) -> tuple[dict[str, list[UploadFile]], list[object]]:
    storage = get_storage_service()
    uploads: dict[str, list[UploadFile]] = {}
    handles: list[object] = []
    for angle, paths in dict(job.temporary_images_json or {}).items():
        uploads[str(angle)] = []
        for relative_path in paths:
            path = storage.resolve_relative_path(str(relative_path))
            handle = path.open("rb")
            handles.append(handle)
            content_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
            uploads[str(angle)].append(UploadFile(file=handle, filename=path.name, headers={"content-type": content_type}))
    return uploads, handles


def _promote_verified_images(job, validation_summary: dict | None = None) -> dict[str, list[str]]:
    storage = get_storage_service()
    storage.clear_student_uploads(job.student_id)
    promoted = {angle: [] for angle in ("front", "left", "right", "up", "down", "natural_front")}
    accepted: set[tuple[str, int]] | None = None
    if settings.enrollment_demo_mode and validation_summary is not None:
        reports = validation_summary.get("image_reports", [])
        accepted = {
            (str(report.get("angle")), int(report.get("image_index") or 0))
            for report in reports
            if isinstance(report, dict) and bool(report.get("demo_usable"))
        }
    for angle, paths in dict(job.temporary_images_json or {}).items():
        for index, relative_path in enumerate(paths, start=1):
            if accepted is not None and (str(angle), index) not in accepted:
                continue
            path = storage.resolve_relative_path(str(relative_path))
            content_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
            promoted[str(angle)].append(storage.save_raw_upload(
                student_id=job.student_id, angle=str(angle), content_type=content_type,
                file_bytes=path.read_bytes(),
            ))
    return promoted


def _duplicate_identity_found(student_id: str, processed_crops: list[dict]) -> bool:
    from app.core.face_matching import search_face_matches
    for crop in processed_crops:
        embedding = crop.get("embedding")
        if not isinstance(embedding, list):
            continue
        for candidate in search_face_matches(
            [float(value) for value in embedding],
            candidate_pool_limit=settings.face_match_candidate_pool_limit,
            allowed_enrollment_statuses=("approved", "processed", "validated", "processing"),
        ):
            if (
                str(candidate.get("student_id")) != student_id
                and float(candidate.get("distance", 1.0)) <= settings.face_match_distance_threshold
            ):
                return True
    return False


@celery_app.task(
    bind=True,
    acks_late=True,
    max_retries=2,
    soft_time_limit=300,
    time_limit=360,
)
def process_enrollment_verification_task(self, verification_id: str) -> dict:
    """Strictly validate, process, and commit one idempotent enrollment verification."""
    job = get_job(verification_id)
    if job is None:
        return {"success": False, "error": "job_not_found"}
    if job.status in TERMINAL_STATUSES:
        return {"success": job.status == "succeeded", "status": job.status}

    lock = redis_client.lock(f"lock:enrollment_verification:{verification_id}", timeout=420)
    if not lock.acquire(blocking=False):
        raise self.retry(countdown=2)

    started = time.perf_counter()
    temporary_should_be_cleaned = False
    try:
        now = datetime.now(timezone.utc)
        update_job(
            verification_id, status="processing", stage="validating",
            processing_started_at=job.processing_started_at or now,
            attempt_count=int(job.attempt_count or 0) + 1,
        )
        mark_task_processing(self.request.id, socket.gethostname())
        durations = dict(job.stage_durations_json or {})
        if job.queued_at is not None:
            queued_at = job.queued_at
            if queued_at.tzinfo is None:
                queued_at = queued_at.replace(tzinfo=timezone.utc)
            durations["queue_wait"] = round((now - queued_at).total_seconds() * 1000, 2)

        from app.api.routes import enroll as enroll_route
        payload = enroll_route.EnrollmentRequest.model_validate(job.payload_json)
        uploads, handles = _temporary_upload_files(job)
        validation_started = time.perf_counter()
        try:
            validation_summary = asyncio.run(enroll_route._validate_files(
                uploads, enroll_route._capture_timestamps_by_angle(payload)
            ))
        except HTTPException as exc:
            failed_summary = enroll_route._extract_failed_validation_summary(exc)
            detail_payload = exc.detail if isinstance(exc.detail, dict) else {}
            details = detail_payload.get("details", [])
            if not isinstance(details, list):
                details = []
            failed_angles = sorted({str(row.get("angle")) for row in details if isinstance(row, dict)})
            finished = datetime.now(timezone.utc)
            update_job(
                verification_id, status="retake_required", stage="retake_required",
                failed_angles_json=details, error_code="CAPTURE_VALIDATION_FAILED",
                error_message="Some captures need to be retaken.", finished_at=finished,
                stage_durations_json={
                    **dict(job.stage_durations_json or {}),
                    "validation": round((time.perf_counter() - validation_started) * 1000, 2),
                },
            )
            mark_task_failed(self.request.id, "retake_required", int((time.perf_counter() - started) * 1000))
            temporary_should_be_cleaned = True
            return {"success": False, "status": "retake_required", "failed_angles": failed_angles}
        finally:
            for handle in handles:
                try:
                    handle.close()
                except OSError:
                    pass

        validation_finished = datetime.now(timezone.utc)
        refreshed_job = get_job(verification_id)
        if refreshed_job is not None and refreshed_job.error_code == "CANCELLED":
            mark_task_failed(
                self.request.id,
                "cancelled",
                int((time.perf_counter() - started) * 1000),
            )
            temporary_should_be_cleaned = True
            return {"success": False, "status": "failed"}
        durations["validation"] = round((time.perf_counter() - validation_started) * 1000, 2)
        update_job(
            verification_id, stage="verifying_identity",
            validation_completed_at=validation_finished,
            stage_durations_json=durations,
        )

        promoted_images = _promote_verified_images(job, validation_summary)
        entry = enroll_route._build_enrollment_entry(
            payload=payload, uploaded_images=promoted_images,
            validation_summary=validation_summary,
            frame_metadata_by_path=enroll_route._build_frame_metadata_by_path(
                promoted_images, validation_summary
            ),
        )
        enroll_route._persist_enrollment_metadata(
            entry, mode="final", event_type="enrollment_validated",
            event_message="Final enrollment validated by background verification.",
            update_existing=True,
        )

        identity_started = time.perf_counter()
        embedding_started = time.perf_counter()
        result = process_student_images(
            job.student_id, storage=get_storage_service(), allow_validated=True
        )
        processed_crops = list(result.get("processed_crops", []))
        processing_passed = bool(result.get("processing_passed", False))
        if not processing_passed or not processed_crops:
            raise FacePipelineError("Enrollment biometric processing did not produce valid embeddings.")
        refreshed_job = get_job(verification_id)
        if refreshed_job is not None and refreshed_job.error_code == "CANCELLED":
            mark_task_failed(
                self.request.id,
                "cancelled",
                int((time.perf_counter() - started) * 1000),
            )
            temporary_should_be_cleaned = True
            return {"success": False, "status": "failed"}
        identity_lock = redis_client.lock("lock:enrollment_identity_commit", timeout=120)
        if not identity_lock.acquire(blocking=True, blocking_timeout=30):
            raise FacePipelineError("Identity verification is temporarily busy.")
        try:
            if _duplicate_identity_found(job.student_id, processed_crops):
                update_job(
                    verification_id, status="failed", stage="failed",
                    error_code="DUPLICATE_IDENTITY",
                    error_message="This identity is already enrolled.",
                    finished_at=datetime.now(timezone.utc),
                )
                mark_task_failed(self.request.id, "duplicate_identity", int((time.perf_counter() - started) * 1000))
                temporary_should_be_cleaned = True
                return {"success": False, "status": "failed"}

            embedding_finished = datetime.now(timezone.utc)
            durations["embedding"] = round((time.perf_counter() - embedding_started) * 1000, 2)
            durations["identity_verification"] = round((time.perf_counter() - identity_started) * 1000, 2)
            update_job(
                verification_id, stage="completing", embedding_completed_at=embedding_finished,
                stage_durations_json=durations,
            )
            commit_started = time.perf_counter()
            persist_face_embeddings(student_id=job.student_id, processed_crops=processed_crops)
        finally:
            try:
                identity_lock.release()
            except redis.exceptions.LockError:
                pass
        committed = datetime.now(timezone.utc)
        durations["database_commit"] = round((time.perf_counter() - commit_started) * 1000, 2)
        durations["total"] = round((time.perf_counter() - started) * 1000, 2)
        update_job(
            verification_id, status="succeeded", stage="completed",
            database_committed_at=committed, finished_at=committed,
            stage_durations_json=durations, error_code=None, error_message=None,
        )
        mark_task_completed(self.request.id, int((time.perf_counter() - started) * 1000))
        temporary_should_be_cleaned = True
        return {"success": True, "status": "succeeded"}
    except SoftTimeLimitExceeded as exc:
        if self.request.retries < self.max_retries:
            increment_retry_count(self.request.id)
            raise self.retry(exc=exc, countdown=5)
        update_job(
            verification_id, status="failed", stage="failed", error_code="VERIFICATION_TIMEOUT",
            error_message="Verification timed out. Please retry.", finished_at=datetime.now(timezone.utc),
        )
        mark_task_failed(self.request.id, "verification_timeout")
        temporary_should_be_cleaned = True
        return {"success": False, "status": "failed"}
    except (
        FacePipelineError,
        EnrollmentPersistenceError,
        FaceEmbeddingPersistenceError,
        FaceMatchingError,
    ) as exc:
        if self.request.retries < self.max_retries:
            increment_retry_count(self.request.id)
            raise self.retry(exc=exc, countdown=min(30, 2 ** (self.request.retries + 1)))
        logger.exception("[verification-job] exhausted retries verification_id=%s", verification_id)
        update_job(
            verification_id, status="failed", stage="failed", error_code="VERIFICATION_FAILED",
            error_message="Verification could not be completed. Please retry.",
            finished_at=datetime.now(timezone.utc),
        )
        mark_task_failed(self.request.id, "verification_failed")
        temporary_should_be_cleaned = True
        return {"success": False, "status": "failed"}
    except Exception:
        logger.exception("[verification-job] unhandled failure verification_id=%s", verification_id)
        update_job(
            verification_id, status="failed", stage="failed", error_code="VERIFICATION_FAILED",
            error_message="Verification could not be completed. Please retry.",
            finished_at=datetime.now(timezone.utc),
        )
        mark_task_failed(self.request.id, "verification_failed")
        temporary_should_be_cleaned = True
        return {"success": False, "status": "failed"}
    finally:
        if temporary_should_be_cleaned:
            get_storage_service().clear_temporary_verification(verification_id)
        try:
            lock.release()
        except redis.exceptions.LockError:
            pass
