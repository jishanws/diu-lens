import json
import logging
import re
import traceback
import csv
import io
import hashlib
from collections import Counter
from datetime import datetime, timezone
from time import perf_counter
from typing import Literal, cast

from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, ValidationError

from app.core.enrollment_db import (
    EnrollmentNotFoundError,
    EnrollmentInvalidStateError,
    EnrollmentPersistenceError,
    EnrollmentRecordInput,
    persist_enrollment_to_db,
    persist_enrollment_verification_to_db,
    student_exists_in_db,
    get_student_by_id,
    StudentAlreadyRegisteredError,
)
from app.core.config import settings
from app.core.limiter import limiter
from app.core.image_validation import (
    build_validation_summary,
    phash_distance,
    validate_enrollment_image,
)
from app.core.enrollment_validation_config import ENROLLMENT_VALIDATION_CONFIG
from app.core.storage import (
    ALLOWED_ANGLES,
    ALLOWED_IMAGE_CONTENT_TYPES,
    MAX_UPLOAD_IMAGE_SIZE_BYTES,
    REQUIRED_CAPTURE_ANGLES,
    empty_uploaded_images,
    save_uploaded_images,
)


MIN_IMAGES_PER_ANGLE = ENROLLMENT_VALIDATION_CONFIG.required_samples_per_angle
MAX_IMAGES_PER_ANGLE = ENROLLMENT_VALIDATION_CONFIG.required_samples_per_angle
REQUIRED_IMAGES_PER_ANGLE = ENROLLMENT_VALIDATION_CONFIG.required_samples_per_angle
EXPECTED_REQUIRED_ANGLES: tuple[str, ...] = REQUIRED_CAPTURE_ANGLES
EXPECTED_TOTAL_SHOTS = len(EXPECTED_REQUIRED_ANGLES) * REQUIRED_IMAGES_PER_ANGLE
EYES_VISIBLE_VALUES: tuple[str, ...] = ("passed", "failed", "not_yet_implemented")
REQUIRED_ENROLLMENT_FIELDS: tuple[str, ...] = (
    "student_id",
    "full_name",
    "phone",
    "university_email",
)
ENROLLMENT_STATUSES: tuple[str, ...] = (
    "pending",
    "uploaded",
    "validated",
    "failed",
    "processing",
    "processed",
    "approved",
    "rejected",
    "reset",
)
EnrollmentStatus = Literal[
    "pending",
    "uploaded",
    "validated",
    "failed",
    "processing",
    "processed",
    "approved",
    "rejected",
    "reset",
]


class AngleCaptureSummary(BaseModel):
    angle: str
    accepted_shots: int = Field(..., ge=0)
    required_shots: int = Field(..., ge=0)


class FrameMetadata(BaseModel):
    captured_at: int | None = Field(default=None, ge=0)
    capture_latency_ms: int | None = Field(default=None, ge=0)


class AngleFrameMetadata(BaseModel):
    angle: str
    frames: list[FrameMetadata] = Field(default_factory=list)


class EnrollmentRequest(BaseModel):
    student_id: str
    full_name: str
    phone: str
    university_email: str = Field(
        ...,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        description="University email address",
    )
    liveness_passed: bool = False
    verification_completed: bool = False
    total_required_shots: int = Field(default=0, ge=0)
    total_accepted_shots: int = Field(default=0, ge=0)
    angles: list[AngleCaptureSummary] = Field(default_factory=list)
    frame_metadata_by_angle: list[AngleFrameMetadata] = Field(default_factory=list)


class EnrollmentResponse(BaseModel):
    success: bool
    message: str


router = APIRouter(tags=["enrollment"])
enroll_logger = logging.getLogger("diu_lens.enroll")
verification_logger = logging.getLogger("diu_lens.verification")


def _bad_request(message: str) -> HTTPException:
    return HTTPException(status_code=400, detail={"message": message})


def _json_result(
    *,
    status_code: int,
    success: bool,
    message: str,
    **extra: object,
) -> JSONResponse:
    payload: dict[str, object] = {
        "success": success,
        "message": message,
    }
    payload.update(extra)
    return JSONResponse(status_code=status_code, content=payload)


def _validate_verification_request_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.allowed_origins:
        raise HTTPException(
            status_code=403,
            detail="Enrollment submission origin is not allowed",
        )

    if request.headers.get("sec-fetch-site", "").lower() == "cross-site":
        raise HTTPException(
            status_code=403,
            detail="Cross-site enrollment submission is not allowed",
        )


