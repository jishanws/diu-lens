from __future__ import annotations

import json
import os
import subprocess
import sys
from types import SimpleNamespace

import cv2
import numpy as np
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.routes import enroll
from app.core import image_validation
from app.db.models import Enrollment


REQUIRED_ANGLES = ("front", "left", "right", "up", "down")


def _jpeg_bytes(
    *,
    brightness: int = 128,
    pattern: bool = True,
    blur_kernel: int | None = None,
    jpeg_quality: int = 95,
) -> bytes:
    image = np.full((480, 640, 3), brightness, dtype=np.uint8)
    if pattern:
        for y in range(0, 480, 16):
            color = 255 if (y // 16) % 2 == 0 else 40
            image[y : y + 8, :, :] = color
        cv2.rectangle(image, (220, 120), (420, 360), (160, 160, 160), -1)
        cv2.circle(image, (280, 210), 12, (20, 20, 20), -1)
        cv2.circle(image, (360, 210), 12, (20, 20, 20), -1)
    if blur_kernel is not None:
        image = cv2.GaussianBlur(image, (blur_kernel, blur_kernel), 0)
    ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
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
                    (
                        f"{angle}_{index + 1}.jpg",
                        _jpeg_bytes(
                            brightness=110 + REQUIRED_ANGLES.index(angle) * 5 + index
                        ),
                        "image/jpeg",
                    ),
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
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face(yaw=-12, pitch=14)])

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


@pytest.mark.parametrize("score", [45.0, 42.0, 35.0])
def test_recalibrated_sharpness_scores_pass(score: float) -> None:
    assert image_validation.classify_sharpness(score, 35.0) == "acceptable"


def test_score_just_below_sharpness_threshold_fails() -> None:
    assert image_validation.classify_sharpness(34.99, 35.0) == "blurry"


def test_real_encoded_ordinary_device_image_passes(monkeypatch) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face()])

    report = image_validation.validate_enrollment_image(
        _jpeg_bytes(blur_kernel=9, jpeg_quality=75),
        "front.jpg",
        "front",
    )

    assert 35.0 <= float(report["blur_score"]) < 60.0
    assert report["blur_ok"] is True
    assert report["sharpness_level"] == "acceptable"


@pytest.mark.parametrize(
    ("kernel", "expected_level"),
    [(11, "blurry"), (21, "severely_blurry")],
)
def test_real_encoded_blurry_images_fail(monkeypatch, kernel: int, expected_level: str) -> None:
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face()])

    report = image_validation.validate_enrollment_image(
        _jpeg_bytes(blur_kernel=kernel, jpeg_quality=75),
        "front.jpg",
        "front",
    )

    assert report["passed"] is False
    assert report["blocker"] == "image_blurry"
    assert report["sharpness_level"] == expected_level


def test_sharpness_failure_preserves_exact_measurement(monkeypatch) -> None:
    class FixedLaplacian:
        def var(self) -> float:
            return 34.99

    monkeypatch.setattr(cv2, "Laplacian", lambda *_args, **_kwargs: FixedLaplacian())
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda image: [_face()])

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "front.jpg", "front")

    assert report["blur_score"] == 34.99
    assert "image_blurry(score:34.99,min:35.00)" in report["failure_reasons"]


def test_sharpness_environment_override_is_respected() -> None:
    environment = {**os.environ, "ENROLLMENT_MIN_BLUR_VARIANCE": "39.5"}
    result = subprocess.run(
        [sys.executable, "-c", "from app.core.config import settings; print(settings.enrollment_min_blur_variance)"],
        check=True,
        capture_output=True,
        text=True,
        env=environment,
    )

    assert result.stdout.strip() == "39.5"


def test_pose_environment_override_is_respected() -> None:
    environment = {**os.environ, "ENROLLMENT_POSE_UP": "-36,36,7,42"}
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from app.core.enrollment_validation_config import "
            "ENROLLMENT_VALIDATION_CONFIG as c; print(c.pose_thresholds['up'])",
        ],
        check=True,
        capture_output=True,
        text=True,
        env=environment,
    )

    assert result.stdout.strip() == (
        "PoseThreshold(yaw_min=-36.0, yaw_max=36.0, "
        "pitch_min=7.0, pitch_max=42.0)"
    )


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


def test_enrollment_detector_reuses_shared_insightface_analyzer(monkeypatch) -> None:
    from app.core import face_pipeline

    analyzer = object()
    monkeypatch.setattr(image_validation, "_INSIGHTFACE_ANALYZER", None)
    monkeypatch.setattr(image_validation, "_INSIGHTFACE_INIT_FAILED", False)
    monkeypatch.setattr(face_pipeline, "_load_analyzer", lambda: analyzer)

    assert image_validation._try_load_insightface_analyzer() is analyzer


