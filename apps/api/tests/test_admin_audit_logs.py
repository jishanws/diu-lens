from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.models import AdminUser, AuditLog, Enrollment, RecognitionAuditLog, Student


def test_admin_audit_logs_endpoint_normalizes_enrollment_and_recognition_events(
    client: TestClient,
    auth_tokens: dict[str, str],
    db_session_factory,
) -> None:
    with db_session_factory() as db:
        admin = db.query(AdminUser).filter(AdminUser.email == "admin@example.com").one()
        student = Student(
            student_id="231-15-9001",
            full_name="Audit Student",
            phone="01700000000",
            university_email="audit@student.diu.edu.bd",
        )
        db.add(student)
        db.flush()
        enrollment = Enrollment(
            student_id=student.student_id,
            status="validated",
            verification_completed=True,
            validation_passed=True,
        )
        db.add(enrollment)
        db.flush()
        db.add(
            AuditLog(
                event_type="enrollment_approved",
                student_id=student.id,
                enrollment_id=enrollment.id,
                message="Enrollment approved by admin review workflow.",
                request_id="req-audit-1",
                correlation_id="corr-audit-1",
            )
        )
        db.add(
            RecognitionAuditLog(
                request_id="req-rec-1",
                searched_by_admin_id=admin.id,
                top_match_student_id=student.student_id,
                confidence_score=92.4,
                cosine_distance=0.21,
                threshold_used=0.38,
                accepted_match=True,
                top_k_results_json={"candidates": []},
                image_metadata_json={"source": "test"},
                processing_duration_ms=84.0,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get(
        "/admin/audit-logs",
        headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    events = payload["events"]

    assert len(events) >= 2
    enrollment_event = next(event for event in events if event["id"].startswith("audit-"))
    assert enrollment_event["action_type"] == "enrollment_approved"
    assert enrollment_event["affected_record"] == "231-15-9001"
    assert enrollment_event["operator_identity"] == "Backend workflow"
    assert enrollment_event["operation_result"] == "success"

    recognition_event = next(event for event in events if event["id"].startswith("recognition-"))
    assert recognition_event["action_type"] == "recognition_search_executed"
    assert recognition_event["affected_record"] == "231-15-9001"
    assert recognition_event["operator_identity"] == "admin@example.com"
    assert recognition_event["operation_result"] == "success"
