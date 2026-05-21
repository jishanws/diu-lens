"""Tests for POST /enroll/validate-id."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker, Session

from app.db.models import Student, Enrollment


def _seed_student(db_session_factory: sessionmaker[Session], student_id: str) -> None:
    """Insert a Student + active Enrollment row to simulate an already-enrolled student."""
    with db_session_factory() as db:
        student = Student(
            student_id=student_id,
            full_name="Test Student",
            phone="01700000000",
            university_email="test@diu.edu.bd",
        )
        db.add(student)
        db.flush()
        enrollment = Enrollment(
            student_id=student_id,
            status="pending",
            verification_completed=False,
            total_required_shots=0,
            total_accepted_shots=0,
            validation_passed=False,
        )
        db.add(enrollment)
        db.commit()


class TestValidateStudentId:
    """POST /enroll/validate-id"""

    def test_valid_format_not_enrolled_returns_valid(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "221-15-0001"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["reason"] is None

    def test_invalid_format_too_short_returns_invalid_format(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "221-15"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["reason"] == "invalid_format"

    def test_invalid_format_no_dashes_returns_invalid_format(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "221150001"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["reason"] == "invalid_format"

    def test_empty_student_id_returns_invalid_format(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": ""},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["reason"] == "invalid_format"

    def test_whitespace_only_returns_invalid_format(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "   "},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["reason"] == "invalid_format"

    def test_already_enrolled_student_returns_already_registered(
        self, client: TestClient, db_session_factory: sessionmaker[Session]
    ) -> None:
        _seed_student(db_session_factory, "221-15-9999")

        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "221-15-9999"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["reason"] == "already_registered"

    def test_valid_id_with_leading_trailing_whitespace_is_normalised(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "  221-15-0002  "},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_missing_student_id_field_returns_422(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/enroll/validate-id",
            json={},
        )
        assert response.status_code == 422

    def test_no_data_written_to_db_for_valid_id(
        self, client: TestClient, db_session_factory: sessionmaker[Session]
    ) -> None:
        """Endpoint must be read-only — no Student or Enrollment rows created."""
        response = client.post(
            "/enroll/validate-id",
            json={"student_id": "999-99-0000"},
        )
        assert response.status_code == 200
        assert response.json()["valid"] is True

        with db_session_factory() as db:
            from sqlalchemy import select
            student = db.scalar(select(Student).where(Student.student_id == "999-99-0000"))
            assert student is None, "validate-id must not write any Student rows"
