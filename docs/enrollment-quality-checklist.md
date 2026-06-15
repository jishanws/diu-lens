# Enrollment Quality Checklist

> Biometric enrollment validation checklist for DIU Lens.
> All thresholds are sourced from `apps/web/features/registration/capture/constants.ts`,
> `apps/web/features/registration/capture/useFaceCapture.ts`,
> `apps/web/features/registration/api.ts`, and
> `apps/api/app/core/storage_service.py`.

---

## Capture Matrix

DIU Lens enrolls students through six camera angles. Each angle requires burst frames captured in sequence:

| Angle          | Required Frames | Type             |
|----------------|-----------------|------------------|
| `front`        | 3               | Guided           |
| `left`         | 3               | Guided           |
| `right`        | 3               | Guided           |
| `up`           | 3               | Guided           |
| `down`         | 3               | Guided           |
| `natural_front`| 2               | Relaxed (no strict pose) |
| **Total**      | **17**          |                  |

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
- [ ] **`[CRITICAL]`** Hard rejection at `HARD_MAX_CENTER_OFFSET` (0.32) — capture gated entirely
- [ ] **`[HIGH]`** Visual guide overlay shows ideal face position (bounding oval / silhouette)
- [ ] **`[MEDIUM]`** Real-time centering feedback (too far left / right / up / down)

---

## Face Size Validation

- [ ] **`[CRITICAL]`** Face area ratio ≥ `MIN_FACE_AREA_RATIO` (0.08) of total frame area
- [ ] **`[CRITICAL]`** Face area ratio ≤ `MAX_FACE_AREA_RATIO` (0.35)
- [ ] **`[HIGH]`** "Move closer" prompt when face too small
- [ ] **`[HIGH]`** "Move further" prompt when face too large
- [ ] **`[MEDIUM]`** Visual size guide (silhouette or bounding oval overlay)

---

## Lighting Validation

- [ ] **`[CRITICAL]`** Brightness within soft range: `MIN_BRIGHTNESS` (80) – `MAX_BRIGHTNESS` (180)
- [ ] **`[CRITICAL]`** Hard rejection below `HARD_MIN_BRIGHTNESS` (60) or above `HARD_MAX_BRIGHTNESS` (210)
- [ ] **`[HIGH]`** "Improve lighting" feedback when outside soft range but within hard limits
- [ ] **`[MEDIUM]`** Even lighting detection (no harsh single-sided shadows)

---

## Blur Validation

- [ ] **`[CRITICAL]`** Blur variance above `MIN_BLUR_VARIANCE` (45)
- [ ] **`[CRITICAL]`** Hard rejection below `HARD_MIN_BLUR_VARIANCE` (30) — frame discarded
- [ ] **`[HIGH]`** "Hold steady" feedback when blur detected but above hard minimum
- [ ] **`[MEDIUM]`** Motion blur detection during capture (frame-to-frame delta analysis)

---

## Eye Visibility

- [ ] **`[HIGH]`** Both eyes visible in front-facing captures (`front`, `natural_front`)
- [ ] **`[HIGH]`** At least one eye visible in side-angle captures (`left`, `right`)
- [ ] **`[MEDIUM]`** Eye landmark confidence threshold met (server validates via `eyes_visible` field: `passed` / `failed` / `not_yet_implemented`)
- [ ] **`[MEDIUM]`** Sunglasses / occlusion detection (degrades embedding quality)

---

## Head Pose Validation

Angle thresholds sourced from `ANGLE_THRESHOLDS` in `constants.ts`:

- [ ] **`[CRITICAL]`** **Front:** `|yaw|` < 12°, `|pitch|` < 12° (`frontYawAbs`, `frontPitchAbs`)
- [ ] **`[CRITICAL]`** **Left:** `yaw` > +14° (`leftYaw`)
- [ ] **`[CRITICAL]`** **Right:** `yaw` < −14° (`rightYaw`)
- [ ] **`[CRITICAL]`** **Up:** `pitch` < −10° (negative = looking up) (`upPitch`)
- [ ] **`[CRITICAL]`** **Down:** `pitch` > +10° (positive = looking down) (`downPitch`)
- [ ] **`[HIGH]`** Side poses (`left`, `right`): `|pitch|` within ±18° (`sidePitchAbs`)
- [ ] **`[HIGH]`** Vertical poses (`up`, `down`): `|yaw|` within ±16° (`verticalYawAbs`)
- [ ] **`[CRITICAL]`** Stability window of `STABILITY_WINDOW_MS` (500ms) held before auto-capture triggers
- [ ] **`[MEDIUM]`** Stability grace period of `STABILITY_GRACE_MS` (280ms) prevents jitter resets

---

## Upload Validation

Client-side gates in `api.ts` and server-side gates in `enroll.py`:

