from __future__ import annotations

import json

import cv2
import numpy as np
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.routes import enroll
from app.core import image_validation
from app.db.models import Enrollment


REQUIRED_ANGLES = ("front", "left", "right", "up", "down")


def _jpeg_bytes(*, brightness: int = 128, pattern: bool = True) -> bytes:
    image = np.full((480, 640, 3), brightness, dtype=np.uint8)
    if pattern:
        for y in range(0, 480, 16):
            color = 255 if (y // 16) % 2 == 0 else 40
            image[y : y + 8, :, :] = color
        cv2.rectangle(image, (220, 120), (420, 360), (230, 230, 230), -1)
        cv2.circle(image, (280, 210), 12, (20, 20, 20), -1)
        cv2.circle(image, (360, 210), 12, (20, 20, 20), -1)
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    return encoded.tobytes()


def _face(*, yaw: float = 0.0, pitch: float = 0.0, score: float = 0.92) -> dict[str, object]:
    return {
        "bbox": [220.0, 120.0, 420.0, 360.0],
        "det_score": score,
        "yaw": yaw,
        "pitch": pitch,
        "roll": 0.0,
        "landmarks": np.array([[280.0, 210.0], [360.0, 210.0]], dtype=float),
    }


def _basic_payload(student_id: str) -> dict[str, str]:
    return {
        "student_id": student_id,
        "full_name": "Enrollment Test Student",
        "phone": "01700000000",
        "university_email": f"{student_id.replace('-', '')}@diu.edu.bd",
    }


def _verification_metadata(student_id: str) -> dict[str, object]:
    return {
        **_basic_payload(student_id),
        "liveness_passed": True,
        "verification_completed": True,
        "total_required_shots": 10,
        "total_accepted_shots": 10,
        "angles": [
            {"angle": angle, "accepted_shots": 2, "required_shots": 2}
            for angle in REQUIRED_ANGLES
        ],
        "frame_metadata_by_angle": [
            {
                "angle": angle,
                "frames": [
                    {"captured_at": 1710000000000 + index, "capture_latency_ms": 400}
                    for index in range(2)
                ],
            }
            for angle in REQUIRED_ANGLES
        ],
    }


def _verification_files(
    metadata: dict[str, object],
    *,
    missing: tuple[str, int] | None = None,
) -> list[tuple[str, tuple[object, ...]]]:
    files: list[tuple[str, tuple[object, ...]]] = [
        ("metadata", (None, json.dumps(metadata), "application/json"))
    ]
    for angle in REQUIRED_ANGLES:
        for index in range(2):
            if missing == (angle, index):
                continue
            files.append(
                (
                    angle,
                    (f"{angle}_{index + 1}.jpg", _jpeg_bytes(), "image/jpeg"),
                )
            )
    return files


def _passing_validation_report(
    image_bytes: bytes,
    file_name: str,
    angle: str,
) -> dict[str, object]:
    index = int(file_name.rsplit("_", 1)[-1].split(".", 1)[0])
    hash_seed = REQUIRED_ANGLES.index(angle) * 2 + index
    return {
        "file_name": file_name,
        "angle": angle,
        "image_size_bytes": len(image_bytes),
        "readable": True,
        "decoded_shape": [480, 640, 3],
        "passed": True,
        "is_blocking_failure": False,
        "blocking_reasons": [],
        "non_blocking_reasons": [],
        "failure_reasons": [],
        "blocker": "ready",
        "blur_ok": True,
        "brightness_ok": True,
        "dimensions_ok": True,
        "face_detected": True,
        "face_centered": True,
        "eyes_visible": "passed",
        "quality_score": 90.0,
        "perceptual_hash": f"{(hash_seed * 0x9E3779B97F4A7C15) & ((1 << 64) - 1):016x}",
    }


def _create_pending_enrollment(client, student_id: str) -> None:
    response = client.post("/enroll", json=_basic_payload(student_id))
    assert response.status_code == 200, response.text
    assert response.json()["success"] is True


def _post_verification(client, student_id: str, *, missing=None):
    return client.post(
        "/enroll/verification",
        files=_verification_files(
            _verification_metadata(student_id),
            missing=missing,
        ),
    )


def test_wrong_pose_rejected(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face(yaw=0, pitch=0)])

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "left.jpg", "left")

    assert report["passed"] is False
    assert report["blocker"] == "wrong_pose"


def test_front_pose_not_accepted_as_left_or_right(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face(yaw=0, pitch=0)])

    left = image_validation.validate_enrollment_image(_jpeg_bytes(), "left.jpg", "left")
    right = image_validation.validate_enrollment_image(_jpeg_bytes(), "right.jpg", "right")

    assert left["passed"] is False
    assert right["passed"] is False
    assert left["blocker"] == "wrong_pose"
    assert right["blocker"] == "wrong_pose"