def _verification_error_response(exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and detail.get("error") == "sanity_failed":
        return JSONResponse(
            status_code=422,
            content={
                "error": "BACKEND_IMAGE_VALIDATION_FAILED",
                "message": "One or more enrollment images failed validation.",
                "details": detail.get("details", []),
            },
        )

    if isinstance(detail, dict):
        message = str(detail.get("message") or "Enrollment request validation failed.")
        error_code = str(detail.get("error") or "ENROLLMENT_PAYLOAD_INVALID")
        details = detail.get("details")
    else:
        message = str(detail or "Enrollment request validation failed.")
        error_code = "ENROLLMENT_PAYLOAD_INVALID"
        details = None

    status_code = 422 if exc.status_code in {400, 422} else exc.status_code
    content: dict[str, object] = {"error": error_code, "message": message}
    if details is not None:
        content["details"] = details
    return JSONResponse(status_code=status_code, content=content)

def _missing_required_fields(raw_payload: object) -> list[str]:
    if not isinstance(raw_payload, dict):
        return list(REQUIRED_ENROLLMENT_FIELDS)

    missing: list[str] = []
    for field in REQUIRED_ENROLLMENT_FIELDS:
        value = raw_payload.get(field)
        if value is None:
            missing.append(field)
            continue
        if isinstance(value, str) and not value.strip():
            missing.append(field)
    return missing


def _parse_enrollment_payload(raw_payload: object) -> EnrollmentRequest:
    try:
        return EnrollmentRequest.model_validate(raw_payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def _parse_multipart_metadata(metadata_value: object) -> EnrollmentRequest:
    if not isinstance(metadata_value, str) or not metadata_value.strip():
        raise _bad_request("Missing metadata field in multipart request.")

    try:
        metadata_object = json.loads(metadata_value)
    except json.JSONDecodeError as exc:
        raise _bad_request("Invalid metadata JSON.") from exc

    return _parse_enrollment_payload(metadata_object)


def _extract_multipart_files(
    form_data: object,
) -> dict[str, list[UploadFile]]:
    if not hasattr(form_data, "keys") or not hasattr(form_data, "getlist"):
        raise _bad_request("Invalid multipart form data.")

    form_keys = list(form_data.keys())
    verification_logger.info("[verification] multipart keys=%s", form_keys)

    files_by_angle: dict[str, list[UploadFile]] = {
        angle: [] for angle in EXPECTED_REQUIRED_ANGLES
    }
    rejected_fields: list[str] = []

    for key in form_data.keys():
        if key == "metadata":
            continue

        form_items = form_data.getlist(key)
        angle_files = [
            cast(UploadFile, item)
            for item in form_items
            if hasattr(item, "filename") and hasattr(item, "read")
        ]

        if not angle_files:
            continue

        if key not in EXPECTED_REQUIRED_ANGLES:
            rejected_fields.append(key)
            continue

        files_by_angle[key].extend(angle_files)

    if rejected_fields:
        verification_logger.warning(
            "[verification] rejected multipart fields=%s allowed=%s",
            sorted(rejected_fields),
            EXPECTED_REQUIRED_ANGLES,
        )
        rejected_sample = sorted(rejected_fields)[0]
        raise _bad_request(
            "Unsupported angle field in files: "
            f"{rejected_sample}. Expected: {', '.join(EXPECTED_REQUIRED_ANGLES)}."
        )

    if not any(files_by_angle.values()):
        raise _bad_request("No verification image files were provided.")

    parsed_angles = sorted(angle for angle, files in files_by_angle.items() if files)
    verification_logger.info("[verification] parsed angle fields=%s", parsed_angles)

    return files_by_angle


def _validate_final_multipart_metadata(payload: EnrollmentRequest) -> None:
    if not payload.verification_completed:
        raise _bad_request(
            "verification_completed must be true for final multipart enrollment"
        )

    if not payload.liveness_passed:
        raise _bad_request("liveness_passed must be true for final multipart enrollment")

    if payload.total_required_shots != EXPECTED_TOTAL_SHOTS:
        raise _bad_request(
            f"total_required_shots must be exactly {EXPECTED_TOTAL_SHOTS}"
        )

    angle_names = [summary.angle for summary in payload.angles]
    duplicate_angles = sorted(
        angle for angle, count in Counter(angle_names).items() if count > 1
    )
    if duplicate_angles:
        joined = ", ".join(duplicate_angles)
        raise _bad_request(f"Duplicate angle summaries are not allowed: {joined}")

    provided_angles = set(angle_names)
    required_angles = set(EXPECTED_REQUIRED_ANGLES)

    missing_angles = sorted(required_angles - provided_angles)
    if missing_angles:
        raise _bad_request(f"Missing angle: {missing_angles[0]}")

    extra_angles = sorted(provided_angles - required_angles)
    if extra_angles:
        raise _bad_request(f"Unknown angle in metadata: {extra_angles[0]}")

    if len(payload.angles) != len(EXPECTED_REQUIRED_ANGLES):
        raise _bad_request(
            f"Metadata must include exactly {len(EXPECTED_REQUIRED_ANGLES)} angle summaries."
        )

    for summary in payload.angles:
        if summary.required_shots != REQUIRED_IMAGES_PER_ANGLE:
            raise _bad_request(
                f"Invalid required_shots for angle: {summary.angle}. "
                f"Expected {REQUIRED_IMAGES_PER_ANGLE}."
            )
        if summary.accepted_shots != REQUIRED_IMAGES_PER_ANGLE:
            raise _bad_request(
                f"Invalid accepted_shots for angle: {summary.angle}. "
                f"Expected {REQUIRED_IMAGES_PER_ANGLE}."
            )


def _validate_file_counts(
    files_by_angle: dict[str, list[UploadFile]],
    payload: EnrollmentRequest,
) -> None:
    expected_by_angle = {
        summary.angle: int(summary.accepted_shots) for summary in payload.angles
    }
    expected_angles = set(expected_by_angle)
    for angle in EXPECTED_REQUIRED_ANGLES:
        if angle not in expected_angles:
            raise _bad_request(f"Missing required angle metadata: {angle}")

    uploaded_angles = {angle for angle, files in files_by_angle.items() if files}
    if uploaded_angles != set(EXPECTED_REQUIRED_ANGLES):
        missing_upload_angles = sorted(set(EXPECTED_REQUIRED_ANGLES) - uploaded_angles)
        if missing_upload_angles:
            raise _bad_request(f"Missing angle: {missing_upload_angles[0]}")
        unknown_upload_angles = sorted(uploaded_angles - set(EXPECTED_REQUIRED_ANGLES))
        if unknown_upload_angles:
            raise _bad_request(f"Unknown angle in upload files: {unknown_upload_angles[0]}")

    for angle, expected_count in expected_by_angle.items():
        file_count = len(files_by_angle.get(str(angle), []))
        if file_count != REQUIRED_IMAGES_PER_ANGLE:
            raise _bad_request(f"Invalid image count for angle: {angle}")
        if file_count != expected_count:
            raise _bad_request(
                f"Metadata/upload count mismatch for angle {angle}: "
                f"metadata={expected_count}, uploaded={file_count}"
            )

    actual_uploaded_count = sum(len(files_by_angle.get(angle, [])) for angle in EXPECTED_REQUIRED_ANGLES)
    if payload.total_accepted_shots != actual_uploaded_count:
        raise _bad_request(
            "total_accepted_shots does not match uploaded image count."
        )


def _capture_timestamps_by_angle(
    payload: EnrollmentRequest,
) -> dict[str, list[FrameMetadata]]:
    mapping: dict[str, list[FrameMetadata]] = {
        angle: [] for angle in EXPECTED_REQUIRED_ANGLES
    }
    for entry in payload.frame_metadata_by_angle:
        angle = str(entry.angle)
        if angle not in mapping:
            continue
        mapping[angle] = list(entry.frames)
    return mapping


def _build_frame_metadata_by_path(
    uploaded_images: dict[str, list[str]],
    validation_summary: dict[str, object],
) -> dict[str, dict[str, object]]:
    metadata_by_path: dict[str, dict[str, object]] = {}
    quality_by_angle_raw = validation_summary.get("quality_by_angle", {})
    quality_by_angle = (
        quality_by_angle_raw
        if isinstance(quality_by_angle_raw, dict)
        else {}
    )

    for angle in ALLOWED_ANGLES:
        paths = uploaded_images.get(angle, [])
        quality_rows_raw = quality_by_angle.get(angle, [])
        quality_rows = quality_rows_raw if isinstance(quality_rows_raw, list) else []

        for index, path in enumerate(paths):
            quality = quality_rows[index] if index < len(quality_rows) else {}
            if not isinstance(quality, dict):
                quality = {}
            metadata_by_path[str(path)] = {
                "captured_at": quality.get("captured_at"),
                "capture_latency_ms": quality.get("capture_latency_ms"),
                "image_index": quality.get("image_index", index + 1),
                "validation_status": quality.get("validation_status"),
                "rejection_reason": quality.get("rejection_reason"),
                "blur_score": quality.get("blur_score"),
                "brightness": quality.get("brightness"),
                "face_area_ratio": quality.get("face_area_ratio"),
                "center_offset": quality.get("center_offset"),
                "detection_confidence": quality.get("detection_confidence"),
                "face_box": quality.get("face_box"),
                "yaw": quality.get("yaw"),
                "pitch": quality.get("pitch"),
                "roll": quality.get("roll"),
                "quality_score": quality.get("quality_score"),
                "perceptual_hash": quality.get("perceptual_hash"),
                "duplicate_distance": quality.get("duplicate_distance"),
                "replay_flags": quality.get("replay_flags"),
            }

    return metadata_by_path


def _extract_sanity_failure_details(
    image_reports: list[dict[str, object]],
) -> list[dict[str, object]]:
    details: list[dict[str, object]] = []

    for report in image_reports:
        if bool(report.get("passed", False)):
            continue

        failure_reasons_raw = report.get("failure_reasons", [])
        failure_reasons = (
            [str(reason) for reason in failure_reasons_raw]
            if isinstance(failure_reasons_raw, list)
            else []
        )
        reason = failure_reasons[0] if failure_reasons else str(report.get("blocker", "unknown"))

        details.append(
            {
                "angle": str(report.get("angle", "unknown")),
                "index": int(report.get("image_index", 0) or 0),
                "file_name": str(report.get("file_name", "unknown")),
                "reason": reason,
                "error_code": reason.split("(", 1)[0].strip() or "unknown",
                "image_size_bytes": int(report.get("image_size_bytes", 0) or 0),
                "decoded_shape": report.get("decoded_shape"),
            }
        )

    return details


def _dimensions_from_report(report: dict[str, object]) -> str:
    dimensions = report.get("dimensions")
    if isinstance(dimensions, str) and dimensions.strip():
        return dimensions
    decoded_shape = report.get("decoded_shape")
    if isinstance(decoded_shape, list) and len(decoded_shape) >= 2:
        try:
            height = int(decoded_shape[0])
            width = int(decoded_shape[1])
            return f"{width}x{height}"
        except (TypeError, ValueError):
            return "unknown"
    return "unknown"


def _threshold_recommendations_from_reports(
    image_reports: list[dict[str, object]],
) -> list[dict[str, object]]:
    recommendations: list[dict[str, object]] = []
    if not image_reports:
        return recommendations

    def values_for(key: str) -> list[float]:
        values: list[float] = []
        for report in image_reports:
            value = report.get(key)
            if isinstance(value, int | float):
                values.append(float(value))
        return values

    blur_values = values_for("blur_score")
    brightness_values = values_for("brightness_score")
    face_values = values_for("face_area_ratio")
    center_values = values_for("center_offset")
    quality_values = values_for("quality_score")

    if blur_values and min(blur_values) < ENROLLMENT_VALIDATION_CONFIG.min_blur_variance:
        recommendations.append(
            {
                "metric": "blur",
                "recommendation": "Improve camera focus or require the student to hold still longer.",
                "observed_min": round(min(blur_values), 2),
                "threshold": ENROLLMENT_VALIDATION_CONFIG.min_blur_variance,
            }
        )
    if brightness_values and (
        min(brightness_values) < ENROLLMENT_VALIDATION_CONFIG.min_brightness
        or max(brightness_values) > ENROLLMENT_VALIDATION_CONFIG.max_brightness
    ):
        recommendations.append(
            {
                "metric": "brightness",
                "recommendation": "Adjust room lighting before changing thresholds.",
                "observed_range": [round(min(brightness_values), 2), round(max(brightness_values), 2)],
                "threshold_range": [
                    ENROLLMENT_VALIDATION_CONFIG.min_brightness,
                    ENROLLMENT_VALIDATION_CONFIG.max_brightness,
                ],
            }
        )
    if face_values and min(face_values) < ENROLLMENT_VALIDATION_CONFIG.min_face_area_ratio:
        recommendations.append(
            {
                "metric": "face_size",
                "recommendation": "Move the camera closer or guide students closer to the camera.",
                "observed_min": round(min(face_values), 3),
                "threshold": ENROLLMENT_VALIDATION_CONFIG.min_face_area_ratio,
            }
        )
    if center_values and max(center_values) > ENROLLMENT_VALIDATION_CONFIG.max_center_offset:
        recommendations.append(
            {
                "metric": "centering",
                "recommendation": "Improve UI framing guidance or camera mounting position.",
                "observed_max": round(max(center_values), 3),
                "threshold": ENROLLMENT_VALIDATION_CONFIG.max_center_offset,
            }
        )
    if quality_values and sum(quality_values) / len(quality_values) < 70:
        recommendations.append(
            {
                "metric": "quality_score",
                "recommendation": "Collect more samples on this device before considering threshold changes.",
                "observed_average": round(sum(quality_values) / len(quality_values), 2),
                "target": 70,
            }
        )
    if not recommendations:
        recommendations.append(
            {
                "metric": "overall",
                "recommendation": "Current device samples are within configured thresholds. Keep validation strict.",
            }
        )
    return recommendations


def _summarize_reports(image_reports: list[dict[str, object]]) -> dict[str, object]:
    total = len(image_reports)
    accepted = sum(1 for report in image_reports if bool(report.get("passed")))
    quality_scores = [
        float(report["quality_score"])
        for report in image_reports
        if isinstance(report.get("quality_score"), int | float)
    ]
    reason_counts: dict[str, int] = {}
    for report in image_reports:
        if bool(report.get("passed")):
            continue
        reasons = report.get("failure_reasons")
        if isinstance(reasons, list):
            for reason in reasons:
                code = str(reason).split("(", 1)[0]
                reason_counts[code] = reason_counts.get(code, 0) + 1
    return {
        "total_samples": total,
        "accepted_samples": accepted,
        "rejected_samples": total - accepted,
        "acceptance_rate": round((accepted / total) * 100.0, 2) if total else 0,
        "average_quality_score": round(sum(quality_scores) / len(quality_scores), 2)
        if quality_scores
        else None,
        "rejection_reasons": reason_counts,
        "threshold_recommendations": _threshold_recommendations_from_reports(image_reports),
    }


async def _validate_files(
    files_by_angle: dict[str, list[UploadFile]],
    capture_timestamps_by_angle: dict[str, list[FrameMetadata]],
) -> dict[str, object]:
    image_reports: list[dict[str, object]] = []
    total_uploaded_bytes = 0
    quality_by_angle: dict[str, list[dict[str, object]]] = {
        angle: [] for angle in EXPECTED_REQUIRED_ANGLES
    }
    reports_by_angle: dict[str, list[dict[str, object]]] = {
        angle: [] for angle in EXPECTED_REQUIRED_ANGLES
    }
    seen_encoded_frames: dict[str, tuple[str, str]] = {}

    for angle in EXPECTED_REQUIRED_ANGLES:
        for index, upload in enumerate(files_by_angle.get(angle, [])):
            content_type = (upload.content_type or "").lower()
            if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
                raise _bad_request(f"Unsupported file type for angle: {angle}")

            sample = await upload.read(MAX_UPLOAD_IMAGE_SIZE_BYTES + 1)
            await upload.seek(0)

            verification_logger.info(
                "[verification-upload] angle=%s file=%s size_bytes=%s content_type=%s",
                angle,
                upload.filename or "unknown",
                len(sample),
                content_type,
            )

            if not sample:
                raise _bad_request(f"Uploaded file is empty for angle: {angle}")

            if len(sample) > MAX_UPLOAD_IMAGE_SIZE_BYTES:
                raise _bad_request(f"File too large for angle: {angle}")
            total_uploaded_bytes += len(sample)

            file_name = upload.filename or "unknown"
            encoded_digest = hashlib.sha256(sample).hexdigest()
            try:
                image_report = validate_enrollment_image(
                    image_bytes=sample,
                    file_name=file_name,
                    angle=angle,
                )
            except Exception as exc:
                verification_logger.exception(
                    "event=backend_validation_failed angle=%s index=%s error_type=%s",
                    angle,
                    index + 1,
                    type(exc).__name__,
                )
                raise HTTPException(
                    status_code=503,
                    detail={
                        "error": "FACE_PROCESSOR_UNAVAILABLE",
                        "message": "Face processing service is temporarily unavailable.",
                    },
                ) from exc
            image_report["image_index"] = index + 1
            captured_at_rows = capture_timestamps_by_angle.get(angle, [])
            frame_metadata = captured_at_rows[index] if index < len(captured_at_rows) else None
            captured_at = frame_metadata.captured_at if frame_metadata is not None else None
            capture_latency_ms = (
                frame_metadata.capture_latency_ms if frame_metadata is not None else None
            )
            previous_hashes = [
                str(report.get("perceptual_hash"))
                for report in reports_by_angle[angle]
                if report.get("perceptual_hash")
            ]
            current_hash = (
                str(image_report.get("perceptual_hash"))
                if image_report.get("perceptual_hash")
                else None
            )
            duplicate_distances = [
                distance
                for distance in (
                    phash_distance(current_hash, previous_hash)
                    for previous_hash in previous_hashes
                )
                if distance is not None
            ]
            duplicate_distance = min(duplicate_distances) if duplicate_distances else None
            replay_flags: list[str] = []
            reused_frame = seen_encoded_frames.get(encoded_digest)
            if reused_frame is not None:
                previous_angle, previous_file = reused_frame
                replay_flags.append("exact_reused_frame")
                reasons = image_report.setdefault("failure_reasons", [])
                if isinstance(reasons, list):
                    reasons.append(
                        "exact_reused_frame("
                        f"previous_angle:{previous_angle},previous_file:{previous_file})"
                    )
                image_report["passed"] = False
                image_report["is_blocking_failure"] = True
                image_report["final_decision"] = "reject"
                image_report["blocker"] = "exact_reused_frame"
            else:
                seen_encoded_frames[encoded_digest] = (angle, file_name)
            image_report["duplicate_distance"] = duplicate_distance
            image_report["replay_flags"] = replay_flags
            image_report["capture_latency_ms"] = capture_latency_ms
            quality_by_angle[angle].append(
                {
                    "file_name": file_name,
                    "image_index": index + 1,
                    "captured_at": captured_at,
                    "capture_latency_ms": capture_latency_ms,
                    "validation_status": "accepted" if image_report.get("passed") else "rejected",
                    "rejection_reason": image_report.get("blocker"),
                    "blur_score": image_report.get("blur_score"),
                    "brightness": image_report.get("brightness_score"),
                    "face_area_ratio": image_report.get("face_area_ratio"),
                    "center_offset": image_report.get("center_offset"),
                    "detection_confidence": image_report.get("detection_score"),
                    "face_box": image_report.get("face_box"),
                    "yaw": image_report.get("yaw"),
                    "pitch": image_report.get("pitch"),
                    "roll": image_report.get("roll"),
                    "quality_score": image_report.get("quality_score"),
                    "perceptual_hash": image_report.get("perceptual_hash"),
                    "duplicate_distance": duplicate_distance,
                    "replay_flags": replay_flags,
                }
            )
            reports_by_angle[angle].append(image_report)
            blocking_reasons = image_report.get("blocking_reasons", [])
            non_blocking_reasons = image_report.get("non_blocking_reasons", [])
            if not isinstance(blocking_reasons, list):
                blocking_reasons = []
            if not isinstance(non_blocking_reasons, list):
                non_blocking_reasons = []
            is_blocking = bool(image_report.get("is_blocking_failure", False))
            verification_logger.info(
                "[guided-sanity] route_review angle=%s file=%s readable=%s dimensions=%s "
                "face_detected=%s blocking=%s blocking_reasons=%s non_blocking_reasons=%s "
                "final_decision=%s bytes=%s",
                angle,
                file_name,
                bool(image_report.get("readable", False)),
                _dimensions_from_report(image_report),
                bool(image_report.get("face_detected", False)),
                is_blocking,
                blocking_reasons,
                non_blocking_reasons,
                image_report.get("final_decision", "reject"),
                len(sample),
            )
            if is_blocking:
                verification_logger.warning(
                    "[guided-sanity] route_blocked angle=%s file=%s reason=%s",
                    angle,
                    file_name,
                    image_report.get("blocker", "unknown"),
                )
            image_reports.append(image_report)

    summary = build_validation_summary(image_reports)
    verification_logger.info(
        "[guided-sanity] summary total=%s passed=%s failed=%s",
        summary.get("total_images_checked"),
        summary.get("total_images_passed"),
        summary.get("failed_images_count"),
    )
    summary["total_uploaded_bytes"] = total_uploaded_bytes
    summary["quality_by_angle"] = quality_by_angle
    if not summary["validation_passed"]:
        failure_details = _extract_sanity_failure_details(image_reports)
        verification_logger.warning(
            "[guided-sanity] validation_failed details=%s",
            failure_details,
        )
        specific_message = "Image validation failed."
        if failure_details:
            first_failure = failure_details[0]
            reason = str(first_failure.get("reason", "unknown"))
            angle = str(first_failure.get("angle", "unknown"))
            if reason.startswith("invalid_image_data"):
                specific_message = f"Corrupted image for angle: {angle}"
            elif reason.startswith("image_too_small"):
                specific_message = f"Image too small for angle: {angle}"
            elif reason.startswith("missing_image_data"):
                specific_message = f"Uploaded file is empty for angle: {angle}"
            else:
                specific_message = f"Image validation failed for angle: {angle}"
        raise HTTPException(
            status_code=400,
            detail={
                "error": "sanity_failed",
                "status": "failed",
                "message": specific_message,
                "details": failure_details,
                "validation": summary,
            },
        )

    return summary


@router.get("/enroll/validation-config")
async def get_validation_config() -> JSONResponse:
    config = ENROLLMENT_VALIDATION_CONFIG
    payload = {
        "minDetectionScore": config.min_detection_score,
        "minFaceAreaRatio": config.min_face_area_ratio,
        "maxFaceAreaRatio": config.max_face_area_ratio,
        "maxCenterOffset": config.max_center_offset,
        "minEdgeMarginRatio": config.min_edge_margin_ratio,
        "minBlurVariance": config.min_blur_variance,
        "brightnessRange": {
            "min": config.min_brightness,
            "max": config.max_brightness,
        },
        "minResolution": {
            "width": config.min_width,
            "height": config.min_height,
        },
        "stabilityDurationMs": config.stability_duration_ms,
        "requiredSamplesPerAngle": config.required_samples_per_angle,
        "livenessChallengeCount": config.liveness_challenge_count,
        "poseThresholds": {
            angle: {
                "valid": {
                    "yawMin": t.yaw_min,
                    "yawMax": t.yaw_max,
                    "pitchMin": t.pitch_min,
                    "pitchMax": t.pitch_max,
                },
                "near": {
                    "yawMin": t.yaw_min - 4.0,
                    "yawMax": t.yaw_max + 4.0,
                    "pitchMin": t.pitch_min - 4.0,
                    "pitchMax": t.pitch_max + 4.0,
                },
            }
            for angle, t in config.pose_thresholds.items()
        }
    }
    return JSONResponse(content=payload)


@router.post("/enroll/calibration", response_model=None)
async def calibrate_enrollment_capture(request: Request) -> dict[str, object] | Response:
    try:
        form_data = await request.form()
    except Exception as exc:
        raise _bad_request(f"Invalid multipart payload: {exc}") from exc

    default_angle = str(form_data.get("angle") or "front").strip().lower()
    if default_angle not in EXPECTED_REQUIRED_ANGLES:
        raise _bad_request(f"Unsupported calibration angle: {default_angle}")

    uploads: list[tuple[str, UploadFile]] = []
    for key in form_data.keys():
        if key in {"angle", "metadata"}:
            continue
        for item in form_data.getlist(key):
            if not hasattr(item, "filename") or not hasattr(item, "read"):
                continue
            angle = key if key in EXPECTED_REQUIRED_ANGLES else default_angle
            uploads.append((angle, cast(UploadFile, item)))

    if not uploads:
        raise _bad_request("No calibration images were provided.")

    reports: list[dict[str, object]] = []
    previous_hashes_by_angle: dict[str, list[str]] = {angle: [] for angle in EXPECTED_REQUIRED_ANGLES}
    try:
        for angle, upload in uploads:
            content_type = (upload.content_type or "").lower()
            if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
                raise _bad_request(f"Unsupported file type for calibration angle: {angle}")
            sample = await upload.read(MAX_UPLOAD_IMAGE_SIZE_BYTES + 1)
            if not sample:
                raise _bad_request(f"Calibration file is empty for angle: {angle}")
            if len(sample) > MAX_UPLOAD_IMAGE_SIZE_BYTES:
                raise _bad_request(f"Calibration file too large for angle: {angle}")
            report = validate_enrollment_image(sample, upload.filename or "calibration", angle)
            current_hash = str(report.get("perceptual_hash")) if report.get("perceptual_hash") else None
            distances = [
                distance
                for distance in (
                    phash_distance(current_hash, previous_hash)
                    for previous_hash in previous_hashes_by_angle[angle]
                )
                if distance is not None
            ]
            duplicate_distance = min(distances) if distances else None
            report["duplicate_distance"] = duplicate_distance
            if duplicate_distance is not None and duplicate_distance <= 4:
                flags = report.setdefault("replay_flags", [])
                if isinstance(flags, list):
                    flags.append("near_duplicate_frame")
            if current_hash:
                previous_hashes_by_angle[angle].append(current_hash)
            reports.append(report)
    finally:
        for _, upload in uploads:
            await upload.close()

    payload = {
        "success": True,
        "mode": "calibration",
        "persisted": False,
        "thresholds": {
            "min_detection_score": ENROLLMENT_VALIDATION_CONFIG.min_detection_score,
            "min_face_area_ratio": ENROLLMENT_VALIDATION_CONFIG.min_face_area_ratio,
            "max_face_area_ratio": ENROLLMENT_VALIDATION_CONFIG.max_face_area_ratio,
            "max_center_offset": ENROLLMENT_VALIDATION_CONFIG.max_center_offset,
            "min_blur_variance": ENROLLMENT_VALIDATION_CONFIG.min_blur_variance,
            "brightness_range": [
                ENROLLMENT_VALIDATION_CONFIG.min_brightness,
                ENROLLMENT_VALIDATION_CONFIG.max_brightness,
            ],
            "pose_thresholds": {
                angle: threshold.__dict__
                for angle, threshold in ENROLLMENT_VALIDATION_CONFIG.pose_thresholds.items()
            },
        },
        "summary": _summarize_reports(reports),
        "reports": reports,
    }
    export_format = str(request.query_params.get("export", "")).strip().lower()
    if export_format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "file_name",
                "angle",
                "passed",
                "blocker",
                "quality_score",
                "detection_score",
                "blur_score",
                "brightness_score",
                "face_area_ratio",
                "center_offset",
                "yaw",
                "pitch",
                "roll",
                "duplicate_distance",
                "replay_flags",
            ],
        )
        writer.writeheader()
        for report in reports:
            writer.writerow(
                {
                    "file_name": report.get("file_name"),
                    "angle": report.get("angle"),
                    "passed": report.get("passed"),
                    "blocker": report.get("blocker"),
                    "quality_score": report.get("quality_score"),
                    "detection_score": report.get("detection_score"),
                    "blur_score": report.get("blur_score"),
                    "brightness_score": report.get("brightness_score"),
                    "face_area_ratio": report.get("face_area_ratio"),
                    "center_offset": report.get("center_offset"),
                    "yaw": report.get("yaw"),
                    "pitch": report.get("pitch"),
                    "roll": report.get("roll"),
                    "duplicate_distance": report.get("duplicate_distance"),
                    "replay_flags": "|".join(
                        str(flag)
                        for flag in (
                            report.get("replay_flags", [])
                            if isinstance(report.get("replay_flags"), list)
                            else []
                        )
                        if flag
                    ),
                }
            )
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=diu-lens-enrollment-calibration.csv"
            },
        )

    return payload


