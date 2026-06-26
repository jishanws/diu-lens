import logging
from dataclasses import dataclass
from typing import Any, Literal

import cv2
import numpy as np

from app.core.enrollment_validation_config import (
    ENROLLMENT_VALIDATION_CONFIG,
    EnrollmentValidationConfig,
)

EyesVisibleStatus = Literal["passed", "failed", "not_yet_implemented"]


@dataclass(frozen=True)
class ImageValidationConfig:
    min_blur_variance: float = 45.0
    min_brightness: float = 70.0
    max_brightness: float = 200.0
    min_width: int = 224
    min_height: int = 224
    min_face_size: int = 40
    max_center_offset_front: float = 0.28
    max_center_offset_non_front: float = 0.28
    min_face_area_ratio: float = 0.09

from app.core.config import settings

_CONFIG = ImageValidationConfig(
    min_blur_variance=settings.enrollment_min_blur_variance,
    min_brightness=settings.enrollment_min_brightness,
    min_face_area_ratio=settings.enrollment_min_face_area_ratio,
)
_FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
logger = logging.getLogger("diu_lens.opencv")
_STRICT_FACE_DETECTION_ANGLES: set[str] = {"front"}
_INSIGHTFACE_ANALYZER: Any = None
_INSIGHTFACE_INIT_FAILED = False


def _default_report(file_name: str, angle: str) -> dict[str, Any]:
    return {
        "file_name": file_name,
        "angle": angle,
        "image_size_bytes": 0,
        "readable": False,
        "decoded_shape": None,
        "dimensions": None,
        "passed": False,
        "blur_ok": False,
        "brightness_ok": False,
        "dimensions_ok": False,
        "face_detected": False,
        "face_centered": False,
        "multiple_faces_detected": False,
        "face_count": 0,
        "center_offset": None,
        "max_center_offset": None,
        "face_size_ratio": None,
        "blocker": "unknown",
        "eyes_visible": "not_yet_implemented",
        "failure_reasons": [],
        "blocking_reasons": [],
        "non_blocking_reasons": [],
        "is_blocking_failure": False,
        "final_decision": "reject",
    }


def _append_reason(
    report: dict[str, Any],
    *,
    reason: str,
    blocking: bool,
) -> None:
    target_key = "blocking_reasons" if blocking else "non_blocking_reasons"
    target_reasons = report.get(target_key)
    if not isinstance(target_reasons, list):
        target_reasons = []
    target_reasons.append(reason)
    report[target_key] = target_reasons


def _dimensions_from_shape(decoded_shape: object) -> str:
    if not isinstance(decoded_shape, list) or len(decoded_shape) < 2:
        return "unknown"
    try:
        height = int(decoded_shape[0])
        width = int(decoded_shape[1])
    except (TypeError, ValueError):
        return "unknown"
    return f"{width}x{height}"


def _finalize_guided_sanity_report(report: dict[str, Any]) -> dict[str, Any]:
    blocking_reasons_raw = report.get("blocking_reasons", [])
    non_blocking_reasons_raw = report.get("non_blocking_reasons", [])
    blocking_reasons = (
        [str(reason) for reason in blocking_reasons_raw]
        if isinstance(blocking_reasons_raw, list)
        else []
    )
    non_blocking_reasons = (
        [str(reason) for reason in non_blocking_reasons_raw]
        if isinstance(non_blocking_reasons_raw, list)
        else []
    )
    has_blocking_failure = len(blocking_reasons) > 0

    report["blocking_reasons"] = blocking_reasons
    report["non_blocking_reasons"] = non_blocking_reasons
    # Keep backward compatibility for API consumers already reading failure_reasons.
    report["failure_reasons"] = blocking_reasons
    report["is_blocking_failure"] = has_blocking_failure
    report["passed"] = not has_blocking_failure
    report["final_decision"] = "reject" if has_blocking_failure else "accept"

    if has_blocking_failure:
        report["blocker"] = _reason_code(blocking_reasons[0])
    elif non_blocking_reasons:
        report["blocker"] = _reason_code(non_blocking_reasons[0])
    else:
        report["blocker"] = "ready"

    log_fn = logger.warning if has_blocking_failure else logger.info
    log_fn(
        "[guided-sanity] angle=%s file=%s readable=%s dimensions=%s face_detected=%s blocking=%s "
        "blocking_reasons=%s non_blocking_reasons=%s final_decision=%s",
        report.get("angle", "unknown"),
        report.get("file_name", "unknown"),
        bool(report.get("readable", False)),
        report.get("dimensions", _dimensions_from_shape(report.get("decoded_shape"))),
        bool(report.get("face_detected", False)),
        has_blocking_failure,
        blocking_reasons,
        non_blocking_reasons,
        report.get("final_decision", "reject"),
    )
    return report


