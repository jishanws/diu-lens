import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  clearFailedAngleValues,
  failedCaptureAngles,
  formatFailedCaptures,
  parseFailedCaptures,
} from '../features/registration/verification/failedCaptures.ts';
import { enrollmentValidationConfig } from '../features/registration/capture/enrollmentValidationConfig.ts';

test('parses backend failed-capture details and measurements', () => {
  assert.deepEqual(
    parseFailedCaptures({
      error: 'BACKEND_IMAGE_VALIDATION_FAILED',
      details: [
        {
          angle: 'left',
          reason: 'face_off_center(center_offset:0.31,max:0.24)',
          error_code: 'face_off_center',
        },
      ],
    }),
    [
      {
        angle: 'left',
        reason: 'face_off_center(center_offset:0.31,max:0.24)',
        errorCode: 'face_off_center',
        measured: 0.31,
        required: { max: 0.24 },
      },
    ]
  );
});

test('orders multiple failed angles by the capture sequence', () => {
  const failures = parseFailedCaptures({
    error: 'BACKEND_IMAGE_VALIDATION_FAILED',
    details: [
      { angle: 'down', reason: 'image_blurry(score:30,min:45)' },
      { angle: 'right', reason: 'wrong_pose(angle:right,yaw:4.8,pitch:1.2)' },
    ],
  });
  assert.deepEqual(
    failures.map(({ angle }) => angle),
    ['right', 'down']
  );
  assert.deepEqual(failedCaptureAngles(failures), ['right', 'down']);
  assert.deepEqual(failures[0].measured, { yaw: 4.8, pitch: 1.2 });
  assert.equal(failures[1].measured, 30);
  assert.deepEqual(failures[1].required, { min: 45 });
});

test('clears only failed captures and preserves successful captures', () => {
  const captures = {
    front: ['f'],
    left: ['l'],
    right: ['r'],
    up: ['u'],
    down: ['d'],
  };
  assert.deepEqual(clearFailedAngleValues(captures, ['left', 'down']), {
    front: ['f'],
    left: [],
    right: ['r'],
    up: ['u'],
    down: [],
  });
});

test('ignores unknown angles and malformed validation details', () => {
  assert.deepEqual(
    parseFailedCaptures({
      error: 'BACKEND_IMAGE_VALIDATION_FAILED',
      details: [
        { angle: 'sideways', reason: 'wrong_pose' },
        null,
        { angle: 'left' },
      ],
    }),
    []
  );
  assert.deepEqual(
    parseFailedCaptures({ error: 'OTHER_ERROR', details: [] }),
    []
  );
  assert.deepEqual(parseFailedCaptures(null), []);
});

test('formats code-less capture failures without crashing', () => {
  assert.equal(
    formatFailedCaptures([{ angle: 'left', reason: 'face_not_clear' }]),
    'left: face not clear'
  );
});

test('frontend framing thresholds match backend defaults', () => {
  const backendConfig = readFileSync(
    new URL('../../api/app/core/config.py', import.meta.url),
    'utf8'
  );
  const centerOffset = backendConfig.match(
    /ENROLLMENT_MAX_CENTER_OFFSET", "([0-9.]+)"/
  );
  const edgeMargin = backendConfig.match(
    /ENROLLMENT_MIN_EDGE_MARGIN_RATIO", "([0-9.]+)"/
  );
  const blurVariance = backendConfig.match(
    /ENROLLMENT_MIN_BLUR_VARIANCE", "([0-9.]+)"/
  );
  assert.ok(centerOffset);
  assert.ok(edgeMargin);
  assert.ok(blurVariance);
  assert.equal(
    enrollmentValidationConfig.maxCenterOffset,
    Number(centerOffset[1])
  );
  assert.equal(
    enrollmentValidationConfig.minEdgeMarginRatio,
    Number(edgeMargin[1])
  );
  assert.equal(
    enrollmentValidationConfig.minBlurVariance,
    Number(blurVariance[1])
  );
});

test('frontend pose thresholds match backend defaults', () => {
  const backendConfig = readFileSync(
    new URL('../../api/app/core/config.py', import.meta.url),
    'utf8'
  );
  const expected = {
    front: [-18, 18, -18, 18],
    left: [-45, -12, -25, 25],
    right: [12, 45, -25, 25],
    up: [-35, 35, 8, 40],
    down: [-35, 35, -40, -7],
  };

  for (const [angle, values] of Object.entries(expected)) {
    const match = backendConfig.match(
      new RegExp(`ENROLLMENT_POSE_${angle.toUpperCase()}", "([^"]+)"`)
    );
    assert.ok(match);
    assert.deepEqual(match[1].split(',').map(Number), values);
    const threshold = enrollmentValidationConfig.poseThresholds[angle].valid;
    assert.deepEqual(
      [
        threshold.yawMin,
        threshold.yawMax,
        threshold.pitchMin,
        threshold.pitchMax,
      ],
      values
    );
  }
});

test('sharpness failure gives a readable angle-specific retake instruction', () => {
  const failures = parseFailedCaptures({
    error: 'BACKEND_IMAGE_VALIDATION_FAILED',
    details: [
      {
        angle: 'front',
        reason: 'image_blurry(score:34.5,min:35.0)',
        error_code: 'image_blurry',
      },
    ],
  });
  assert.equal(
    formatFailedCaptures(failures),
    'The front photo is slightly blurry. Hold the device steady, clean the camera lens, and retake it in better lighting.'
  );
  assert.equal(failures[0].measured, 34.5);
  assert.deepEqual(failures[0].required, { min: 35 });
});

test('camera export uses fresh standalone canvases without compositing overlays', () => {
  const cameraSource = readFileSync(
    new URL(
      '../features/registration/verification/useCamera.ts',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(
    cameraSource,
    /const sourceCanvas = document\.createElement\('canvas'\)/
  );
  assert.match(cameraSource, /sourceContext\.drawImage\(\s*videoElement,/);
  assert.match(
    cameraSource,
    /const exportCanvas = document\.createElement\('canvas'\)/
  );
  assert.match(cameraSource, /exportContext\.drawImage\(sourceCanvas,/);
  assert.doesNotMatch(
    cameraSource,
    /(sourceContext|exportContext)\.(scale|translate|transform|setTransform)\(/
  );

  const previewSource = readFileSync(
    new URL(
      '../features/registration/capture/CameraPreview.tsx',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(previewSource, /scaleX\(-1\)/);
});

test('multipart upload uses named angle fields and replaces failed angle arrays', () => {
  const apiSource = readFileSync(
    new URL('../features/registration/api.ts', import.meta.url),
    'utf8'
  );
  assert.match(apiSource, /formData\.append\(angle, fileToAppend, fileName\)/);

  const captures = {
    front: ['f'],
    left: ['old'],
    right: ['r'],
    up: ['u'],
    down: ['d'],
  };
  const cleared = clearFailedAngleValues(captures, ['left']);
  assert.deepEqual(
    { ...cleared, left: ['replacement'] },
    {
      front: ['f'],
      left: ['replacement'],
      right: ['r'],
      up: ['u'],
      down: ['d'],
    }
  );
});