async def _close_upload_files(files_by_angle: dict[str, list[UploadFile]]) -> None:
    for angle_files in files_by_angle.values():
        for upload in angle_files:
            await upload.close()


def _default_validation_summary() -> dict[str, object]:
    return {
        "validation_passed": False,
        "total_images_checked": 0,
        "total_images_passed": 0,
        "failed_images_count": 0,
        "image_reports": [],
        "quality_by_angle": {angle: [] for angle in ALLOWED_ANGLES},
    }


def _normalize_angle_summaries(
    angles: list[AngleCaptureSummary],
) -> list[dict[str, object]]:
    by_angle: dict[str, dict[str, object]] = {
        angle: {
            "angle": angle,
            "accepted_shots": 0,
            "required_shots": 0,
        }
        for angle in ALLOWED_ANGLES
    }

    for angle_summary in angles:
        if angle_summary.angle not in by_angle:
            continue
        by_angle[angle_summary.angle] = {
            "angle": angle_summary.angle,
            "accepted_shots": int(angle_summary.accepted_shots),
            "required_shots": int(angle_summary.required_shots),
        }

    return [by_angle[angle] for angle in ALLOWED_ANGLES]


def _normalize_uploaded_images(
    uploaded_images: dict[str, list[str]],
) -> dict[str, list[str]]:
    normalized = empty_uploaded_images()
    for angle in ALLOWED_ANGLES:
        normalized[angle] = list(uploaded_images.get(angle, []))
    return normalized


