import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.db.models import BiometricTask, RecognitionAuditLog
from app.core.health_intelligence import gather_system_diagnostics, run_and_persist_health_check

def populate_test_tasks(db: Session, count: int, status: str, retry: int = 0, mins_ago: int = 5):
    now = datetime.now(timezone.utc)
    for i in range(count):
        task = BiometricTask(
            celery_task_id=f"test-task-{status}-{i}-{mins_ago}",
            student_id=f"student-{i}",
            task_type="enrollment_processing",
            status=status,
            retry_count=retry,
            created_at=now - timedelta(minutes=mins_ago),
            started_at=now - timedelta(minutes=mins_ago) if status == "processing" else None,
            processing_duration_ms=100.0 if status == "success" else None,
        )
        db.add(task)
    db.commit()


def test_healthy_diagnostics(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 2)
    
    with db_session_factory() as db:
        populate_test_tasks(db, count=5, status="success")
        
        diagnostics = gather_system_diagnostics(db)
        assert diagnostics["overall_status"] == "healthy"
        assert diagnostics["queue_depth"] == 0
        assert diagnostics["active_workers"] == 2
        assert len(diagnostics["critical_events"]) == 0


def test_degraded_queue_backlog(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 2)
    
    with db_session_factory() as db:
        populate_test_tasks(db, count=55, status="queued")
        
        diagnostics = gather_system_diagnostics(db)
        assert diagnostics["overall_status"] == "degraded"
        assert diagnostics["queue_depth"] == 55
        assert "queue" in diagnostics["degraded_components"]


def test_degraded_redis_failure(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: False)
    
    with db_session_factory() as db:
        diagnostics = gather_system_diagnostics(db)
        assert diagnostics["overall_status"] == "degraded"
        assert "redis" in diagnostics["degraded_components"]


def test_degraded_no_workers_with_tasks(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 0)
    
    with db_session_factory() as db:
        populate_test_tasks(db, count=1, status="queued")
        
        diagnostics = gather_system_diagnostics(db)
        assert diagnostics["overall_status"] == "degraded"
        assert "celery_workers" in diagnostics["degraded_components"]


def test_stuck_processing_task(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 2)
    
    with db_session_factory() as db:
        # Stuck task (processing for 20 mins)
        populate_test_tasks(db, count=1, status="processing", mins_ago=20)
        
        diagnostics = gather_system_diagnostics(db)
        assert diagnostics["overall_status"] == "degraded"
        assert diagnostics["stuck_tasks"] == 1
        assert "processing" in diagnostics["degraded_components"]


def test_retry_spike_detection(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 2)
    
    with db_session_factory() as db:
        # 5 tasks, each retried 3 times -> retry_rate = 3.0
        populate_test_tasks(db, count=5, status="queued", retry=3)
        
        diagnostics = gather_system_diagnostics(db)
        assert diagnostics["overall_status"] == "degraded"
        assert diagnostics["retry_rate"] == 3.0
        assert "tasks" in diagnostics["degraded_components"]


def test_snapshot_persistence(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 2)
    
    with db_session_factory() as db:
        snapshot = run_and_persist_health_check(db)
        assert snapshot.id is not None
        assert snapshot.overall_status == "healthy"


def test_admin_system_health_endpoint(client, auth_tokens, db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.health_intelligence.check_redis_health", lambda: True)
    monkeypatch.setattr("app.core.health_intelligence.get_active_workers", lambda: 2)

    with db_session_factory() as db:
        run_and_persist_health_check(db)

    response = client.get(
        "/admin/system-health",
        headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["current_status"] == "healthy"
    assert "queue_depth" in data
    assert "active_workers" in data