def test_practical_left_pose_threshold_is_accepted(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face(yaw=12, pitch=14)])

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "left.jpg", "left")

    assert report["passed"] is True
    assert report["blocker"] == "ready"


def test_neutral_pose_still_rejected_for_directional_angles(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face(yaw=0, pitch=0)])

    up = image_validation.validate_enrollment_image(_jpeg_bytes(), "up.jpg", "up")
    down = image_validation.validate_enrollment_image(_jpeg_bytes(), "down.jpg", "down")

    assert up["passed"] is False
    assert down["passed"] is False
    assert up["blocker"] == "wrong_pose"
    assert down["blocker"] == "wrong_pose"


def test_blurry_image_rejected(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face()])

    report = image_validation.validate_enrollment_image(_jpeg_bytes(pattern=False), "front.jpg", "front")

    assert report["passed"] is False
    assert report["blocker"] == "image_blurry"


def test_dark_image_rejected(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face()])

    report = image_validation.validate_enrollment_image(
        _jpeg_bytes(brightness=20, pattern=False),
        "front.jpg",
        "front",
    )

    assert report["passed"] is False
    assert any(str(reason).startswith("invalid_brightness") for reason in report["failure_reasons"])


def test_multiple_faces_rejected(monkeypatch) -> None:
    monkeypatch.setattr(
        image_validation,
        "_detect_faces_for_enrollment",
        lambda image: [_face(), {**_face(), "bbox": [30.0, 100.0, 160.0, 260.0]}],
    )

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "front.jpg", "front")

    assert report["passed"] is False
    assert report["blocker"] == "multiple_faces_detected"


def test_no_face_rejected(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [])

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "front.jpg", "front")

    assert report["passed"] is False
    assert report["blocker"] == "face_not_detected"


def test_valid_capture_structure_requires_exactly_10_samples() -> None:
    assert enroll.EXPECTED_REQUIRED_ANGLES == ("front", "left", "right", "up", "down")
    assert enroll.REQUIRED_IMAGES_PER_ANGLE == 2
    assert enroll.EXPECTED_TOTAL_SHOTS == 10


def test_valid_10_image_multipart_submission_succeeds(client, monkeypatch) -> None:
    student_id = "930-26-2010"
    _create_pending_enrollment(client, student_id)
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)

    response = _post_verification(client, student_id)

    assert response.status_code == 200, response.text
    assert response.json() == {
        "success": True,
        "message": "Verification images uploaded successfully",
    }


def test_9_image_payload_returns_422(client, monkeypatch) -> None:
    student_id = "930-26-2011"
    _create_pending_enrollment(client, student_id)
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)

    response = _post_verification(client, student_id, missing=("down", 1))

    assert response.status_code == 422
    assert response.json()["error"] == "ENROLLMENT_PAYLOAD_INVALID"


def test_wrong_angle_count_returns_422(client, monkeypatch) -> None:
    student_id = "930-26-2012"
    _create_pending_enrollment(client, student_id)
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)
    metadata = _verification_metadata(student_id)
    metadata["angles"] = [
        {
            "angle": angle,
            "accepted_shots": 1 if angle == "left" else 2,
            "required_shots": 2,
        }
        for angle in REQUIRED_ANGLES
    ]

    response = client.post(
        "/enroll/verification",
        files=_verification_files(metadata),
    )

    assert response.status_code == 422
    assert response.json()["error"] == "ENROLLMENT_PAYLOAD_INVALID"


def test_image_validation_failure_returns_structured_422(client, monkeypatch) -> None:
    student_id = "930-26-2013"
    _create_pending_enrollment(client, student_id)

    def fail_left(image_bytes: bytes, file_name: str, angle: str):
        report = _passing_validation_report(image_bytes, file_name, angle)
        if angle == "left" and file_name == "left_1.jpg":
            report.update(
                passed=False,
                is_blocking_failure=True,
                failure_reasons=["face_not_detected"],
                blocker="face_not_detected",
            )
        return report

    monkeypatch.setattr(enroll, "validate_enrollment_image", fail_left)

    response = _post_verification(client, student_id)

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"] == "BACKEND_IMAGE_VALIDATION_FAILED"
    assert payload["details"][0]["angle"] == "left"
    assert payload["details"][0]["index"] == 1
    assert payload["details"][0]["reason"] == "face_not_detected"


