# Enrollment Quality Checklist

> Biometric enrollment validation checklist for DIU Lens.
> Current tuning guide: `docs/enrollment-threshold-tuning.md`.
> Threshold source of truth: `apps/api/app/core/enrollment_validation_config.py`
> and `apps/web/features/registration/capture/enrollmentValidationConfig.ts`.

---

## Capture Matrix

DIU Lens enrolls students through five strict camera angles. Each angle requires three accepted frames:

| Angle          | Required Frames | Type             |
|----------------|-----------------|------------------|
| `front`        | 3               | Guided           |
| `left`         | 3               | Guided           |
| `right`        | 3               | Guided           |
| `up`           | 3               | Guided           |
| `down`         | 3               | Guided           |
| **Total**      | **15**          |                  |

Detection runs via **MediaPipe Face Landmarker** in the browser at ~90ms intervals (`detectionIntervalMs = 90`).

---

## Face Detection

- [ ] **`[CRITICAL]`** Face detected in frame via MediaPipe Face Landmarker
- [ ] **`[CRITICAL]`** Single face detected (multi-face rejection)
- [ ] **`[HIGH]`** Face landmarks sufficient for pose estimation (landmark count and confidence above internal MediaPipe threshold)
- [ ] **`[HIGH]`** Detection runs at ~90ms intervals (`detectionIntervalMs`)
- [ ] **`[MEDIUM]`** Detection failure feedback shown within 300ms

---

## Face Centering

- [ ] **`[CRITICAL]`** Face center within `MAX_CENTER_OFFSET` (0.24) of frame center (normalized, both axes)
- [ ] **`[CRITICAL]`** Capture is blocked when face center exceeds `MAX_CENTER_OFFSET`
- [ ] **`[HIGH]`** Visual guide overlay shows ideal face position (bounding oval / silhouette)
- [ ] **`[MEDIUM]`** Real-time centering feedback (too far left / right / up / down)

---

## Face Size Validation

- [ ] **`[CRITICAL]`** Face area ratio ≥ `MIN_FACE_AREA_RATIO` (0.09) of total frame area
- [ ] **`[CRITICAL]`** Face area ratio ≤ `MAX_FACE_AREA_RATIO` (0.35)
- [ ] **`[HIGH]`** "Move closer" prompt when face too small
- [ ] **`[HIGH]`** "Move further" prompt when face too large
- [ ] **`[MEDIUM]`** Visual size guide (silhouette or bounding oval overlay)

---

## Lighting Validation

- [ ] **`[CRITICAL]`** Brightness within range: `MIN_BRIGHTNESS` (70) – `MAX_BRIGHTNESS` (200)
- [ ] **`[HIGH]`** "Improve lighting" feedback when outside configured brightness range
- [ ] **`[MEDIUM]`** Even lighting detection (no harsh single-sided shadows)

---

## Blur Validation

- [ ] **`[CRITICAL]`** Blur variance above `MIN_BLUR_VARIANCE` (45)
- [ ] **`[HIGH]`** "Hold steady" feedback when blur is below configured threshold
- [ ] **`[MEDIUM]`** Motion blur detection during capture (frame-to-frame delta analysis)

---

## Eye Visibility

- [ ] **`[HIGH]`** Eyes visible in every accepted enrollment capture
- [ ] **`[HIGH]`** At least one eye visible in side-angle captures (`left`, `right`)
- [ ] **`[MEDIUM]`** Eye landmark confidence threshold met (server validates via `eyes_visible` field: `passed` / `failed` / `not_yet_implemented`)
- [ ] **`[MEDIUM]`** Sunglasses / occlusion detection (degrades embedding quality)

---

## Head Pose Validation

Angle thresholds sourced from centralized enrollment validation config:

- [ ] **`[CRITICAL]`** **Front:** yaw −10° to 10°, pitch −8° to 8°
- [ ] **`[CRITICAL]`** **Left:** yaw −35° to −15°, pitch −10° to 10°
- [ ] **`[CRITICAL]`** **Right:** yaw 15° to 35°, pitch −10° to 10°
- [ ] **`[CRITICAL]`** **Up:** yaw −10° to 10°, pitch −30° to −12°
- [ ] **`[CRITICAL]`** **Down:** yaw −10° to 10°, pitch 12° to 30°
- [ ] **`[CRITICAL]`** Stability window of `STABILITY_WINDOW_MS` (650ms) held before auto-capture triggers
- [ ] **`[MEDIUM]`** Stability grace period of `STABILITY_GRACE_MS` (280ms) prevents jitter resets

---

## Upload Validation

Client-side gates in `api.ts` and server-side gates in `enroll.py`:

