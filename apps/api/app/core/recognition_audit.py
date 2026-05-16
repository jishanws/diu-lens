"""Recognition audit and observability helpers."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.db.models.recognition_audit_logs import RecognitionAuditLog
from app.db.session import get_session_factory

logger = logging.getLogger(__name__)


def serialize_match_results(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    """Serialize the top-k candidates for JSON storage."""
    serialized = []
    for cand in candidates[:3]:
        ser = {}
        for k, v in cand.items():
            if isinstance(v, set):
                ser[k] = list(v)
            else:
                ser[k] = v
        serialized.append(ser)
    return {"top_3": serialized}


def create_recognition_audit_log(
    db: Session,
    request_id: str,
    searched_by_admin_id: int | None,
    searched_student_id: str | None,
    top_match_student_id: str | None,
    confidence_score: float | None,
    cosine_distance: float | None,
    threshold_used: float | None,
    accepted_match: bool,
    top_k_results_json: dict[str, Any],
    image_metadata_json: dict[str, Any],
    processing_duration_ms: float | None,
    recognition_model_version: str = "v1",
) -> None:
    """Create and persist a single recognition audit log."""
    audit_log = RecognitionAuditLog(
        request_id=request_id,
        searched_by_admin_id=searched_by_admin_id,
        searched_student_id=searched_student_id,
        top_match_student_id=top_match_student_id,
        confidence_score=confidence_score,
        cosine_distance=cosine_distance,
        threshold_used=threshold_used,
        accepted_match=accepted_match,
        top_k_results_json=top_k_results_json,
        image_metadata_json=image_metadata_json,
        processing_duration_ms=processing_duration_ms,
        recognition_model_version=recognition_model_version,
    )
    db.add(audit_log)
    db.commit()


def persist_recognition_metrics(
    request_id: str,
    searched_by_admin_id: int | None,
    searched_student_id: str | None,
    match_result: dict[str, Any],
    processing_duration_ms: float | None,
) -> None:
    """Persist recognition metrics without blocking or breaking main flow."""
    try:
        candidates = match_result.get("candidates", [])
        weak_candidates = match_result.get("weak_candidates", [])
        all_candidates = candidates + weak_candidates
        top_k_results_json = serialize_match_results(all_candidates)
        
        top_match = candidates[0] if candidates else None
        
        top_match_student_id = top_match["student_id"] if top_match else None
        cosine_distance = float(top_match["best_distance"]) if top_match else None
        confidence_score = 1.0 - cosine_distance if cosine_distance is not None else None
        accepted_match = bool(match_result.get("match_found", False))
        threshold_used = float(match_result.get("threshold_used", 0.0))

        image_metadata_json = {}
        if "query_debug" in match_result:
            image_metadata_json = match_result["query_debug"]
            
        logger.info(
            "[recognition-audit] request_id=%s top_match_student_id=%s confidence_score=%s accepted_match=%s processing_duration_ms=%s",
            request_id,
            top_match_student_id,
            confidence_score,
            accepted_match,
            processing_duration_ms,
        )

        session_factory = get_session_factory()
        with session_factory() as db:
            create_recognition_audit_log(
                db=db,
                request_id=request_id,
                searched_by_admin_id=searched_by_admin_id,
                searched_student_id=searched_student_id,
                top_match_student_id=top_match_student_id,
                confidence_score=confidence_score,
                cosine_distance=cosine_distance,
                threshold_used=threshold_used,
                accepted_match=accepted_match,
                top_k_results_json=top_k_results_json,
                image_metadata_json=image_metadata_json,
                processing_duration_ms=processing_duration_ms,
            )
    except Exception as exc:
        logger.exception("Failed to persist recognition audit logs: %s", exc)
