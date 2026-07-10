"""Persistence and safe serialization for enrollment verification jobs."""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import settings
from app.db.models import Enrollment, EnrollmentVerificationJob
from app.db.session import get_session_factory


TERMINAL_STATUSES = {"succeeded", "retake_required", "failed"}
ACTIVE_STATUSES = {"queued", "processing"}
JOB_TTL_MINUTES = 30


class VerificationJobError(Exception):
    pass


class VerificationJobUnauthorized(VerificationJobError):
    pass


def assert_verification_submittable(student_id: str) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        enrollment = db.scalar(
            select(Enrollment)
            .where(Enrollment.student_id == student_id)
            .order_by(Enrollment.id.desc())
            .limit(1)
        )
        if enrollment is None:
            raise VerificationJobError("No pending enrollment was found.")
        if enrollment.status not in {"pending", "uploaded", "validated", "failed", "rejected", "reset"}:
            raise VerificationJobError("This enrollment cannot accept another verification.")


def expire_stale_jobs() -> list[str]:
    session_factory = get_session_factory()
    now = datetime.now(timezone.utc)
    expired_ids: list[str] = []
    expired_task_ids: list[str] = []
    with session_factory() as db:
        jobs = db.scalars(select(EnrollmentVerificationJob).where(
            EnrollmentVerificationJob.status.in_(ACTIVE_STATUSES),
            EnrollmentVerificationJob.expires_at <= now,
        ).with_for_update()).all()
        for job in jobs:
            job.status = "failed"
            job.stage = "failed"
            job.error_code = "VERIFICATION_TIMEOUT"
            job.error_message = "Verification timed out. Please retry."
            job.finished_at = now
            expired_ids.append(job.verification_id)
            if job.celery_task_id:
                expired_task_ids.append(job.celery_task_id)
        db.commit()
    if expired_task_ids:
        from app.core.task_db import mark_task_failed

        for task_id in expired_task_ids:
            mark_task_failed(task_id, "verification_timeout")
    return expired_ids


def hash_verification_secret(value: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def create_job(
    *, student_id: str, idempotency_key: str, owner_token: str,
    payload: dict[str, Any], temporary_images: dict[str, list[str]],
    verification_id: str | None = None,
) -> tuple[EnrollmentVerificationJob, bool]:
    session_factory = get_session_factory()
    key_hash = hash_verification_secret(idempotency_key)
    token_hash = hash_verification_secret(owner_token)
    now = datetime.now(timezone.utc)
    with session_factory() as db:
        existing = db.scalar(select(EnrollmentVerificationJob).where(
            EnrollmentVerificationJob.student_id == student_id,
            EnrollmentVerificationJob.idempotency_key_hash == key_hash,
        ))
        if existing is not None:
            if not hmac.compare_digest(existing.owner_token_hash, token_hash):
                raise VerificationJobUnauthorized("Verification ownership token is invalid.")
            return existing, False
        job = EnrollmentVerificationJob(
            verification_id=verification_id or str(uuid4()), student_id=student_id,
            idempotency_key_hash=key_hash, owner_token_hash=token_hash,
            status="queued", stage="uploading", payload_json=payload,
            temporary_images_json=temporary_images, failed_angles_json=[],
            stage_durations_json={}, upload_accepted_at=now, queued_at=now,
            expires_at=now + timedelta(minutes=JOB_TTL_MINUTES),
        )
        db.add(job)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.scalar(select(EnrollmentVerificationJob).where(
                EnrollmentVerificationJob.student_id == student_id,
                EnrollmentVerificationJob.idempotency_key_hash == key_hash,
            ))
            if existing is None or not hmac.compare_digest(existing.owner_token_hash, token_hash):
                raise VerificationJobUnauthorized("Verification job already exists.")
            return existing, False
        db.refresh(job)
        return job, True


def get_job(verification_id: str) -> EnrollmentVerificationJob | None:
    session_factory = get_session_factory()
    with session_factory() as db:
        return db.scalar(select(EnrollmentVerificationJob).where(
            EnrollmentVerificationJob.verification_id == verification_id
        ))


def get_owned_job(verification_id: str, owner_token: str) -> EnrollmentVerificationJob:
    job = get_job(verification_id)
    if job is None or not hmac.compare_digest(
        job.owner_token_hash, hash_verification_secret(owner_token)
    ):
        raise VerificationJobUnauthorized("Verification job was not found.")
    return job


def cancel_owned_job(verification_id: str, owner_token: str) -> EnrollmentVerificationJob:
    token_hash = hash_verification_secret(owner_token)
    session_factory = get_session_factory()
    with session_factory() as db:
        job = db.scalar(select(EnrollmentVerificationJob).where(
            EnrollmentVerificationJob.verification_id == verification_id
        ).with_for_update())
        if job is None or not hmac.compare_digest(job.owner_token_hash, token_hash):
            raise VerificationJobUnauthorized("Verification job was not found.")
        if job.status not in TERMINAL_STATUSES:
            job.status = "failed"
            job.stage = "failed"
            job.error_code = "CANCELLED"
            job.error_message = "Verification was cancelled."
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(job)
        return job


def update_job(verification_id: str, **values: Any) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            job = db.scalar(select(EnrollmentVerificationJob).where(
                EnrollmentVerificationJob.verification_id == verification_id
            ).with_for_update())
            if job is None:
                raise VerificationJobError("Verification job was not found.")
            for key, value in values.items():
                setattr(job, key, value)
            db.commit()
        except SQLAlchemyError as exc:
            db.rollback()
            raise VerificationJobError("Unable to update verification job.") from exc


def serialize_job(job: EnrollmentVerificationJob) -> dict[str, Any]:
    return {
        "verification_id": job.verification_id,
        "status": job.status,
        "stage": job.stage,
        "status_endpoint": f"/enroll/verification/{job.verification_id}",
        "failed_angles": list(job.failed_angles_json or []),
        "error": ({"code": job.error_code, "message": job.error_message}
                  if job.error_code and job.error_message else None),
        "timestamps": {
            key: value.isoformat() if value else None
            for key, value in {
                "upload_accepted": job.upload_accepted_at,
                "job_queued": job.queued_at,
                "processing_started": job.processing_started_at,
                "image_validation_completed": job.validation_completed_at,
                "embedding_completed": job.embedding_completed_at,
                "database_commit_completed": job.database_committed_at,
                "job_finished": job.finished_at,
            }.items()
        },
        "stage_durations_ms": dict(job.stage_durations_json or {}),
    }
