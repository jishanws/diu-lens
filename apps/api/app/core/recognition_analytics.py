"""Recognition threshold intelligence and biometric analytics."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func, desc, select
from sqlalchemy.orm import Session

from app.db.models.recognition_audit_logs import RecognitionAuditLog

logger = logging.getLogger(__name__)


def get_confidence_distributions(db: Session) -> dict[str, int]:
    """Compute confidence score distributions into buckets."""
    logs = db.scalars(
        select(RecognitionAuditLog.confidence_score)
        .where(RecognitionAuditLog.confidence_score.isnot(None))
    ).all()

    distribution = {
        "0.0-0.5": 0,
        "0.5-0.6": 0,
        "0.6-0.7": 0,
        "0.7-0.8": 0,
        "0.8-0.9": 0,
        "0.9-1.0": 0,
    }

    for score in logs:
        if score < 0.5:
            distribution["0.0-0.5"] += 1
        elif score < 0.6:
            distribution["0.5-0.6"] += 1
        elif score < 0.7:
            distribution["0.6-0.7"] += 1
        elif score < 0.8:
            distribution["0.7-0.8"] += 1
        elif score < 0.9:
            distribution["0.8-0.9"] += 1
        else:
            distribution["0.9-1.0"] += 1

    return distribution


def get_distance_distributions(db: Session) -> dict[str, int]:
    """Compute cosine distance distributions into buckets."""
    logs = db.scalars(
        select(RecognitionAuditLog.cosine_distance)
        .where(RecognitionAuditLog.cosine_distance.isnot(None))
    ).all()

    distribution = {
        "0.0-0.1": 0,
        "0.1-0.2": 0,
        "0.2-0.3": 0,
        "0.3-0.4": 0,
        "0.4-0.5": 0,
        "0.5+": 0,
    }

    for dist in logs:
        if dist < 0.1:
            distribution["0.0-0.1"] += 1
        elif dist < 0.2:
            distribution["0.1-0.2"] += 1
        elif dist < 0.3:
            distribution["0.2-0.3"] += 1
        elif dist < 0.4:
            distribution["0.3-0.4"] += 1
        elif dist < 0.5:
            distribution["0.4-0.5"] += 1
        else:
            distribution["0.5+"] += 1

    return distribution


def get_recognition_quality_metrics(db: Session) -> dict[str, Any]:
    """Compute overall recognition quality metrics."""
    total = db.scalar(select(func.count(RecognitionAuditLog.id))) or 0
    if total == 0:
        return {
            "total_requests": 0,
            "acceptance_rate": 0.0,
            "rejection_rate": 0.0,
            "average_accepted_distance": None,
            "average_rejected_distance": None,
            "confidence_variance": None,
            "top_k_ambiguity_count": 0,
        }

    accepted = db.scalar(
        select(func.count(RecognitionAuditLog.id))
        .where(RecognitionAuditLog.accepted_match == True)
    ) or 0
    rejected = total - accepted

    avg_acc_dist = db.scalar(
        select(func.avg(RecognitionAuditLog.cosine_distance))
        .where(RecognitionAuditLog.accepted_match == True)
    )
    avg_rej_dist = db.scalar(
        select(func.avg(RecognitionAuditLog.cosine_distance))
        .where(RecognitionAuditLog.accepted_match == False)
    )

    scores = db.scalars(
        select(RecognitionAuditLog.confidence_score)
        .where(RecognitionAuditLog.confidence_score.isnot(None))
    ).all()
    
    variance = 0.0
    if scores and len(scores) > 1:
        mean_val = sum(scores) / len(scores)
        variance = sum((x - mean_val) ** 2 for x in scores) / len(scores)

    # Top-k ambiguity metric: count of logs where accepted match but top 2 distances are very close
    # Since we store top_k_results_json, we might have to process it in memory or just check FP stats
    logs_with_results = db.scalars(
        select(RecognitionAuditLog.top_k_results_json)
        .where(RecognitionAuditLog.accepted_match == True)
    ).all()
    
    top_k_ambiguity_count = 0
    for results in logs_with_results:
        top_3 = results.get("top_3", [])
        if len(top_3) >= 2:
            d1 = top_3[0].get("best_distance")
            d2 = top_3[1].get("best_distance")
            if d1 is not None and d2 is not None:
                if (float(d2) - float(d1)) < 0.05:
                    top_k_ambiguity_count += 1

    return {
        "total_requests": total,
        "acceptance_rate": accepted / total if total > 0 else 0.0,
        "rejection_rate": rejected / total if total > 0 else 0.0,
        "average_accepted_distance": float(avg_acc_dist) if avg_acc_dist is not None else None,
        "average_rejected_distance": float(avg_rej_dist) if avg_rej_dist is not None else None,
        "confidence_variance": variance,
        "top_k_ambiguity_count": top_k_ambiguity_count,
    }


def investigate_false_negatives(db: Session, current_threshold: float, limit: int = 50) -> list[dict[str, Any]]:
    """Retrieve rejected matches very close to acceptance."""
    logs = db.scalars(
        select(RecognitionAuditLog)
        .where(RecognitionAuditLog.accepted_match == False)
        .where(RecognitionAuditLog.cosine_distance.isnot(None))
        .where(RecognitionAuditLog.cosine_distance <= current_threshold + 0.05)
        .order_by(RecognitionAuditLog.cosine_distance.asc())
        .limit(limit)
    ).all()

    return [
        {
            "id": log.id,
            "request_id": log.request_id,
            "student_id": log.top_match_student_id,
            "distance": log.cosine_distance,
            "threshold_used": log.threshold_used,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

def investigate_false_positives(db: Session, current_threshold: float, limit: int = 50) -> list[dict[str, Any]]:
    """Retrieve accepted matches very close to threshold (suspicious)."""
    logs = db.scalars(
        select(RecognitionAuditLog)
        .where(RecognitionAuditLog.accepted_match == True)
        .where(RecognitionAuditLog.cosine_distance.isnot(None))
        .where(RecognitionAuditLog.cosine_distance >= current_threshold - 0.05)
        .order_by(desc(RecognitionAuditLog.cosine_distance))
        .limit(limit)
    ).all()

    return [
        {
            "id": log.id,
            "request_id": log.request_id,
            "student_id": log.top_match_student_id,
            "distance": log.cosine_distance,
            "threshold_used": log.threshold_used,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


def get_threshold_recommendations(db: Session, current_threshold: float) -> dict[str, Any]:
    """
    Build lightweight recommendation logic that analyzes historical audit logs,
    suggests safer threshold values, and estimates false positive / negative risks.
    """
    metrics = get_recognition_quality_metrics(db)
    
    fp_candidates = len(investigate_false_positives(db, current_threshold, limit=1000))
    fn_candidates = len(investigate_false_negatives(db, current_threshold, limit=1000))
    
    total = metrics["total_requests"]
    fp_risk_est = fp_candidates / total if total > 0 else 0.0
    fn_risk_est = fn_candidates / total if total > 0 else 0.0
    
    suggested_threshold = current_threshold
    reasons = []

    if fp_candidates > fn_candidates * 1.5 and fp_candidates > 5:
        # High FP risk, tighten threshold
        suggested_threshold = max(0.20, current_threshold - 0.02)
        reasons.append("High number of accepted matches near the threshold boundary.")
    elif fn_candidates > fp_candidates * 1.5 and fn_candidates > 5:
        # High FN risk, loosen threshold
        suggested_threshold = min(0.50, current_threshold + 0.02)
        reasons.append("High number of rejected matches just outside the threshold boundary.")
    
    if metrics["top_k_ambiguity_count"] > max(5, total * 0.05):
        suggested_threshold = max(0.20, suggested_threshold - 0.02)
        reasons.append("High ambiguity between top candidates detected; suggesting tighter threshold.")

    if not reasons:
        reasons.append("Current threshold appears stable based on recent edge-case distributions.")

    logger.info(
        "[recognition-analytics] current_threshold=%s suggested_threshold=%s confidence_variance=%s suspicious_fp_edge_cases=%s",
        current_threshold,
        suggested_threshold,
        metrics["confidence_variance"],
        fp_candidates,
    )

    return {
        "current_threshold": current_threshold,
        "suggested_threshold": round(suggested_threshold, 3),
        "estimated_false_positive_risk_pct": round(fp_risk_est * 100, 2),
        "estimated_false_negative_risk_pct": round(fn_risk_est * 100, 2),
        "fp_edge_case_count": fp_candidates,
        "fn_edge_case_count": fn_candidates,
        "recommendation_reasons": reasons,
    }