def _max_center_offset_for_angle(config: ImageValidationConfig, angle: str) -> float:
    return (
        config.max_center_offset_front
        if angle == "front"
        else config.max_center_offset_non_front
    )


def _reason_code(reason: str) -> str:
    return reason.split("(", 1)[0].strip()


def extract_image_quality_metadata(
    image_bytes: bytes,
    *,
    config: ImageValidationConfig = _CONFIG,
) -> dict[str, float | None]:
    metadata: dict[str, float | None] = {
        "blur_score": None,
        "brightness": None,
        "face_area_ratio": None,
        "center_offset": None,
        "detection_confidence": None,
        "face_box": None,
        "yaw": None,
        "pitch": None,
        "roll": None,
    }
    if not image_bytes:
        return metadata

    try:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except cv2.error as exc:
        logger.exception("[image-metadata] OpenCV decode failed size=%s", len(image_bytes))
        return metadata
    except Exception as exc:  # noqa: BLE001
        logger.exception("[image-metadata] decode failed size=%s", len(image_bytes))
        return metadata

    if image is None:
        logger.warning("[image-metadata] decode returned None size=%s", len(image_bytes))
        return metadata

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        metadata["blur_score"] = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        metadata["brightness"] = float(gray.mean())
    except cv2.error:
        logger.exception("[image-metadata] OpenCV grayscale conversion failed")
        return metadata

    if _FACE_CASCADE.empty():
        return metadata

    try:
        faces = _FACE_CASCADE.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(config.min_face_size, config.min_face_size),
        )
    except cv2.error:
        logger.exception("[image-metadata] OpenCV face detection failed")
        return metadata
    if len(faces) <= 0:
        metadata["detection_confidence"] = 0.0
        return metadata

    metadata["detection_confidence"] = 1.0
    height, width = image.shape[:2]
    largest_face = max(faces, key=lambda f: int(f[2]) * int(f[3]))
    x, y, w, h = [int(v) for v in largest_face]

    if height > 0 and width > 0:
        metadata["face_area_ratio"] = (float(w) * float(h)) / float(width * height)
        face_center_x = x + (w / 2.0)
        face_center_y = y + (h / 2.0)
        face_center_norm_x = face_center_x / float(width)
        face_center_norm_y = face_center_y / float(height)
        metadata["center_offset"] = float(
            np.hypot(face_center_norm_x - 0.5, face_center_norm_y - 0.5)
        )

    return metadata


def _append_failure(report: dict[str, Any], reason: str) -> None:
    reasons = report.get("failure_reasons")
    if not isinstance(reasons, list):
        reasons = []
    reasons.append(reason)
    report["failure_reasons"] = reasons


