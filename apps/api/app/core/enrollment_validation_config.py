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
        "front": PoseThreshold(yaw_min=-10, yaw_max=10, pitch_min=-8, pitch_max=8),
        "left": PoseThreshold(yaw_min=-35, yaw_max=-15, pitch_min=-10, pitch_max=10),
        "right": PoseThreshold(yaw_min=15, yaw_max=35, pitch_min=-10, pitch_max=10),
        "up": PoseThreshold(yaw_min=-10, yaw_max=10, pitch_min=-30, pitch_max=-12),
        "down": PoseThreshold(yaw_min=-10, yaw_max=10, pitch_min=12, pitch_max=30),
    },
)
