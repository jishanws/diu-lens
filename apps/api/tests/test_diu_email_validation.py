import pytest
from pydantic import ValidationError

from app.api.routes.enroll import EnrollmentRequest


def make_payload(email: str) -> dict:
    return {
        "student_id": "221150001",
        "full_name": "Test Student",
        "phone": "01700000000",
        "university_email": email,
    }


def test_diu_email_validation():
    # 1. Valid @diu.edu.bd
    req = EnrollmentRequest.model_validate(make_payload("name@diu.edu.bd"))
    assert req.university_email == "name@diu.edu.bd"

    # 2. Valid @s.diu.edu.bd
    req = EnrollmentRequest.model_validate(make_payload("student@s.diu.edu.bd"))
    assert req.university_email == "student@s.diu.edu.bd"

    # 3. Uppercase domain
    req = EnrollmentRequest.model_validate(make_payload("NAME@DIU.EDU.BD"))
    assert req.university_email == "NAME@diu.edu.bd"  # normalised domain

    # 4. Surrounding spaces
    req = EnrollmentRequest.model_validate(make_payload("  student@s.diu.edu.bd  "))
    assert req.university_email == "student@s.diu.edu.bd"

    # 5. Gmail rejection
    with pytest.raises(ValidationError) as excinfo:
        EnrollmentRequest.model_validate(make_payload("user@gmail.com"))
    assert "Use your official DIU email address." in str(excinfo.value)

    # 6. diu.edu.bd.example.com rejection
    with pytest.raises(ValidationError) as excinfo:
        EnrollmentRequest.model_validate(make_payload("user@diu.edu.bd.example.com"))
    assert "Use your official DIU email address." in str(excinfo.value)

    # 7. Malformed email rejection
    malformed_emails = [
        "user@@diu.edu.bd",
        "user@diu",
        "@diu.edu.bd",
        "user@",
        "user name@diu.edu.bd",
    ]
    for email in malformed_emails:
        with pytest.raises(ValidationError) as excinfo:
            EnrollmentRequest.model_validate(make_payload(email))
        assert "Use your official DIU email address." in str(excinfo.value)


def test_unsupported_domain_returns_structured_422(client):
    response = client.post("/enroll", json=make_payload("user@gmail.com"))

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["message"] == "Invalid enrollment payload."
    assert body["errors"][0]["loc"] == ["university_email"]
    assert body["errors"][0]["msg"] == "Value error, Use your official DIU email address."