def _normalize_validation_summary(
    validation_summary: dict[str, object],
) -> dict[str, object]:
    image_reports_input = validation_summary.get("image_reports", [])
    image_reports: list[dict[str, object]] = []

    if isinstance(image_reports_input, list):
        for report in image_reports_input:
            if not isinstance(report, dict):
                continue

            eyes_visible = str(report.get("eyes_visible", "not_yet_implemented"))
            if eyes_visible not in EYES_VISIBLE_VALUES:
                eyes_visible = "not_yet_implemented"

            failure_reasons_raw = report.get("failure_reasons", [])
            failure_reasons = (
                [str(reason) for reason in failure_reasons_raw]
                if isinstance(failure_reasons_raw, list)
                else []
            )

            image_reports.append(
                {
                    "file_name": str(report.get("file_name", "unknown")),
                    "angle": str(report.get("angle", "unknown")),
                    "passed": bool(report.get("passed", False)),
                    "blocker": str(report.get("blocker", "unknown")),
                    "image_size_bytes": int(report.get("image_size_bytes", 0) or 0),
                    "decoded_shape": report.get("decoded_shape"),
                    "blur_ok": bool(report.get("blur_ok", False)),
                    "brightness_ok": bool(report.get("brightness_ok", False)),
                    "dimensions_ok": bool(report.get("dimensions_ok", False)),
                    "face_detected": bool(report.get("face_detected", False)),
                    "face_centered": bool(report.get("face_centered", False)),
                    "eyes_visible": eyes_visible,
                    "failure_reasons": failure_reasons,
                }
            )

    total_images_checked = len(image_reports)
    total_images_passed = sum(1 for report in image_reports if bool(report["passed"]))
    failed_images_count = total_images_checked - total_images_passed
    validation_passed = bool(validation_summary.get("validation_passed", True))
    if total_images_checked > 0:
        validation_passed = failed_images_count == 0

    return {
        "validation_passed": validation_passed,
        "total_images_checked": total_images_checked,
        "total_images_passed": total_images_passed,
        "failed_images_count": failed_images_count,
        "image_reports": image_reports,
    }