def test_low_confidence_false_positive_is_ignored(monkeypatch) -> None:
    faces = [
        SimpleNamespace(
            bbox=np.array([220, 120, 420, 360]),
            det_score=0.92,
            pose=np.array([0.0, 0.0, 0.0]),
            kps=np.array([[280, 210], [360, 210]]),
        ),
        SimpleNamespace(
            bbox=np.array([20, 20, 100, 100]),
            det_score=0.30,
            pose=np.array([0.0, 0.0, 0.0]),
            kps=np.array([[40, 40], [70, 40]]),
        ),
    ]
    monkeypatch.setattr(
        image_validation,
        "_try_load_insightface_analyzer",
        lambda: SimpleNamespace(get=lambda _image: faces),
    )

    detected = image_validation._detect_faces_for_enrollment(
        np.zeros((480, 640, 3), dtype=np.uint8)
    )

    assert len(detected) == 1
    assert detected[0]["det_score"] == pytest.approx(0.92)


def test_detector_box_iou_is_calculated_without_suppressing_faces() -> None:
    assert image_validation._bbox_iou(
        [100.0, 100.0, 300.0, 300.0],
        [110.0, 110.0, 290.0, 290.0],
    ) == pytest.approx(0.81)
    assert image_validation._bbox_iou(
        [10.0, 10.0, 100.0, 100.0],
        [200.0, 200.0, 300.0, 300.0],
    ) == 0.0


def test_two_distinct_high_confidence_faces_still_fail(monkeypatch) -> None:
    monkeypatch.setattr(
        image_validation,
        "_detect_faces_for_enrollment",
        lambda _image: [
            _face(),
            {**_face(score=0.88), "bbox": [30.0, 100.0, 180.0, 300.0]},
        ],
    )

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "front.jpg", "front")

    assert report["passed"] is False
    assert report["face_count"] == 2
    assert report["blocker"] == "multiple_faces_detected"


def test_pose_estimation_failure_is_not_reported_as_neutral_pose(monkeypatch) -> None:
    monkeypatch.setattr(
        image_validation,
        "_detect_faces_for_enrollment",
        lambda _image: [{**_face(), "yaw": None, "pitch": None, "roll": None}],
    )

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "up.jpg", "up")

    assert report["yaw"] is None
    assert report["pitch"] is None
    assert "pose_estimation_failed(angle:up)" in report["failure_reasons"]
    assert not any(str(reason).startswith("wrong_pose") for reason in report["failure_reasons"])


@pytest.mark.parametrize(
    ("width", "height", "bbox"),
    [
        (640, 480, [160.0, 120.0, 352.0, 264.0]),
        (480, 640, [120.0, 160.0, 264.0, 352.0]),
    ],
)
def test_face_coverage_uses_decoded_image_coordinates(
    monkeypatch, width: int, height: int, bbox: list[float]
) -> None:
    image = np.full((height, width, 3), 128, dtype=np.uint8)
    for y in range(0, height, 16):
        image[y : y + 8] = 220 if (y // 16) % 2 == 0 else 40
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    monkeypatch.setattr(
        image_validation,
        "_detect_faces_for_enrollment",
        lambda _image: [{**_face(), "bbox": bbox}],
    )

    report = image_validation.validate_enrollment_image(
        encoded.tobytes(), "front.jpg", "front"
    )

    assert report["decoded_shape"][:2] == [height, width]
    assert report["face_area_ratio"] == pytest.approx(0.09)


def test_reported_small_face_ratio_uses_box_area_over_full_image(monkeypatch) -> None:
    monkeypatch.setattr(
        image_validation,
        "_detect_faces_for_enrollment",
        lambda _image: [{**_face(), "bbox": [200.0, 120.0, 296.0, 264.0]}],
    )

    report = image_validation.validate_enrollment_image(_jpeg_bytes(), "right.jpg", "right")

    assert report["face_area_ratio"] == pytest.approx(0.045)
    assert "face_too_small(ratio:0.045,min:0.090)" in report["failure_reasons"]


def test_face_region_brightness_ignores_dark_background(monkeypatch) -> None:
    image = np.full((480, 640, 3), 20, dtype=np.uint8)
    for y in range(120, 360, 12):
        image[y : y + 6, 220:420] = 180
        image[y + 6 : y + 12, 220:420] = 90
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda _image: [_face()])

    report = image_validation.validate_enrollment_image(
        encoded.tobytes(), "front.jpg", "front"
    )

    assert report["full_frame_brightness_score"] < 70
    assert 70 <= report["brightness_score"] <= 200
    assert report["brightness_region"] == "face_box"
    assert report["brightness_ok"] is True


