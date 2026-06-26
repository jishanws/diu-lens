# Enrollment Threshold Tuning

DIU Lens must prefer fewer high-quality enrollments over many weak enrollments. Do not weaken validation to make registration faster. Use calibration data to improve camera setup, lighting, user guidance, and only then consider threshold changes.

## Source Of Truth

Backend thresholds are centralized in:

- `apps/api/app/core/enrollment_validation_config.py`
- environment variables documented in `apps/api/.env.example`

Frontend capture thresholds are centralized in:

- `apps/web/features/registration/capture/enrollmentValidationConfig.ts`
- `apps/web/features/registration/capture/constants.ts`

UI components should not hardcode enrollment thresholds. They should consume these config values through capture constants or the validation config.

## Calibration Endpoint

Use `POST /enroll/calibration` to test camera/device quality without creating a student, enrollment, image row, embedding, or approval queue item.

Multipart fields:

- `angle`: optional default angle, one of `front`, `left`, `right`, `up`, `down`.
- image file fields: either use angle names as fields or any image field with `angle` provided.

Example:

```bash
curl -X POST http://127.0.0.1:8000/enroll/calibration \
  -F angle=front \
  -F images=@front-sample-1.jpg \
  -F images=@front-sample-2.jpg
```

CSV export:

```bash
curl -X POST "http://127.0.0.1:8000/enroll/calibration?export=csv" \
  -F angle=front \
  -F images=@front-sample-1.jpg \
  -o calibration.csv
```

The JSON response includes `summary`, per-image `reports`, current `thresholds`, and `threshold_recommendations`.

## Quality Score

`quality_score` is a 0-100 diagnostic score. It is not a substitute for the hard validation gates. A frame can have a visible score and still be rejected.

The score combines:

- detector confidence
- blur score
- brightness score
- face size
- center offset
- pose closeness to the expected angle

Use it to compare cameras and lighting setups. Do not approve a rejected frame because its score appears acceptable.

## pHash Duplicate Detection

DIU Lens computes a perceptual hash (`pHash`) for each uploaded enrollment image. Unlike byte equality, pHash detects visually near-identical images even when JPEG compression or metadata differs.

During enrollment upload:

- near-duplicate frames are rejected with `near_duplicate_frame`
- low perceptual motion across the full sequence is rejected with `low_perceptual_motion_sequence`
- duplicate distance is stored as `duplicate_distance`

This is a basic replay heuristic, not proof of real liveness.

## Active Liveness Limitation

Active liveness asks for random actions such as blink, turn left/right, look up, or look down. It helps block simple static photo and screen replay attempts.

Known limitations:

- It is not enterprise presentation attack detection (PAD).
- It may not detect advanced video replay, deepfake replay, masks, or high-quality screen attacks.
- Blink detection depends on visible eye landmarks and camera quality.
- Pose motion can be imitated by replayed video.

Treat it as a first defensive layer. Keep manual admin review and future PAD upgrades on the roadmap.

## Real Device Test Matrix

For each device and condition, collect calibration samples for all five angles. Record acceptance rate, average quality score, top rejection reasons, and replay flags from the admin Enrollment Quality panel.

### Laptop Webcam

Goal: establish the baseline for campus registration desks.

Steps:

1. Test in normal indoor light.
2. Capture `front`, `left`, `right`, `up`, `down`.
3. Verify face size, center offset, blur, and pose values are comfortably within thresholds.
4. Repeat after moving the laptop slightly lower/higher to simulate desk variation.

Expected action: adjust physical camera placement before changing thresholds.

### Android Phone

Goal: verify common student-device behavior.

Steps:

1. Test front camera in portrait orientation.
2. Test browser permission flow and camera resolution.
3. Run calibration samples in normal light.
4. Confirm no threshold is lowered for low-resolution streams; guide users to improve position and lighting.

Expected action: document unsupported or weak Android browser/camera combinations.

### iPhone

Goal: verify Safari camera and exposure behavior.

Steps:

1. Test Safari on current iOS.
2. Run all five angles in normal light.
3. Repeat with backlight from a window.
4. Compare brightness and blur distributions with laptop and Android.

Expected action: tune on-screen lighting guidance, not thresholds, if Safari over/under-exposes.

### Low Light

Goal: ensure poor lighting is rejected.

Steps:

1. Dim room lighting until brightness rejection appears.
2. Confirm rejection reason is `invalid_brightness`.
3. Turn on room lighting and repeat.
4. Confirm acceptance improves without changing thresholds.

Expected action: add room lighting instructions or registration-desk lighting.

### Bright Light

Goal: ensure overexposure is rejected.

Steps:

1. Face a bright window or strong direct light.
2. Confirm high brightness rejection appears.
3. Move away from direct light and repeat.

Expected action: improve operator guidance and station placement.

### Phone-Photo Replay Attack

Goal: verify first-layer replay defenses.

Steps:

1. Display a student face photo on a phone.
2. Try to complete active liveness.
3. Try repeated near-identical frames and slight hand movement.
4. Confirm failures appear as liveness failure, `near_duplicate_frame`, or `low_perceptual_motion_sequence`.
5. Repeat with a replayed video and document whether it bypasses the first layer.

Expected action: do not claim enterprise PAD. If video replay succeeds, prioritize dedicated PAD or challenge-response improvements.

## Tuning Process

1. Collect at least 30 calibration attempts per device category before changing thresholds.
2. Export admin Enrollment Quality JSON and calibration CSV for each session.
3. Group failures by device and condition.
4. Fix environment first: lighting, camera placement, distance, browser support.
5. Fix guidance second: clearer prompts for centering, distance, lighting, and pose.
6. Only adjust thresholds after evidence shows a good device/environment consistently fails a non-essential boundary.
7. Never lower core gates for face count, pose category, duplicate/replay flags, or liveness completion.

## Recommended Initial Review Targets

- Average quality score should trend above 75 for accepted samples.
- Rejection reasons should be explainable and actionable.
- Duplicate/replay flags should be rare for normal users and common for replay attempts.
- Each angle should have balanced acceptance. A single weak angle often indicates confusing guidance or camera placement.