- [ ] **`[CRITICAL]`** Each capture file > `MIN_CAPTURE_FILE_SIZE_BYTES` (10 KB = 10 × 1024 bytes)
- [ ] **`[CRITICAL]`** Content type is `image/jpeg` or `image/png` (`ALLOWED_CAPTURE_CONTENT_TYPES`)
- [ ] **`[CRITICAL]`** All five required angles present before submission (`front`, `left`, `right`, `up`, `down`)
- [ ] **`[CRITICAL]`** Each guided angle has 3 frames (`BURST_CAPTURE_FRAME_COUNT`); `natural_front` has 2 frames (`NATURAL_FRONT_FRAME_COUNT`)
- [ ] **`[CRITICAL]`** Total file count matches expected: **17** (5 × 3 + 1 × 2)
- [ ] **`[HIGH]`** Data URL → Blob conversion validated (MIME prefix parsed, `ArrayBuffer` constructed)
- [ ] **`[HIGH]`** FormData assembled with angle-indexed filenames (pattern: `{angle}_{index}.{ext}`, e.g. `front_1.jpg`)
- [ ] **`[MEDIUM]`** Server accepts `MIN_IMAGES_PER_ANGLE` (2) through `MAX_IMAGES_PER_ANGLE` (5) per angle; expects `REQUIRED_IMAGES_PER_ANGLE` (3) for required angles

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
- [ ] **`[HIGH]`** Session persistence across page refreshes (`captureStorageVersion = 3`, versioned localStorage)
- [ ] **`[HIGH]`** Network error during submission allows retry without re-capture
- [ ] **`[HIGH]`** Server validation failure returns actionable per-angle messages
- [ ] **`[MEDIUM]`** Clear session / restart option available (full state reset)
- [ ] **`[MEDIUM]`** Post-capture cooldown (`POST_CAPTURE_COOLDOWN_MS` = 420ms) prevents rapid accidental re-captures

---

## Validation Threshold Reference Table

All values are sourced from `apps/web/features/registration/capture/constants.ts` unless noted otherwise.

| Parameter | Constant | Value | Severity | Notes |
|---|---|---|---|---|
| Face area minimum | `MIN_FACE_AREA_RATIO` | 0.08 | CRITICAL | Ratio of face bbox area to frame area |
| Face area maximum | `MAX_FACE_AREA_RATIO` | 0.35 | CRITICAL | |
| Center offset (soft) | `MAX_CENTER_OFFSET` | 0.24 | CRITICAL | Normalized offset from frame center |
| Center offset (hard) | `HARD_MAX_CENTER_OFFSET` | 0.32 | CRITICAL | Absolute gate — capture blocked |
| Blur variance (soft) | `MIN_BLUR_VARIANCE` | 45 | CRITICAL | Laplacian variance threshold |
| Blur variance (hard) | `HARD_MIN_BLUR_VARIANCE` | 30 | CRITICAL | Frame discarded below this |
| Brightness minimum | `MIN_BRIGHTNESS` | 80 | CRITICAL | Pixel intensity (0–255) |
| Brightness maximum | `MAX_BRIGHTNESS` | 180 | CRITICAL | |
| Brightness hard min | `HARD_MIN_BRIGHTNESS` | 60 | CRITICAL | |
| Brightness hard max | `HARD_MAX_BRIGHTNESS` | 210 | CRITICAL | |
| Front yaw tolerance | `frontYawAbs` | 12° | CRITICAL | |
| Front pitch tolerance | `frontPitchAbs` | 12° | CRITICAL | |
| Left yaw threshold | `leftYaw` | > +14° | CRITICAL | Positive yaw = left turn |
| Right yaw threshold | `rightYaw` | < −14° | CRITICAL | Negative yaw = right turn |
| Up pitch threshold | `upPitch` | < −10° | CRITICAL | Negative pitch = looking up |
| Down pitch threshold | `downPitch` | > +10° | CRITICAL | Positive pitch = looking down |
| Side pitch tolerance | `sidePitchAbs` | ±18° | HIGH | Cross-axis constraint for left/right |
| Vertical yaw tolerance | `verticalYawAbs` | ±16° | HIGH | Cross-axis constraint for up/down |
| Stability window | `STABILITY_WINDOW_MS` | 500 ms | CRITICAL | Pose must hold this long before capture |
| Stability grace | `STABILITY_GRACE_MS` | 280 ms | MEDIUM | Prevents jitter resets |
| Post-capture cooldown | `POST_CAPTURE_COOLDOWN_MS` | 420 ms | MEDIUM | Debounce between burst frames |
| Guidance stick time | `GUIDANCE_STICK_MS` | 800 ms | MEDIUM | Instruction debounce |
| Detection interval | `detectionIntervalMs` | 90 ms | HIGH | `useFaceCapture.ts` |
| Min file size | `MIN_CAPTURE_FILE_SIZE_BYTES` | 10 KB | CRITICAL | `api.ts`, `useFaceCapture.ts` |
| Allowed content types | `ALLOWED_CAPTURE_CONTENT_TYPES` | `image/jpeg`, `image/png` | CRITICAL | `api.ts` |
| Burst frame count | `BURST_CAPTURE_FRAME_COUNT` | 3 | CRITICAL | Per guided angle |
| Natural front frames | `NATURAL_FRONT_FRAME_COUNT` | 2 | CRITICAL | |
| Total expected frames | — | 17 | CRITICAL | 5 × 3 + 1 × 2 |
| Server min per angle | `MIN_IMAGES_PER_ANGLE` | 2 | CRITICAL | `enroll.py` |
| Server max per angle | `MAX_IMAGES_PER_ANGLE` | 5 | CRITICAL | `enroll.py` |
| Capture storage version | `captureStorageVersion` | 3 | HIGH | localStorage schema version |

---

*Last updated: 2026-06-15. Source of truth: `apps/web/features/registration/capture/constants.ts` (client) and `apps/api/app/api/routes/enroll.py` (server).*