- [ ] **`[CRITICAL]`** Each capture file > `MIN_CAPTURE_FILE_SIZE_BYTES` (10 KB = 10 × 1024 bytes)
- [ ] **`[CRITICAL]`** Content type is `image/jpeg` or `image/png` (`ALLOWED_CAPTURE_CONTENT_TYPES`)
- [ ] **`[CRITICAL]`** All five required angles present before submission (`front`, `left`, `right`, `up`, `down`)
- [ ] **`[CRITICAL]`** Each guided angle has 3 frames (`BURST_CAPTURE_FRAME_COUNT`)
- [ ] **`[CRITICAL]`** Total file count matches expected: **15** (5 × 3)
- [ ] **`[HIGH]`** Data URL → Blob conversion validated (MIME prefix parsed, `ArrayBuffer` constructed)
- [ ] **`[HIGH]`** FormData assembled with angle-indexed filenames (pattern: `{angle}_{index}.{ext}`, e.g. `front_1.jpg`)
- [ ] **`[CRITICAL]`** Server expects exactly `REQUIRED_IMAGES_PER_ANGLE` (3) for each required angle

---

## Progress Feedback

- [ ] **`[HIGH]`** Current angle clearly indicated in UI (instruction text + visual highlight)
- [ ] **`[HIGH]`** Per-angle completion status shown (captured frame thumbnails in `CapturedShotStrip`)
- [ ] **`[HIGH]`** Overall progress percentage / ring displayed
- [ ] **`[MEDIUM]`** Capture success animation per frame (burst frame flash)
- [ ] **`[MEDIUM]`** Transition animation between angles
- [ ] **`[MEDIUM]`** Descriptive instruction per angle (from `perAngleInstruction` and `perAngleHint`)
- [ ] **`[HIGH]`** Submission progress indicator during upload

---

## Error Recovery

- [ ] **`[CRITICAL]`** Individual angle retake without losing other angles' captured data
- [ ] **`[HIGH]`** Camera reconnection after permission denial or device change
- [ ] **`[HIGH]`** Session persistence across page refreshes (`captureStorageVersion = 4`, versioned sessionStorage)
- [ ] **`[HIGH]`** Network error during submission allows retry without re-capture
- [ ] **`[HIGH]`** Server validation failure returns actionable per-angle messages
- [ ] **`[MEDIUM]`** Clear session / restart option available (full state reset)
- [ ] **`[MEDIUM]`** Post-capture cooldown (`POST_CAPTURE_COOLDOWN_MS` = 420ms) prevents rapid accidental re-captures

---

## Validation Threshold Reference Table

All values are sourced from `apps/web/features/registration/capture/constants.ts` unless noted otherwise.

| Parameter | Constant | Value | Severity | Notes |
|---|---|---|---|---|
| Face area minimum | `MIN_FACE_AREA_RATIO` | 0.09 | CRITICAL | Ratio of face bbox area to frame area |
| Face area maximum | `MAX_FACE_AREA_RATIO` | 0.35 | CRITICAL | |
| Center offset (soft) | `MAX_CENTER_OFFSET` | 0.24 | CRITICAL | Normalized offset from frame center |
| Blur variance (soft) | `MIN_BLUR_VARIANCE` | 45 | CRITICAL | Laplacian variance threshold |
| Brightness minimum | `MIN_BRIGHTNESS` | 70 | CRITICAL | Pixel intensity (0–255) |
| Brightness maximum | `MAX_BRIGHTNESS` | 200 | CRITICAL | |
| Pose thresholds | `poseThresholds` | See config | CRITICAL | Strict per-angle yaw/pitch bands |
| Stability window | `STABILITY_WINDOW_MS` | 650 ms | CRITICAL | Pose must hold this long before capture |
| Stability grace | `STABILITY_GRACE_MS` | 280 ms | MEDIUM | Prevents jitter resets |
| Post-capture cooldown | `POST_CAPTURE_COOLDOWN_MS` | 420 ms | MEDIUM | Debounce between burst frames |
| Guidance stick time | `GUIDANCE_STICK_MS` | 800 ms | MEDIUM | Instruction debounce |
| Detection interval | `detectionIntervalMs` | 90 ms | HIGH | `useFaceCapture.ts` |
| Min file size | `MIN_CAPTURE_FILE_SIZE_BYTES` | 10 KB | CRITICAL | `api.ts`, `useFaceCapture.ts` |
| Allowed content types | `ALLOWED_CAPTURE_CONTENT_TYPES` | `image/jpeg`, `image/png` | CRITICAL | `api.ts` |
| Burst frame count | `BURST_CAPTURE_FRAME_COUNT` | 3 | CRITICAL | Per guided angle |
| Total expected frames | — | 15 | CRITICAL | 5 × 3 |
| Server min per angle | `MIN_IMAGES_PER_ANGLE` | 2 | CRITICAL | `enroll.py` |
| Server max per angle | `MAX_IMAGES_PER_ANGLE` | 5 | CRITICAL | `enroll.py` |
| Capture storage version | `captureStorageVersion` | 4 | HIGH | sessionStorage schema version |

## Analytics And Calibration

- `POST /enroll/calibration` validates test images without creating enrollment records.
- `?export=csv` returns a calibration CSV.
- `quality_score` is a diagnostic 0-100 score. It never overrides hard rejection gates.
- pHash duplicate detection rejects visually near-identical replay frames.
- Active liveness is a first defensive layer only; it is not full enterprise PAD.

---

*Last updated: 2026-06-15. Source of truth: `apps/web/features/registration/capture/constants.ts` (client) and `apps/api/app/api/routes/enroll.py` (server).*