def _resolve_enrollment_status(
    payload: EnrollmentRequest,
    validation_summary: dict[str, object],
) -> EnrollmentStatus:
    if (
        payload.verification_completed
        and bool(validation_summary.get("validation_passed"))
        and int(validation_summary.get("total_images_checked", 0)) > 0
    ):
        return "validated"

    return "uploaded"


def _build_enrollment_entry(
    payload: EnrollmentRequest,
    uploaded_images: dict[str, list[str]],
    validation_summary: dict[str, object],
    frame_metadata_by_path: dict[str, dict[str, object]],
    *,
    status_override: EnrollmentStatus | None = None,
) -> dict[str, object]:
    normalized_validation = _normalize_validation_summary(validation_summary)
    normalized_uploaded_images = _normalize_uploaded_images(uploaded_images)
    normalized_angles = _normalize_angle_summaries(payload.angles)
    status = status_override or _resolve_enrollment_status(payload, normalized_validation)
    if status not in ENROLLMENT_STATUSES:
        status = "uploaded"
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "student_id": payload.student_id,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "university_email": payload.university_email,
        "status": status,
        "verification_completed": payload.verification_completed,
        "total_required_shots": payload.total_required_shots,
        "total_accepted_shots": payload.total_accepted_shots,
        "angles": normalized_angles,
        "uploaded_images": normalized_uploaded_images,
        "frame_metadata_by_path": frame_metadata_by_path,
        "validation": normalized_validation,
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def _persist_enrollment_metadata(
    entry: dict[str, object],
    *,
    mode: str,
    event_type: str,
    event_message: str,
    update_existing: bool = False,
) -> None:
    validation = entry.get("validation", {})
    uploaded_images = entry.get("uploaded_images", {})
    frame_metadata_raw = entry.get("frame_metadata_by_path", {})
    if not isinstance(validation, dict):
        validation = {}
    if not isinstance(uploaded_images, dict):
        uploaded_images = empty_uploaded_images()
    if not isinstance(frame_metadata_raw, dict):
        frame_metadata_raw = {}

    try:
        payload = EnrollmentRecordInput(
            student_id=str(entry.get("student_id", "")),
            full_name=str(entry.get("full_name", "")),
            phone=str(entry.get("phone", "")),
            university_email=str(entry.get("university_email", "")),
            status=str(entry.get("status", "uploaded")),
            verification_completed=bool(entry.get("verification_completed", False)),
            total_required_shots=int(entry.get("total_required_shots", 0)),
            total_accepted_shots=int(entry.get("total_accepted_shots", 0)),
            validation_passed=bool(validation.get("validation_passed", False)),
            uploaded_images={
                angle: [str(path) for path in uploaded_images.get(angle, [])]
                if isinstance(uploaded_images.get(angle, []), list)
                else []
                for angle in ALLOWED_ANGLES
            },
            frame_metadata_by_path={
                str(path): (
                    metadata if isinstance(metadata, dict) else {}
                )
                for path, metadata in frame_metadata_raw.items()
            },
            event_type=event_type,
            event_message=event_message,
            mode=mode,
        )

        if update_existing:
            persist_enrollment_verification_to_db(payload)
        else:
            persist_enrollment_to_db(payload)
    except StudentAlreadyRegisteredError:
        raise
    except RuntimeError as exc:
        raise EnrollmentPersistenceError(str(exc)) from exc


