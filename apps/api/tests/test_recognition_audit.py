import pytest
import uuid
from sqlalchemy import select
from app.db.models.recognition_audit_logs import RecognitionAuditLog
from app.core.recognition_audit import (
    serialize_match_results,
    create_recognition_audit_log,
    persist_recognition_metrics,
)

def test_serialize_match_results():
    candidates = [
        {"student_id": "1", "matched_angles": {"front", "left"}, "best_distance": 0.1},
        {"student_id": "2", "matched_angles": {"front"}, "best_distance": 0.2},
        {"student_id": "3", "matched_angles": set(), "best_distance": 0.3},
        {"student_id": "4", "matched_angles": {"right"}, "best_distance": 0.4},
    ]
    serialized = serialize_match_results(candidates)
    
    assert "top_3" in serialized
    assert len(serialized["top_3"]) == 3
    assert serialized["top_3"][0]["student_id"] == "1"
    
    # Ensure set is converted to list
    assert isinstance(serialized["top_3"][0]["matched_angles"], list)
    assert "front" in serialized["top_3"][0]["matched_angles"]

def test_audit_persistence(db_session_factory):
    request_id = str(uuid.uuid4())
    
    with db_session_factory() as db:
        create_recognition_audit_log(
            db=db,
            request_id=request_id,
            searched_by_admin_id=1,
            searched_student_id=None,
            top_match_student_id="12345",
            confidence_score=0.85,
            cosine_distance=0.15,
            threshold_used=0.38,
            accepted_match=True,
            top_k_results_json={"top_3": []},
            image_metadata_json={"blur": 0},
            processing_duration_ms=120.5,
        )
    
    with db_session_factory() as db:
        log = db.scalar(select(RecognitionAuditLog).where(RecognitionAuditLog.request_id == request_id))
        assert log is not None
        assert log.searched_by_admin_id == 1
        assert log.top_match_student_id == "12345"
        assert log.confidence_score == 0.85
        assert log.cosine_distance == 0.15
        assert log.threshold_used == 0.38
        assert log.accepted_match is True
        assert log.processing_duration_ms == 120.5
        assert log.recognition_model_version == "v1"

def test_logging_failure_isolation(monkeypatch):
    # Mock create_recognition_audit_log to raise an exception
    import app.core.recognition_audit as module
    
    def mock_create(*args, **kwargs):
        raise Exception("Database error")
        
    monkeypatch.setattr(module, "create_recognition_audit_log", mock_create)
    
    # Should not raise exception
    persist_recognition_metrics(
        request_id="test-123",
        searched_by_admin_id=None,
        searched_student_id=None,
        match_result={"candidates": [], "match_found": False, "threshold_used": 0.38},
        processing_duration_ms=100.0,
    )