def test_overexposed_face_region_fails_brightness(monkeypatch) -> None:
    image = np.full((480, 640, 3), 128, dtype=np.uint8)
    image[120:360, 220:420] = 250
    cv2.circle(image, (280, 210), 6, (230, 230, 230), -1)
    cv2.circle(image, (360, 210), 6, (230, 230, 230), -1)
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    monkeypatch.setattr(image_validation, "_detect_faces_for_enrollment", lambda _image: [_face()])

    report = image_validation.validate_enrollment_image(
        encoded.tobytes(), "front.jpg", "front"
    )

    assert report["brightness_score"] > 200
    assert report["brightness_ok"] is False
    assert any(str(reason).startswith("invalid_brightness") for reason in report["failure_reasons"])


def test_backend_pose_signs_map_left_and_right_without_mirroring() -> None:
    assert image_validation._pose_matches("left", -12.0, 0.0) is True
    assert image_validation._pose_matches("right", 12.0, 0.0) is True
    assert image_validation._pose_matches("left", 12.0, 0.0) is False
    assert image_validation._pose_matches("right", -12.0, 0.0) is False


@pytest.mark.parametrize(
    ("angle", "yaw", "pitch"),
    [
        ("up", -31.62, 12.02),
        ("up", -15.95, 14.73),
        ("down", -0.53, -9.55),
        ("down", -0.51, -8.97),
    ],
)
def test_real_vertical_pose_measurements_pass(angle: str, yaw: float, pitch: float) -> None:
    assert image_validation._pose_matches(angle, yaw, pitch) is True


@pytest.mark.parametrize(
    ("angle", "pitch"),
    [("up", 7.99), ("down", -6.99)],
)
def test_insufficient_vertical_movement_fails(angle: str, pitch: float) -> None:
    assert image_validation._pose_matches(angle, 0.0, pitch) is False


def test_insightface_pose_is_normalized_to_application_signs() -> None:
    raw_yaw, raw_pitch, raw_roll = 20.0, 12.0, 1.0

    yaw, pitch, roll = image_validation._normalize_insightface_pose(
        [raw_pitch, raw_yaw, raw_roll]
    )

    assert (yaw, pitch, roll) == (-20.0, 12.0, 1.0)


def test_controlled_insightface_rotation_signs() -> None:
    from insightface.utils import transform

    yaw_radians = np.deg2rad(20.0)
    rotation = np.array(
        [
            [np.cos(yaw_radians), 0.0, np.sin(yaw_radians)],
            [0.0, 1.0, 0.0],
            [-np.sin(yaw_radians), 0.0, np.cos(yaw_radians)],
        ]
    )
    raw_pitch, raw_yaw, raw_roll = transform.matrix2angle(rotation)
    yaw, pitch, roll = image_validation._normalize_insightface_pose(
        [raw_pitch, raw_yaw, raw_roll]
    )

    assert raw_yaw == pytest.approx(20.0)
    assert yaw == pytest.approx(-20.0)
    assert pitch == pytest.approx(0.0)
    assert roll == pytest.approx(0.0)


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


def test_similar_perceptual_hashes_do_not_block_distinct_frames(client, monkeypatch) -> None:
    student_id = "930-26-2020"
    _create_pending_enrollment(client, student_id)

    def same_person_report(image_bytes: bytes, file_name: str, angle: str):
        report = _passing_validation_report(image_bytes, file_name, angle)
        report["perceptual_hash"] = "aaaaaaaaaaaaaaaa"
        return report

    monkeypatch.setattr(enroll, "validate_enrollment_image", same_person_report)

    response = _post_verification(client, student_id)

    assert response.status_code == 200, response.text


def test_identical_encoded_frame_is_rejected(client, monkeypatch) -> None:
    student_id = "930-26-2021"
    _create_pending_enrollment(client, student_id)
    monkeypatch.setattr(enroll, "validate_enrollment_image", _passing_validation_report)
    files = _verification_files(_verification_metadata(student_id))
    front_files = [entry for entry in files if entry[0] == "front"]
    first_bytes = front_files[0][1][1]
    second_index = files.index(front_files[1])
    second_name = front_files[1][1][0]
    files[second_index] = ("front", (second_name, first_bytes, "image/jpeg"))

    response = client.post("/enroll/verification", files=files)

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"] == "BACKEND_IMAGE_VALIDATION_FAILED"
    assert any(
        detail["angle"] == "front"
        and detail["error_code"] == "exact_reused_frame"
        for detail in payload["details"]
    )


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