def _extract_failed_validation_summary(exc: HTTPException) -> dict[str, object]:
    detail = exc.detail
    if isinstance(detail, dict):
        validation = detail.get("validation")
        if isinstance(validation, dict):
            return validation
    return {
        "validation_passed": False,
        "total_images_checked": 0,
        "total_images_passed": 0,
        "failed_images_count": 1,
        "image_reports": [],
    }


def _total_uploaded_bytes_from_validation_summary(
    validation_summary: dict[str, object],
) -> int:
    explicit_total = validation_summary.get("total_uploaded_bytes")
    if explicit_total is not None:
        try:
            return int(explicit_total)
        except (TypeError, ValueError):
            pass

    image_reports = validation_summary.get("image_reports")
    if not isinstance(image_reports, list):
        return 0

    total_bytes = 0
    for report in image_reports:
        if not isinstance(report, dict):
            continue
        total_bytes += int(report.get("image_size_bytes", 0) or 0)
    return total_bytes


async def _handle_json_enrollment(
    request: Request,
) -> tuple[EnrollmentRequest, dict[str, list[str]], dict[str, object]]:
    try:
        raw_payload = await request.json()
    except json.JSONDecodeError as exc:
        raise _bad_request("Invalid JSON body.") from exc

    payload = _parse_enrollment_payload(raw_payload)
    return payload, empty_uploaded_images(), _default_validation_summary()


