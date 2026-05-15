import pytest
from datetime import datetime, timezone, timedelta
from app.db.models import BiometricTask, Enrollment, Student
from app.core.task_db import create_biometric_task_record, mark_task_processing
from app.core.enrollment_db import (
    EnrollmentRecordInput,
    persist_enrollment_to_db,
    approve_enrollment_by_student_id,
    mark_enrollment_as_processing
)
from app.core.task_recovery import recover_zombie_tasks
from sqlalchemy import select

def test_recover_zombie_tasks(db_session_factory, monkeypatch):
    monkeypatch.setattr("app.core.task_recovery.get_session_factory", lambda: db_session_factory)
    monkeypatch.setattr("app.core.task_db.get_session_factory", lambda: db_session_factory)
    monkeypatch.setattr("app.core.enrollment_db.get_session_factory", lambda: db_session_factory)
    db_session = db_session_factory()
    # Setup test data
    student_id = "zombie-test-id"
    payload = EnrollmentRecordInput(
        student_id=student_id,
        full_name="Zombie Test",
        phone="+1234567890",
        university_email="zombie@example.com",
        status="validated",
        verification_completed=True,
        total_required_shots=3,
        total_accepted_shots=3,
        validation_passed=True,
        uploaded_images={"center": ["fake.jpg"]},
        frame_metadata_by_path={},
        event_type="enrollment_completed",
        event_message="Enrolled",
        mode="final",
    )
    
    # 1. Create enrollment
    persist_enrollment_to_db(payload)
    
    # 2. Directly set state to bypass validation logic in tests
    enrollment = db_session.scalar(select(Enrollment).where(Enrollment.student_id == student_id))
    enrollment.status = "processing"
    db_session.commit()
    
    assert enrollment.status == "processing"
    
    # 3. Create a biometric task that is 'stuck' in processing
    task_id = "zombie-task-123"
    create_biometric_task_record(task_id, student_id)
    mark_task_processing(task_id, "test-worker")
    
    # Manually backdate the task's started_at to 20 minutes ago
    task = db_session.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
    task.started_at = datetime.now(timezone.utc) - timedelta(minutes=20)
    db_session.commit()
    
    # 4. Run recovery
    recovered_count = recover_zombie_tasks(timeout_minutes=15)
    assert recovered_count == 1
    
    # 5. Verify the task was marked as failed
    db_session.refresh(task)
    assert task.status == "failed"
    assert "Zombie task recovered" in task.error_message
    
    # 6. Verify the enrollment was marked as failed_processing
    db_session.refresh(enrollment)
    assert enrollment.status == "failed_processing"

def test_recover_zombie_tasks_ignores_recent(db_session_factory):
    db_session = db_session_factory()
    student_id = "fresh-test-id"
    payload = EnrollmentRecordInput(
        student_id=student_id,
        full_name="Fresh Test",
        phone="+1234567890",
        university_email="fresh@example.com",
        status="validated",
        verification_completed=True,
        total_required_shots=3,
        total_accepted_shots=3,
        validation_passed=True,
        uploaded_images={"center": ["fake.jpg"]},
        frame_metadata_by_path={},
        event_type="enrollment_completed",
        event_message="Enrolled",
        mode="final",
    )
    persist_enrollment_to_db(payload)
    
    enrollment = db_session.scalar(select(Enrollment).where(Enrollment.student_id == student_id))
    enrollment.status = "processing"
    db_session.commit()
    
    task_id = "fresh-task-123"
    create_biometric_task_record(task_id, student_id)
    mark_task_processing(task_id, "test-worker")
    
    # Started recently (default is now)
    
    recovered_count = recover_zombie_tasks(timeout_minutes=15)
    assert recovered_count == 0
    
    task = db_session.scalar(select(BiometricTask).where(BiometricTask.celery_task_id == task_id))
    assert task.status == "processing"
