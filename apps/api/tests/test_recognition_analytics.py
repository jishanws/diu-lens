import pytest
from sqlalchemy.orm import Session
from app.db.models.recognition_audit_logs import RecognitionAuditLog
from app.core.recognition_analytics import (
    get_confidence_distributions,
    get_distance_distributions,
    get_recognition_quality_metrics,
    investigate_false_positives,
    investigate_false_negatives,
    get_threshold_recommendations,
)

def populate_test_logs(db: Session):
    logs = [
        RecognitionAuditLog(
            request_id="req-1",
            searched_by_admin_id=1,
            top_match_student_id="student_1",
            confidence_score=0.9,
            cosine_distance=0.1,
            threshold_used=0.38,
            accepted_match=True,
            top_k_results_json={"top_3": [{"best_distance": 0.1}]},
            image_metadata_json={},
            processing_duration_ms=100.0,
        ),
        RecognitionAuditLog(
            request_id="req-2",
            searched_by_admin_id=1,
            top_match_student_id="student_2",
            confidence_score=0.8,
            cosine_distance=0.2,
            threshold_used=0.38,
            accepted_match=True,
            top_k_results_json={"top_3": [{"best_distance": 0.2}]},
            image_metadata_json={},
            processing_duration_ms=120.0,
        ),
        RecognitionAuditLog(
            request_id="req-3",
            searched_by_admin_id=1,
            top_match_student_id="student_3",
            confidence_score=0.55,
            cosine_distance=0.45,
            threshold_used=0.38,
            accepted_match=False,
            top_k_results_json={"top_3": [{"best_distance": 0.45}]},
            image_metadata_json={},
            processing_duration_ms=110.0,
        ),
        # Edge case False Positive risk: close to 0.38
        RecognitionAuditLog(
            request_id="req-4",
            searched_by_admin_id=1,
            top_match_student_id="student_4",
            confidence_score=0.64,
            cosine_distance=0.36,
            threshold_used=0.38,
            accepted_match=True,
            top_k_results_json={"top_3": [{"best_distance": 0.36}]},
            image_metadata_json={},
            processing_duration_ms=90.0,
        ),
        # Edge case False Negative risk: close to 0.38
        RecognitionAuditLog(
            request_id="req-5",
            searched_by_admin_id=1,
            top_match_student_id="student_5",
            confidence_score=0.6,
            cosine_distance=0.40,
            threshold_used=0.38,
            accepted_match=False,
            top_k_results_json={"top_3": [{"best_distance": 0.40}]},
            image_metadata_json={},
            processing_duration_ms=130.0,
        ),
    ]
    db.add_all(logs)
    db.commit()


def test_get_confidence_distributions(db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)
        dist = get_confidence_distributions(db)
        assert dist["0.5-0.6"] == 1
        assert dist["0.6-0.7"] == 2
        assert dist["0.8-0.9"] == 1
        assert dist["0.9-1.0"] == 1


def test_get_distance_distributions(db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)
        dist = get_distance_distributions(db)
        assert dist["0.1-0.2"] == 1
        assert dist["0.2-0.3"] == 1
        assert dist["0.3-0.4"] == 1
        assert dist["0.4-0.5"] == 2


def test_get_recognition_quality_metrics(db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)
        metrics = get_recognition_quality_metrics(db)
        
        assert metrics["total_requests"] == 5
        assert metrics["acceptance_rate"] == 0.6  # 3/5
        assert metrics["rejection_rate"] == 0.4   # 2/5
        
        # accepted distances: 0.1, 0.2, 0.36 -> avg = 0.22
        assert round(metrics["average_accepted_distance"], 2) == 0.22
        
        # rejected distances: 0.45, 0.40 -> avg = 0.425
        assert round(metrics["average_rejected_distance"], 3) == 0.425


def test_investigate_false_positives(db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)
        fp = investigate_false_positives(db, 0.38)
        assert len(fp) == 1
        assert fp[0]["distance"] == 0.36
        assert fp[0]["student_id"] == "student_4"


def test_investigate_false_negatives(db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)
        fn = investigate_false_negatives(db, 0.38)
        assert len(fn) == 1
        assert fn[0]["distance"] == 0.40
        assert fn[0]["student_id"] == "student_5"


def test_get_threshold_recommendations(db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)
        rec = get_threshold_recommendations(db, 0.38)
        assert rec["current_threshold"] == 0.38
        assert "suggested_threshold" in rec
        assert "fp_edge_case_count" in rec
        assert rec["fp_edge_case_count"] == 1
        assert rec["fn_edge_case_count"] == 1


def test_admin_recognition_analytics_endpoint(client, auth_tokens, db_session_factory):
    with db_session_factory() as db:
        populate_test_logs(db)

    response = client.get(
        "/admin/recognition-analytics",
        headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "confidence_distributions" in data
    assert "distance_distributions" in data
    assert "recommendations" in data
    assert "recent_suspicious_edge_cases" in data
    assert data["metrics"]["total_requests"] == 5