def _try_load_insightface_analyzer() -> Any | None:
    global _INSIGHTFACE_ANALYZER
    global _INSIGHTFACE_INIT_FAILED

    if _INSIGHTFACE_ANALYZER is not None:
        return _INSIGHTFACE_ANALYZER
    if _INSIGHTFACE_INIT_FAILED:
        return None

    try:
        from insightface.app import FaceAnalysis
        from app.core.config import settings

        analyzer = FaceAnalysis(
            name=settings.insightface_model_pack,
            root=settings.insightface_root,
            providers=["CPUExecutionProvider"],
        )
        analyzer.prepare(ctx_id=-1, det_size=(640, 640))
        _INSIGHTFACE_ANALYZER = analyzer
        return analyzer
    except Exception as exc:  # noqa: BLE001
        _INSIGHTFACE_INIT_FAILED = True
        logger.warning("[enrollment-validation] InsightFace unavailable: %r", exc)
        return None


def _detect_faces_for_enrollment(image: np.ndarray) -> list[dict[str, Any]]:
    analyzer = _try_load_insightface_analyzer()
    if analyzer is not None:
        try:
            faces = analyzer.get(image)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[enrollment-validation] InsightFace detection failed: %r", exc)
            faces = []
        detected: list[dict[str, Any]] = []
        for face in faces:
            bbox = getattr(face, "bbox", None)
            if bbox is None or len(bbox) < 4:
                continue
            pose = getattr(face, "pose", None)
            yaw = pitch = roll = None
            if pose is not None and len(pose) >= 3:
                try:
                    pitch = float(pose[0])
                    yaw = float(pose[1])
                    roll = float(pose[2])
                except (TypeError, ValueError):
                    yaw = pitch = roll = None
            detected.append(
                {
                    "bbox": [float(v) for v in bbox[:4]],
                    "det_score": float(getattr(face, "det_score", 0.0) or 0.0),
                    "yaw": yaw,
                    "pitch": pitch,
                    "roll": roll,
                    "landmarks": getattr(face, "kps", None),
                }
            )
        return detected

    if _FACE_CASCADE.empty():
        return []

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = _FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(40, 40),
    )
    return [
        {
            "bbox": [float(x), float(y), float(x + w), float(y + h)],
            "det_score": 1.0,
            "yaw": 0.0,
            "pitch": 0.0,
            "roll": 0.0,
            "landmarks": None,
        }
        for x, y, w, h in faces
    ]


def _eyes_visible(face: dict[str, Any], face_box: list[float]) -> bool:
    landmarks = face.get("landmarks")
    if landmarks is not None:
        try:
            points = np.asarray(landmarks, dtype=float)
            return points.shape[0] >= 2 and np.isfinite(points[:2]).all()
        except (TypeError, ValueError):
            return False
    x1, y1, x2, y2 = face_box
    return (x2 - x1) > 0 and (y2 - y1) > 0


def _pose_matches(angle: str, yaw: float | None, pitch: float | None) -> bool:
    threshold = ENROLLMENT_VALIDATION_CONFIG.pose_thresholds.get(angle)
    if threshold is None:
        return False
    if yaw is None or pitch is None:
        return False
    return (
        threshold.yaw_min <= yaw <= threshold.yaw_max
        and threshold.pitch_min <= pitch <= threshold.pitch_max
    )


def compute_phash(image: np.ndarray, hash_size: int = 8, highfreq_factor: int = 4) -> str:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (hash_size * highfreq_factor, hash_size * highfreq_factor))
    dct = cv2.dct(np.float32(resized))
    low_freq = dct[:hash_size, :hash_size]
    median = float(np.median(low_freq[1:, 1:]))
    bits = low_freq > median
    value = 0
    for bit in bits.flatten():
        value = (value << 1) | int(bool(bit))
    return f"{value:0{hash_size * hash_size // 4}x}"


def phash_distance(left: str | None, right: str | None) -> int | None:
    if not left or not right:
        return None
    try:
        return int(int(left, 16) ^ int(right, 16)).bit_count()
    except ValueError:
        return None


def _normalized_score(value: float, low: float, high: float) -> float:
    if high <= low:
        return 0.0
    return max(0.0, min(1.0, (value - low) / (high - low)))