async def _handle_multipart_enrollment(
    request: Request,
) -> tuple[EnrollmentRequest, dict[str, list[str]], dict[str, object], dict[str, float]]:
    multipart_started_at = perf_counter()
    try:
        form_data = await request.form()
        after_form_parse_at = perf_counter()
        payload = _parse_multipart_metadata(form_data.get("metadata"))
        verification_logger.info(
            "event=payload_received student_id=%s metadata_angles=%s",
            payload.student_id,
            len(payload.angles),
        )
    except HTTPException:
        raise
    except Exception as exc:
        verification_logger.exception(
            "[verification] failed to parse multipart form data error=%r traceback=%s",
            exc,
            traceback.format_exc(),
        )
        raise _bad_request(f"Invalid multipart payload: {exc}") from exc
    after_metadata_parse_at = perf_counter()

    files_by_angle = _extract_multipart_files(form_data)
    capture_timestamps_by_angle = _capture_timestamps_by_angle(payload)
    after_file_access_at = perf_counter()
    verification_logger.info(
        "[verification-timing] metadata parsed ms=%s",
        round((after_metadata_parse_at - after_form_parse_at) * 1000, 2),
    )
    verification_logger.info(
        "[verification-timing] form parsing / file access complete ms=%s",
        round((after_file_access_at - multipart_started_at) * 1000, 2),
    )
    validation_summary = _default_validation_summary()
    uploaded_images = empty_uploaded_images()
    after_validation_at = after_file_access_at
    after_file_save_at = after_file_access_at

    try:
        _validate_final_multipart_metadata(payload)
        _validate_file_counts(files_by_angle, payload)
        verification_logger.info(
            "event=image_count_validated student_id=%s total=%s counts=%s",
            payload.student_id,
            sum(len(files) for files in files_by_angle.values()),
            {angle: len(files_by_angle.get(angle, [])) for angle in EXPECTED_REQUIRED_ANGLES},
        )
        verification_logger.info(
            "event=backend_validation_started student_id=%s",
            payload.student_id,
        )
        validation_summary = await _validate_files(
            files_by_angle,
            capture_timestamps_by_angle,
        )
        after_validation_at = perf_counter()
        verification_logger.info(
            "event=backend_validation_passed student_id=%s checked=%s",
            payload.student_id,
            validation_summary.get("total_images_checked", 0),
        )
        verification_logger.info(
            "[verification-timing] integrity validation complete ms=%s",
            round((after_validation_at - after_file_access_at) * 1000, 2),
        )
    except HTTPException as exc:
        await _close_upload_files(files_by_angle)
        failed_validation = _extract_failed_validation_summary(exc)
        failed_payload = payload.model_copy(
            update={
                "verification_completed": False,
                "total_required_shots": 0,
                "total_accepted_shots": 0,
                "angles": [],
            }
        )
        failed_entry = _build_enrollment_entry(
            payload=failed_payload,
            uploaded_images=uploaded_images,
            validation_summary=failed_validation,
            frame_metadata_by_path={},
            status_override="pending",
        )
        try:
            _persist_enrollment_metadata(
                failed_entry,
                mode="final",
                event_type="enrollment_failed",
                event_message=(
                    f"Final enrollment validation failed for student_id={payload.student_id}"
                ),
                update_existing=True,
            )
        except (
            OSError,
            EnrollmentPersistenceError,
            EnrollmentNotFoundError,
            EnrollmentInvalidStateError,
            StudentAlreadyRegisteredError,
        ):
            # Validation response should still be returned even if persistence fallback fails.
            verification_logger.exception(
                "[verification] failed to persist validation failure student_id=%s",
                payload.student_id,
            )
        raise exc

    try:
        verification_logger.info("event=storage_started student_id=%s", payload.student_id)
        uploaded_images = await save_uploaded_images(
            payload.student_id,
            files_by_angle,
        )
        after_file_save_at = perf_counter()
        verification_logger.info(
            "event=storage_succeeded student_id=%s saved=%s",
            payload.student_id,
            sum(len(paths) for paths in uploaded_images.values()),
        )
        verification_logger.info(
            "[verification-timing] file save complete ms=%s",
            round((after_file_save_at - after_validation_at) * 1000, 2),
        )
    except ValueError as exc:
        raise _bad_request(str(exc)) from exc
    except OSError as exc:
        verification_logger.exception(
            "event=storage_failed student_id=%s",
            payload.student_id,
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": "STORAGE_UNAVAILABLE",
                "message": "Enrollment image storage is temporarily unavailable.",
            },
        ) from exc

    return (
        payload,
        uploaded_images,
        validation_summary,
        {
            "form_parse_file_access_ms": round(
                (after_file_access_at - multipart_started_at) * 1000, 2
            ),
            "metadata_parse_ms": round(
                (after_metadata_parse_at - after_form_parse_at) * 1000, 2
            ),
            "integrity_validation_ms": round(
                (after_validation_at - after_file_access_at) * 1000, 2
            ),
            "save_files_ms": round((after_file_save_at - after_validation_at) * 1000, 2),
            "multipart_total_ms": round(
                (after_file_save_at - multipart_started_at) * 1000, 2
            ),
        },
    )


_STUDENT_ID_PATTERN = re.compile(r"^[\d-]+$")


class StudentIdValidationRequest(BaseModel):
    student_id: str


class StudentInfo(BaseModel):
    student_id: str
    name: str

class StudentIdValidationResponse(BaseModel):
    valid: bool
    reason: str | None = None
    student: StudentInfo | None = None


@router.post("/enroll/validate-id", response_model=StudentIdValidationResponse)
@limiter.limit("20/minute")
async def validate_student_id(
    request: Request,
    body: StudentIdValidationRequest,
) -> StudentIdValidationResponse:
    """
    Read-only pre-flight check for the enrollment Step 1 UI.
    No data is written to the database.

    Returns:
        {valid: true}                              — ID is well-formed and not yet enrolled
        {valid: false, reason: "invalid_format"}   — ID doesn't match NNN-NN-NNNN
        {valid: false, reason: "already_registered"} — active enrollment already exists
    """
    enroll_logger.info("[validate-id] checking student_id=%s", body.student_id)

    normalized = body.student_id.strip()

    if not _STUDENT_ID_PATTERN.match(normalized):
        enroll_logger.info("[validate-id] invalid_format student_id=%s", normalized)
        return StudentIdValidationResponse(valid=False, reason="invalid_format")

    try:
        student_record = get_student_by_id(normalized)
    except EnrollmentPersistenceError:
        enroll_logger.exception(
            "[validate-id] db error while checking student_id=%s", normalized
        )
        # Fail open — don't block enrollment for a transient DB error.
        return StudentIdValidationResponse(valid=True, reason=None)

    if student_record:
        enroll_logger.info("[validate-id] already_registered student_id=%s", normalized)
        return StudentIdValidationResponse(
            valid=False,
            reason="already_registered",
            student=StudentInfo(student_id=student_record.student_id, name=student_record.full_name)
        )

    enroll_logger.info("[validate-id] valid student_id=%s", normalized)
    return StudentIdValidationResponse(valid=True, reason=None)


