import pytest
import uuid
from fastapi import Request
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.tracing import (
    get_current_request_id,
    get_current_task_id,
    set_trace_context,
    clear_trace_context,
    request_id_ctx,
    correlation_id_ctx,
)
from app.core.middleware import TracingMiddleware
from app.core.incident_timeline import reconstruct_incident_timeline, snapshot_failure
from app.db.models import BiometricTask, AuditLog, RecognitionAuditLog

@pytest.fixture
def clean_tracing():
    clear_trace_context()
    yield
    clear_trace_context()

def test_tracing_context_variables(clean_tracing):
    req_id = "test-req-1"
    corr_id = "test-corr-1"
    set_trace_context(request_id=req_id, correlation_id=corr_id)
    
    assert get_current_request_id() == req_id
    assert request_id_ctx.get() == req_id
    assert correlation_id_ctx.get() == corr_id

def test_tracing_middleware(clean_tracing):
    async def mock_call_next(request: Request):
        return JSONResponse({"status": "ok"})
    
    middleware = TracingMiddleware(app=None)
    scope = {
        "type": "http",
        "method": "GET",
        "headers": [(b"x-request-id", b"custom-req-id")],
    }
    request = Request(scope)
    
    import asyncio
    response = asyncio.run(middleware.dispatch(request, mock_call_next))
    
    assert response.headers.get("X-Request-ID") == "custom-req-id"

def test_incident_reconstruction(db_session_factory, clean_tracing):
    req_id = str(uuid.uuid4())
    
    with db_session_factory() as db:
        # Mock records
        task = BiometricTask(
            celery_task_id="task-1",
            request_id=req_id,
            correlation_id=req_id,
            student_id="student-1",
            task_type="test",
            status="queued"
        )
        db.add(task)
        
        audit = AuditLog(
            request_id=req_id,
            correlation_id=req_id,
            event_type="test_event",
            message="Test message",
        )
        db.add(audit)
        
        rec = RecognitionAuditLog(
            request_id=req_id,
            accepted_match=True,
            top_k_results_json={},
            image_metadata_json={},
        )
        db.add(rec)
        db.commit()
        
        timeline = reconstruct_incident_timeline(db, req_id)
        
        assert timeline["request_id"] == req_id
        assert len(timeline["biometric_tasks"]) == 1
        assert timeline["biometric_tasks"][0]["task_id"] == "task-1"
        assert len(timeline["audit_events"]) == 1
        assert len(timeline["recognition_events"]) == 1

def test_failure_snapshot(db_session_factory, clean_tracing):
    req_id = "test-fail-1"
    set_trace_context(request_id=req_id)
    
    with db_session_factory() as db:
        try:
            raise ValueError("Test error")
        except Exception as e:
            snapshot = snapshot_failure(db, e)
            assert snapshot is not None
            assert snapshot.request_id == req_id
            assert "ValueError" in snapshot.request_metadata["error_type"]
            assert "Test error" in snapshot.traceback_summary