def _quality_score(
    *,
    det_score: float,
    blur_score: float,
    brightness_score: float,
    face_area_ratio: float,
    center_offset: float,
    yaw: float | None,
    pitch: float | None,
    angle: str,
    config: EnrollmentValidationConfig,
) -> float:
    detection_component = _normalized_score(det_score, config.min_detection_score, 1.0)
    blur_component = _normalized_score(blur_score, config.min_blur_variance, config.min_blur_variance * 3.0)
    brightness_mid = (config.min_brightness + config.max_brightness) / 2.0
    brightness_half_range = max(1.0, (config.max_brightness - config.min_brightness) / 2.0)
    brightness_component = max(0.0, 1.0 - abs(brightness_score - brightness_mid) / brightness_half_range)
    face_mid = (config.min_face_area_ratio + config.max_face_area_ratio) / 2.0
    face_half_range = max(0.001, (config.max_face_area_ratio - config.min_face_area_ratio) / 2.0)
    face_size_component = max(0.0, 1.0 - abs(face_area_ratio - face_mid) / face_half_range)
    center_component = max(0.0, 1.0 - center_offset / max(config.max_center_offset, 0.001))
    pose_component = 0.0
    threshold = config.pose_thresholds.get(angle)
    if threshold is not None and yaw is not None and pitch is not None:
        yaw_mid = (threshold.yaw_min + threshold.yaw_max) / 2.0
        pitch_mid = (threshold.pitch_min + threshold.pitch_max) / 2.0
        yaw_half = max(1.0, (threshold.yaw_max - threshold.yaw_min) / 2.0)
        pitch_half = max(1.0, (threshold.pitch_max - threshold.pitch_min) / 2.0)
        yaw_score = max(0.0, 1.0 - abs(yaw - yaw_mid) / yaw_half)
        pitch_score = max(0.0, 1.0 - abs(pitch - pitch_mid) / pitch_half)
        pose_component = (yaw_score + pitch_score) / 2.0
    score = (
        detection_component * 20.0
        + blur_component * 20.0
        + brightness_component * 15.0
        + face_size_component * 15.0
        + center_component * 15.0
        + pose_component * 15.0
    )
    return round(max(0.0, min(100.0, score)), 2)