@router.post("/enroll")
@limiter.limit("10/minute")
async def enroll(request: Request) -> JSONResponse:
    mode = "basic"
    event_type = "basic_info_uploaded"
    event_message = "Basic enrollment info submitted."

    try:
        try:
            raw_payload = await request.json()
        except json.JSONDecodeError:
            return _json_result(
                status_code=422,
                success=False,
                message="Invalid JSON payload.",
            )

        enroll_logger.info("[enrollment] incoming payload=%s", raw_payload)

        missing_fields = _missing_required_fields(raw_payload)
        if missing_fields:
            return _json_result(
                status_code=422,
                success=False,
                message=f"Missing required field(s): {', '.join(missing_fields)}",
                missing_fields=missing_fields,
            )

        try:
            payload = EnrollmentRequest.model_validate(raw_payload)
        except ValidationError as exc:
            enroll_logger.warning(
                "[enrollment] payload validation failed errors=%s",
                exc.errors(),
            )
            return _json_result(
                status_code=422,
                success=False,
                message="Invalid enrollment payload.",
                errors=exc.errors(),
            )


        try:
            if student_exists_in_db(payload.student_id):
                return _json_result(
                    status_code=200,
                    success=False,
                    message="You are already registered",
                )
        except EnrollmentPersistenceError:
            enroll_logger.exception(
                "[enrollment] failed while checking existing enrollment student_id=%s",
                payload.student_id,
            )

        entry = _build_enrollment_entry(
            payload=payload,
            uploaded_images=empty_uploaded_images(),
            validation_summary=_default_validation_summary(),
            frame_metadata_by_path={},
            status_override="pending" if mode == "basic" else None,
        )

        try:
            _persist_enrollment_metadata(
                entry,
                mode=mode,
                event_type=event_type,
                event_message=event_message,
            )
            enroll_logger.info(
                "[enrollment] created student_id=%s mode=%s status=%s",
                payload.student_id,
                mode,
                entry.get("status", "unknown"),
            )
        except StudentAlreadyRegisteredError:
            return _json_result(
                status_code=200,
                success=False,
                message="You are already registered",
            )
        except (OSError, EnrollmentPersistenceError) as exc:
            enroll_logger.exception(
                "[enrollment] failed to persist metadata student_id=%s",
                payload.student_id,
            )
            return _json_result(
                status_code=500,
                success=False,
                message="Failed to save enrollment metadata.",
                error=str(exc),
            )

        return _json_result(
            status_code=200,
            success=True,
            message="Enrollment saved successfully",
        )
    except Exception as exc:
        enroll_logger.exception("[enrollment] unhandled exception in /enroll")
        return _json_result(
            status_code=500,
            success=False,
            message="Internal server error during enrollment.",
            error=str(exc),
        )


@router.post("/enroll/verification", response_model=EnrollmentResponse)
@limiter.limit("20/minute")
async def enroll_verification(request: Request) -> EnrollmentResponse:
    request_started_at = perf_counter()
    total_uploaded_bytes = 0
    verification_logger.info("[verification-timing] route entered")
    verification_logger.info(
        "event=enrollment_submit_started path=/enroll/verification request_id=%s",
        getattr(request.state, "request_id", None),
    )
    try:
        _validate_verification_request_origin(request)

        content_type = request.headers.get("content-type", "").lower()
        if "multipart/form-data" not in content_type:
            raise HTTPException(
                status_code=415,
                detail={"message": "Unsupported content type for /enroll/verification. Use multipart form data."},
            )

        try:
            (
                payload,
                uploaded_images,
                validation_summary,
                multipart_timing,
            ) = await _handle_multipart_enrollment(
                request
            )
            total_uploaded_bytes = _total_uploaded_bytes_from_validation_summary(
                validation_summary
            )
            verification_logger.info(
                "[verification] uploaded bytes=%s student_id=%s",
                total_uploaded_bytes,
                payload.student_id,
            )
            total_uploaded_files = sum(
                len(uploaded_images.get(angle, [])) for angle in ALLOWED_ANGLES
            )
            verification_logger.info(
                "[verification] upload received student_id=%s files=%s",
                payload.student_id,
                total_uploaded_files,
            )
            verification_logger.info(
                "[verification-timing] multipart breakdown form_parse_file_access_ms=%s metadata_parse_ms=%s integrity_validation_ms=%s save_files_ms=%s multipart_total_ms=%s",
                multipart_timing.get("form_parse_file_access_ms", 0.0),
                multipart_timing.get("metadata_parse_ms", 0.0),
                multipart_timing.get("integrity_validation_ms", 0.0),
                multipart_timing.get("save_files_ms", 0.0),
                multipart_timing.get("multipart_total_ms", 0.0),
            )
        except HTTPException as exc:
            failed_validation = _extract_failed_validation_summary(exc)
            total_uploaded_bytes = _total_uploaded_bytes_from_validation_summary(
                failed_validation
            )
            verification_logger.info(
                "[verification] uploaded bytes=%s",
                total_uploaded_bytes,
            )
            verification_logger.warning(
                "[verification] request failed detail=%s",
                exc.detail,
            )
            raise

        entry = _build_enrollment_entry(
            payload=payload,
            uploaded_images=uploaded_images,
            validation_summary=validation_summary,
            frame_metadata_by_path=_build_frame_metadata_by_path(
                uploaded_images,
                validation_summary,
            ),
        )

        try:
            verification_logger.info(
                "event=db_write_started student_id=%s",
                payload.student_id,
            )
            _persist_enrollment_metadata(
                entry,
                mode="final",
                event_type="enrollment_validated",
                event_message="Final enrollment submitted with validated images.",
                update_existing=True,
            )
        except EnrollmentNotFoundError:
            verification_logger.warning(
                "[verification] no pending enrollment found for student_id=%s",
                payload.student_id,
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "ENROLLMENT_NOT_FOUND",
                    "message": "No pending enrollment was found. Submit basic information first.",
                },
            )
        except EnrollmentInvalidStateError as exc:
            verification_logger.warning(
                "[verification] invalid enrollment state student_id=%s status_error=%s",
                payload.student_id,
                str(exc),
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "ENROLLMENT_ALREADY_EXISTS",
                    "message": "This student already has an enrollment record.",
                },
            ) from exc
        except (OSError, EnrollmentPersistenceError) as exc:
            verification_logger.exception(
                "event=db_write_failed student_id=%s",
                payload.student_id,
            )
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "DATABASE_UNAVAILABLE",
                    "message": "Enrollment database is temporarily unavailable.",
                },
            ) from exc
        verification_logger.info(
            "event=db_write_succeeded student_id=%s",
            payload.student_id,
        )

        verification_logger.info(
            "[verification] verification completed for student_id=%s",
            payload.student_id,
        )
        verification_logger.info(
            "event=enrollment_submit_success student_id=%s total_images=%s",
            payload.student_id,
            payload.total_accepted_shots,
        )
        return EnrollmentResponse(
            success=True,
            message="Verification images uploaded successfully",
        )
    except HTTPException as exc:
        return _verification_error_response(exc)
    except Exception as exc:
        verification_logger.exception(
            "[verification] unhandled exception error=%r traceback=%s",
            exc,
            traceback.format_exc(),
        )
        detail: dict[str, object] = {
            "error": "ENROLLMENT_SUBMIT_FAILED",
            "message": "Enrollment submission failed unexpectedly. Your captures are preserved; retry submission.",
        }
        if settings.environment == "development":
            detail["debug_error"] = repr(exc)
            detail["error_type"] = type(exc).__name__
            detail["traceback"] = traceback.format_exc()
        return JSONResponse(
            status_code=500,
            content=detail,
        )
    finally:
        elapsed_ms = round((perf_counter() - request_started_at) * 1000, 2)
        verification_logger.info("[verification-timing] total route ms=%s", elapsed_ms)
        verification_logger.info(
            "[verification] route elapsed_ms=%s total_uploaded_bytes=%s",
            elapsed_ms,
            total_uploaded_bytes,
        )
