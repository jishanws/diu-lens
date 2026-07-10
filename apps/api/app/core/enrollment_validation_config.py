from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass(frozen=True)
class PoseThreshold:
    yaw_min: float
    yaw_max: float
    pitch_min: float
    pitch_max: float


@dataclass(frozen=True)
class EnrollmentValidationConfig:
    min_detection_score: float
    min_face_area_ratio: float
    max_face_area_ratio: float
    max_center_offset: float
    min_edge_margin_ratio: float
    min_blur_variance: float
    min_brightness: float
    max_brightness: float
    min_width: int
    min_height: int
    required_samples_per_angle: int
    stability_duration_ms: int
    liveness_challenge_count: int
    pose_thresholds: dict[str, PoseThreshold]


def _pose_threshold(raw: str, angle: str) -> PoseThreshold:
    try:
        yaw_min, yaw_max, pitch_min, pitch_max = (
            float(value.strip()) for value in raw.split(",")
        )
    except (TypeError, ValueError) as exc:
        raise RuntimeError(
            f"ENROLLMENT_POSE_{angle.upper()} must contain four comma-separated numbers"
        ) from exc
    if yaw_min >= yaw_max or pitch_min >= pitch_max:
        raise RuntimeError(f"Invalid enrollment pose range for {angle}")
    return PoseThreshold(yaw_min, yaw_max, pitch_min, pitch_max)


ENROLLMENT_VALIDATION_CONFIG = EnrollmentValidationConfig(
    min_detection_score=settings.enrollment_min_detection_score,
    min_face_area_ratio=settings.enrollment_min_face_area_ratio,
    max_face_area_ratio=settings.enrollment_max_face_area_ratio,
    max_center_offset=settings.enrollment_max_center_offset,
    min_edge_margin_ratio=settings.enrollment_min_edge_margin_ratio,
    min_blur_variance=settings.enrollment_min_blur_variance,
    min_brightness=settings.enrollment_min_brightness,
    max_brightness=settings.enrollment_max_brightness,
    min_width=settings.enrollment_min_width,
    min_height=settings.enrollment_min_height,
    required_samples_per_angle=settings.enrollment_required_samples_per_angle,
    stability_duration_ms=settings.enrollment_stability_duration_ms,
    liveness_challenge_count=settings.enrollment_liveness_challenge_count,
    pose_thresholds={
        "front": _pose_threshold(settings.enrollment_pose_front, "front"),
        "left": _pose_threshold(settings.enrollment_pose_left, "left"),
        "right": _pose_threshold(settings.enrollment_pose_right, "right"),
        "up": _pose_threshold(settings.enrollment_pose_up, "up"),
        "down": _pose_threshold(settings.enrollment_pose_down, "down"),
    },
)