def validate_enrollment_image(
    image_bytes: bytes,
    file_name: str,
    angle: str,
    config: EnrollmentValidationConfig = ENROLLMENT_VALIDATION_CONFIG,
) -> dict[str, Any]:
    report = _default_report(file_name=file_name, angle=angle)
    report["image_size_bytes"] = len(image_bytes)
    report.update(
        {
            "detection_score": None,
            "blur_score": None,
            "brightness_score": None,
            "face_box": None,
            "yaw": None,
            "pitch": None,
            "roll": None,
            "quality_score": None,
            "perceptual_hash": None,
            "duplicate_distance": None,
            "replay_flags": [],
            "crop_alignment_success": False,
        }
    )

    if not image_bytes:
        _append_failure(report, "missing_image_data")
        return _finalize_strict_enrollment_report(report)

    try:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except cv2.error:
        logger.exception("[enrollment-validation] decode failed file=%s", file_name)
        _append_failure(report, "invalid_image_data")
        return _finalize_strict_enrollment_report(report)

    if image is None:
        _append_failure(report, "invalid_image_data")
        return _finalize_strict_enrollment_report(report)

    report["readable"] = True
    report["decoded_shape"] = [int(v) for v in image.shape]
    height, width = image.shape[:2]
    report["dimensions"] = f"{width}x{height}"
    report["dimensions_ok"] = width >= config.min_width and height >= config.min_height
    if not report["dimensions_ok"]:
        _append_failure(
            report,
            f"image_too_small(min:{config.min_width}x{config.min_height},got:{width}x{height})",
        )

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness_score = float(gray.mean())
        report["perceptual_hash"] = compute_phash(image)
    except cv2.error:
        _append_failure(report, "image_processing_failed")
        return _finalize_strict_enrollment_report(report)

    report["blur_score"] = blur_score
    report["brightness_score"] = brightness_score
    report["brightness"] = brightness_score
    report["blur_ok"] = blur_score >= config.min_blur_variance
    report["brightness_ok"] = config.min_brightness <= brightness_score <= config.max_brightness
    if not report["blur_ok"]:
        _append_failure(report, f"image_blurry(score:{blur_score:.2f},min:{config.min_blur_variance:.2f})")
    if not report["brightness_ok"]:
        _append_failure(
            report,
            f"invalid_brightness(value:{brightness_score:.2f},range:{config.min_brightness:.2f}-{config.max_brightness:.2f})",
        )

    try:
        faces = _detect_faces_for_enrollment(image)
    except cv2.error:
        logger.exception("[enrollment-validation] detector failed file=%s", file_name)
        _append_failure(report, "face_detector_failed")
        return _finalize_strict_enrollment_report(report)

    report["face_count"] = len(faces)
    report["face_detected"] = len(faces) > 0
    report["multiple_faces_detected"] = len(faces) > 1
    if len(faces) == 0:
        _append_failure(report, "face_not_detected")
        return _finalize_strict_enrollment_report(report)
    if len(faces) > 1:
        _append_failure(report, f"multiple_faces_detected(count:{len(faces)})")

    face = max(
        faces,
        key=lambda item: max(0.0, item["bbox"][2] - item["bbox"][0])
        * max(0.0, item["bbox"][3] - item["bbox"][1]),
    )
    x1, y1, x2, y2 = [float(v) for v in face["bbox"]]
    face_w = max(0.0, x2 - x1)
    face_h = max(0.0, y2 - y1)
    face_area_ratio = (face_w * face_h) / max(float(width * height), 1.0)
    center_offset = float(
        np.hypot(((x1 + x2) / 2.0 / max(width, 1)) - 0.5, ((y1 + y2) / 2.0 / max(height, 1)) - 0.5)
    )
    edge_margin = min(x1 / max(width, 1), y1 / max(height, 1), (width - x2) / max(width, 1), (height - y2) / max(height, 1))
    det_score = float(face.get("det_score") or 0.0)
    yaw = face.get("yaw")
    pitch = face.get("pitch")
    roll = face.get("roll")

    report["face_box"] = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
    report["face_area_ratio"] = face_area_ratio
    report["center_offset"] = center_offset
    report["max_center_offset"] = config.max_center_offset
    report["detection_score"] = det_score
    report["detection_confidence"] = det_score
    report["yaw"] = yaw
    report["pitch"] = pitch
    report["roll"] = roll
    report["quality_score"] = _quality_score(
        det_score=det_score,
        blur_score=blur_score,
        brightness_score=brightness_score,
        face_area_ratio=face_area_ratio,
        center_offset=center_offset,
        yaw=yaw,
        pitch=pitch,
        angle=angle,
        config=config,
    )
    report["face_centered"] = center_offset <= config.max_center_offset
    report["crop_alignment_success"] = bool(face_w > 0 and face_h > 0)
    report["eyes_visible"] = "passed" if _eyes_visible(face, [x1, y1, x2, y2]) else "failed"

    if det_score < config.min_detection_score:
        _append_failure(report, f"detection_score_too_low(score:{det_score:.2f},min:{config.min_detection_score:.2f})")
    if face_area_ratio < config.min_face_area_ratio:
        _append_failure(report, f"face_too_small(ratio:{face_area_ratio:.3f},min:{config.min_face_area_ratio:.3f})")
    if face_area_ratio > config.max_face_area_ratio:
        _append_failure(report, f"face_too_large(ratio:{face_area_ratio:.3f},max:{config.max_face_area_ratio:.3f})")
    if not report["face_centered"]:
        _append_failure(report, f"face_off_center(center_offset:{center_offset:.3f},max:{config.max_center_offset:.3f})")
    if edge_margin < config.min_edge_margin_ratio:
        _append_failure(report, f"face_too_close_to_edge(margin:{edge_margin:.3f},min:{config.min_edge_margin_ratio:.3f})")
    if report["eyes_visible"] != "passed":
        _append_failure(report, "eyes_not_visible")
    if not _pose_matches(angle, yaw, pitch):
        _append_failure(report, f"wrong_pose(angle:{angle},yaw:{yaw},pitch:{pitch})")
    if not report["crop_alignment_success"]:
        _append_failure(report, "crop_alignment_failed")

    return _finalize_strict_enrollment_report(report)