def test_face_processor_failure_returns_503(client, monkeypatch) -> None:
    student_id = "930-26-2014"
    _create_pending_enrollment(client, student_id)

    def unavailable(*args, **kwargs):
        raise RuntimeError("model unavailable")

    monkeypatch.setattr(enroll, "validate_enrollment_image", unavailable)

    response = _post_verification(client, student_id)

    assert response.status_code == 503
    assert response.json()["error"] == "FACE_PROCESSOR_UNAVAILABLE"


def test_storage_failure_returns_503(client, monkeypatch) -> None:
    student_id = "930-26-2015"
    _create_pending_enrollment(client, student_id)
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)

    async def storage_unavailable(*args, **kwargs):
        raise OSError("storage unavailable")

    monkeypatch.setattr(enroll, "save_uploaded_images", storage_unavailable)

    response = _post_verification(client, student_id)

    assert response.status_code == 503
    assert response.json()["error"] == "STORAGE_UNAVAILABLE"


def test_database_failure_returns_503(client, monkeypatch) -> None:
    student_id = "930-26-2016"
    _create_pending_enrollment(client, student_id)
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)

    def database_unavailable(*args, **kwargs):
        raise enroll.EnrollmentPersistenceError("database unavailable")

    monkeypatch.setattr(enroll, "_persist_enrollment_metadata", database_unavailable)

    response = _post_verification(client, student_id)

    assert response.status_code == 503
    assert response.json()["error"] == "DATABASE_UNAVAILABLE"


def test_existing_approved_enrollment_returns_409(
    client,
    db_session_factory,
    monkeypatch,
) -> None:
    student_id = "930-26-2017"
    _create_pending_enrollment(client, student_id)
    with db_session_factory() as db:
        enrollment = db.query(Enrollment).filter_by(student_id=student_id).one()
        enrollment.status = "approved"
        db.commit()
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)

    response = _post_verification(client, student_id)

    assert response.status_code == 409
    assert response.json()["error"] == "ENROLLMENT_ALREADY_EXISTS"


def test_unexpected_verification_failure_returns_controlled_500(client, monkeypatch) -> None:
    async def unexpected(*args, **kwargs):
        raise TypeError("unexpected failure")

    monkeypatch.setattr(enroll, "_handle_multipart_enrollment", unexpected)

    response = client.post(
        "/enroll/verification",
        files={"metadata": (None, "{}", "application/json")},
    )

    assert response.status_code == 500
    payload = response.json()
    assert payload["error"] == "ENROLLMENT_SUBMIT_FAILED"
    assert "unexpectedly" in payload["message"]


def _request_with_headers(headers: list[tuple[bytes, bytes]]) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/enroll/verification",
            "headers": headers,
        }
    )


def test_verification_allows_configured_frontend_origin() -> None:
    request = _request_with_headers(
        [(b"origin", b"https://www.diulens.app"), (b"sec-fetch-site", b"same-site")]
    )

    enroll._validate_verification_request_origin(request)


def test_verification_rejects_cross_site_origin() -> None:
    request = _request_with_headers(
        [(b"origin", b"https://example.com"), (b"sec-fetch-site", b"cross-site")]
    )

    with pytest.raises(HTTPException) as exc_info:
        enroll._validate_verification_request_origin(request)

    assert exc_info.value.status_code == 403


def test_verification_endpoint_preserves_origin_error_status(client) -> None:
    response = client.post(
        "/enroll/verification",
        headers={
            "Origin": "https://example.com",
            "Sec-Fetch-Site": "cross-site",
        },
        files={"metadata": (None, "{}")},
    )

    assert response.status_code == 403
    assert "origin" in response.text.lower() or "cross-site" in response.text.lower()


def test_quality_score_and_phash_are_reported(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face()])

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "front.jpg", "front")

    assert report["quality_score"] is not None
    assert 0 <= float(report["quality_score"]) <= 100
    assert isinstance(report["perceptual_hash"], str)
    assert image_validation.phash_distance(report["perceptual_hash"], report["perceptual_hash"]) == 0


def test_calibration_mode_does_not_persist_enrollment(
    client,
    db_session_factory,
    monkeypatch,
) -> None:
    def fake_validate(image_bytes: bytes, file_name: str, angle: str):
        return {
            "file_name": file_name,
            "angle": angle,
            "passed": True,
            "failure_reasons": [],
            "quality_score": 88.0,
            "perceptual_hash": "0f0f0f0f0f0f0f0f",
        }

    monkeypatch.setattr(enroll, "validate_enrollment_image", fake_validate)

    response = client.post(
        "/enroll/calibration",
        data={"angle": "front"},
        files={"images": ("sample.jpg", _jpeg_bytes(), "image/jpeg")},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["persisted"] is False
    assert payload["summary"]["total_samples"] == 1
    with db_session_factory() as db:
        assert db.query(Enrollment).count() == 0
