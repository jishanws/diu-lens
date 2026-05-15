import pytest
import time
from sqlalchemy import select
from app.db.models import BiometricTask
from app.core.task_db import (
    create_biometric_task_record,
    mark_task_processing,
    mark_task_completed,
    mark_task_failed,
    increment_retry_count
)

def test_task_lifecycle_transitions(db_session_factory):
    task_id = "test-task-123"
    student_id = "111-22-3333"

    # 1. Queued
    create_biometric_task_record(task_id, student_id)
    with db_session_factory() as db:
        task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
        assert task is not None
        assert task.status == "queued"
        assert task.student_id == student_id

    # 2. Processing
    mark_task_processing(task_id, "worker-node-1")
    with db_session_factory() as db:
        task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
        assert task.status == "processing"
        assert task.worker_hostname == "worker-node-1"
        assert task.started_at is not None

    # 3. Completed
    mark_task_completed(task_id, 1500)
    with db_session_factory() as db:
        task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
        assert task.status == "success"
        assert task.processing_duration_ms == 1500
        assert task.completed_at is not None

def test_task_retries_and_failure(db_session_factory):
    task_id = "test-task-retry-456"
    student_id = "444-55-6666"

    create_biometric_task_record(task_id, student_id)
    
    increment_retry_count(task_id)
    with db_session_factory() as db:
        task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
        assert task.status == "retrying"
        assert task.retry_count == 1

    mark_task_failed(task_id, "Pipeline timeout", 5000)
    with db_session_factory() as db:
        task = db.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
        assert task.status == "failed"
        assert task.error_message == "Pipeline timeout"
        assert task.processing_duration_ms == 5000
        assert task.failed_at is not None

def test_duplicate_task_prevention(db_session_factory):
    task_id = "test-task-dup-789"
    student_id = "777-88-9999"

    create_biometric_task_record(task_id, student_id)
    # Call again - should be idempotent
    create_biometric_task_record(task_id, student_id)

    with db_session_factory() as db:
        tasks = db.scalars(select(BiometricTask).where(BiometricTask.celery_task_id == task_id)).all()
        assert len(tasks) == 1

def test_admin_api_list_tasks(client, auth_tokens, db_session_factory):
    # Create some tasks
    create_biometric_task_record("api-task-1", "999-00-1111")
    create_biometric_task_record("api-task-2", "999-00-2222")

    response = client.get(
        "/admin/biometric-tasks",
        headers={"Authorization": f"Bearer {auth_tokens['admin']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "tasks" in data
    
    task_ids = [t["celery_task_id"] for t in data["tasks"]]
    assert "api-task-1" in task_ids
    assert "api-task-2" in task_ids

    # Test filtering by status
    mark_task_completed("api-task-1", 100)
    response_success = client.get(
        "/admin/biometric-tasks?status=success",
        headers={"Authorization": f"Bearer {auth_tokens['admin']}"}
    )
    assert response_success.status_code == 200
    assert len(response_success.json()["tasks"]) >= 1
    assert all(t["status"] == "success" for t in response_success.json()["tasks"])