def _finalize_strict_enrollment_report(report: dict[str, Any]) -> dict[str, Any]:
    failure_reasons_raw = report.get("failure_reasons", [])
    failure_reasons = (
        [str(reason) for reason in failure_reasons_raw]
        if isinstance(failure_reasons_raw, list)
        else []
    )
    report["failure_reasons"] = failure_reasons
    report["blocking_reasons"] = failure_reasons
    report["non_blocking_reasons"] = []
    report["is_blocking_failure"] = bool(failure_reasons)
    report["passed"] = not failure_reasons
    report["final_decision"] = "reject" if failure_reasons else "accept"
    report["blocker"] = _reason_code(failure_reasons[0]) if failure_reasons else "ready"
    return report


def validate_uploaded_image_integrity(
    image_bytes: bytes,
    file_name: str,
    angle: str,
    config: ImageValidationConfig = _CONFIG,
) -> dict[str, Any]:
    report = _default_report(file_name=file_name, angle=angle)
    failure_reasons: list[str] = []

    if not image_bytes:
        failure_reasons.append("missing_image_data")
        report["failure_reasons"] = failure_reasons
        report["blocker"] = _reason_code(failure_reasons[0])
        return report

    try:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except cv2.error:
        logger.exception(
            "[guided-sanity] OpenCV decode failed file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        failure_reasons.append("invalid_image_data")
        report["failure_reasons"] = failure_reasons
        report["blocker"] = _reason_code(failure_reasons[0])
        return report
    except Exception:  # noqa: BLE001
        logger.exception(
            "[guided-sanity] decode failed file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        failure_reasons.append("invalid_image_data")
        report["failure_reasons"] = failure_reasons
        report["blocker"] = _reason_code(failure_reasons[0])
        return report

    if image is None:
        logger.warning(
            "[guided-sanity] decode returned None file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        failure_reasons.append("invalid_image_data")
        report["failure_reasons"] = failure_reasons
        report["blocker"] = _reason_code(failure_reasons[0])
        return report

    height, width = image.shape[:2]
    dimensions_ok = width >= config.min_width and height >= config.min_height
    report["dimensions_ok"] = dimensions_ok
    if not dimensions_ok:
        failure_reasons.append(
            f"image_too_small(min:{config.min_width}x{config.min_height},got:{width}x{height})"
        )

    # Final-stage gate is intentionally lightweight: we only verify integrity/presence.
    # Quality constraints (lighting/face/angle/blur/centering) are enforced during live capture.
    report["blur_ok"] = True
    report["brightness_ok"] = True
    report["face_detected"] = True
    report["face_centered"] = True

    report["passed"] = len(failure_reasons) == 0
    report["failure_reasons"] = failure_reasons
    report["blocker"] = _reason_code(failure_reasons[0]) if failure_reasons else "ready"
    return report


def validate_uploaded_image_sanity(
    image_bytes: bytes,
    file_name: str,
    angle: str,
    config: ImageValidationConfig = _CONFIG,
) -> dict[str, Any]:
    report = _default_report(file_name=file_name, angle=angle)
    report["image_size_bytes"] = len(image_bytes)
    strict_face_detection = angle in _STRICT_FACE_DETECTION_ANGLES

    if not image_bytes:
        _append_reason(report, reason="missing_image_data", blocking=True)
        return _finalize_guided_sanity_report(report)

    try:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except cv2.error:
        logger.exception(
            "[guided-sanity] OpenCV decode failed file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        _append_reason(report, reason="invalid_image_data", blocking=True)
        return _finalize_guided_sanity_report(report)
    except Exception:  # noqa: BLE001
        logger.exception(
            "[guided-sanity] decode failed file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        _append_reason(report, reason="invalid_image_data", blocking=True)
        return _finalize_guided_sanity_report(report)

    if image is None:
        logger.warning(
            "[guided-sanity] decode returned None file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        _append_reason(report, reason="invalid_image_data", blocking=True)
        return _finalize_guided_sanity_report(report)

    report["readable"] = True
    report["decoded_shape"] = [int(v) for v in image.shape]

    height, width = image.shape[:2]
    report["dimensions"] = f"{width}x{height}"
    dimensions_ok = width >= config.min_width and height >= config.min_height
    report["dimensions_ok"] = dimensions_ok
    if not dimensions_ok:
        _append_reason(
            report,
            reason=(
                f"image_too_small(min:{config.min_width}x{config.min_height},got:{width}x{height})"
            ),
            blocking=True,
        )

    # Sanity validator keeps backend at the same or looser strictness than live capture.
    # Blur/brightness/centering/pose are enforced in live capture only.
    report["blur_ok"] = True
    report["brightness_ok"] = True
    report["face_centered"] = True

    if _FACE_CASCADE.empty():
        _append_reason(
            report,
            reason="face_detector_unavailable",
            blocking=strict_face_detection,
        )
        return _finalize_guided_sanity_report(report)

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = _FACE_CASCADE.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(config.min_face_size, config.min_face_size),
        )
    except cv2.error:
        logger.exception(
            "[guided-sanity] OpenCV face detection failed file=%s angle=%s",
            file_name,
            angle,
        )
        _append_reason(report, reason="face_detector_failed", blocking=True)
        return _finalize_guided_sanity_report(report)

    face_count = len(faces)
    report["face_count"] = face_count
    report["face_detected"] = face_count > 0
    if face_count == 0:
        _append_reason(
            report,
            reason="face_not_detected",
            blocking=strict_face_detection,
        )
    elif face_count > 1:
        face_areas = sorted(
            [int(w) * int(h) for (_, _, w, h) in faces], reverse=True
        )
        largest_area = face_areas[0] if face_areas else 0
        second_largest_area = face_areas[1] if len(face_areas) > 1 else 0
        has_clear_second_face = (
            largest_area > 0 and second_largest_area >= int(largest_area * 0.35)
        )
        if has_clear_second_face:
            report["multiple_faces_detected"] = True
            _append_reason(
                report,
                reason=f"multiple_faces_detected(count:{face_count})",
                blocking=True,
            )

    return _finalize_guided_sanity_report(report)


def validate_uploaded_image(
    image_bytes: bytes,
    file_name: str,
    angle: str,
    config: ImageValidationConfig = _CONFIG,
) -> dict[str, Any]:
    report = _default_report(file_name=file_name, angle=angle)
    failure_reasons: list[str] = []

    try:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except cv2.error:
        logger.exception(
            "[quality-check] OpenCV decode failed file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        failure_reasons.append("invalid_image_data")
        report["failure_reasons"] = failure_reasons
        return report
    except Exception:  # noqa: BLE001
        logger.exception(
            "[quality-check] decode failed file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        failure_reasons.append("invalid_image_data")
        report["failure_reasons"] = failure_reasons
        return report

    if image is None:
        logger.warning(
            "[quality-check] decode returned None file=%s angle=%s size=%s",
            file_name,
            angle,
            len(image_bytes),
        )
        failure_reasons.append("invalid_image_data")
        report["failure_reasons"] = failure_reasons
        return report

    height, width = image.shape[:2]
    dimensions_ok = width >= config.min_width and height >= config.min_height
    report["dimensions_ok"] = dimensions_ok
    if not dimensions_ok:
        failure_reasons.append(
            f"image_too_small(min:{config.min_width}x{config.min_height},got:{width}x{height})"
        )

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    except cv2.error:
        logger.exception(
            "[quality-check] OpenCV grayscale conversion failed file=%s angle=%s",
            file_name,
            angle,
        )
        failure_reasons.append("image_processing_failed")
        report["failure_reasons"] = failure_reasons
        return report

    blur_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    blur_ok = blur_variance >= config.min_blur_variance
    report["blur_ok"] = blur_ok
    if not blur_ok:
        failure_reasons.append(
            f"image_blurry(score:{blur_variance:.2f},min:{config.min_blur_variance:.2f})"
        )

    brightness = float(gray.mean())
    brightness_ok = config.min_brightness <= brightness <= config.max_brightness
    report["brightness_ok"] = brightness_ok
    if not brightness_ok:
        failure_reasons.append(
            f"invalid_brightness(value:{brightness:.2f},range:{config.min_brightness:.2f}-{config.max_brightness:.2f})"
        )

    if _FACE_CASCADE.empty():
        failure_reasons.append("face_detector_unavailable")
        report["failure_reasons"] = failure_reasons
        return report

    try:
        faces = _FACE_CASCADE.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(config.min_face_size, config.min_face_size),
        )
    except cv2.error:
        logger.exception(
            "[quality-check] OpenCV face detection failed file=%s angle=%s",
            file_name,
            angle,
        )
        failure_reasons.append("face_detector_failed")
        report["failure_reasons"] = failure_reasons
        return report
    face_detected = len(faces) > 0
    report["face_detected"] = face_detected
    if not face_detected:
        failure_reasons.append("face_not_detected")
    else:
        largest_face = max(faces, key=lambda f: int(f[2]) * int(f[3]))
        x, y, w, h = [int(v) for v in largest_face]

        face_center_x = x + (w / 2.0)
        face_center_y = y + (h / 2.0)
        image_center_x = width / 2.0
        image_center_y = height / 2.0

        face_center_norm_x = face_center_x / max(width, 1)
        face_center_norm_y = face_center_y / max(height, 1)
        center_offset = float(
            np.hypot(face_center_norm_x - 0.5, face_center_norm_y - 0.5)
        )
        max_center_offset = _max_center_offset_for_angle(config, angle)
        face_size_ratio = (float(w) * float(h)) / max(float(width * height), 1.0)

        report["center_offset"] = center_offset
        report["max_center_offset"] = max_center_offset
        report["face_size_ratio"] = face_size_ratio

        face_centered = center_offset <= max_center_offset
        report["face_centered"] = face_centered
        if not face_centered:
            failure_reasons.append(
                "face_off_center"
                f"(center_offset:{center_offset:.3f},max:{max_center_offset:.3f})"
            )

        face_large_enough = face_size_ratio >= config.min_face_area_ratio
        if not face_large_enough:
            failure_reasons.append(
                "face_too_small"
                f"(ratio:{face_size_ratio:.3f},min:{config.min_face_area_ratio:.3f})"
            )

    # Eyes-visible check is intentionally explicit for this phase.
    report["eyes_visible"] = "not_yet_implemented"

    passed = (
        report["dimensions_ok"]
        and report["blur_ok"]
        and report["brightness_ok"]
        and report["face_detected"]
        and report["face_centered"]
        and (
            report["face_size_ratio"] is None
            or float(report["face_size_ratio"]) >= config.min_face_area_ratio
        )
    )
    report["passed"] = passed
    report["failure_reasons"] = failure_reasons
    report["blocker"] = _reason_code(failure_reasons[0]) if failure_reasons else "ready"

    return report


def build_validation_summary(image_reports: list[dict[str, Any]]) -> dict[str, Any]:
    total_images_checked = len(image_reports)
    total_images_passed = sum(1 for report in image_reports if bool(report.get("passed")))
    failed_images_count = total_images_checked - total_images_passed
    validation_passed = failed_images_count == 0

    return {
        "validation_passed": validation_passed,
        "total_images_checked": total_images_checked,
        "total_images_passed": total_images_passed,
        "failed_images_count": failed_images_count,
        "image_reports": image_reports,
    }
