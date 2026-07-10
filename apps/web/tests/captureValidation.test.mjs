import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPoseState,
  hasStableCaptureWindow,
  isFrameLocallyAcceptable,
  normalizeYawForUser,
  shouldResetStabilityWindow,
} from '../features/registration/capture/captureValidation.ts';

import { enrollmentValidationConfig } from '../features/registration/capture/enrollmentValidationConfig.ts';

test('left and right capture only accept their matching pose polarity', () => {
  const thresholds = enrollmentValidationConfig.poseThresholds;
  assert.equal(getPoseState('left', thresholds, 20, 0), 'valid');
  assert.equal(getPoseState('left', thresholds, -20, 0), 'invalid');
  assert.equal(getPoseState('right', thresholds, -20, 0), 'valid');
  assert.equal(getPoseState('right', thresholds, 20, 0), 'invalid');
});

test('up and down capture require the corrected pose envelope', () => {
  const thresholds = enrollmentValidationConfig.poseThresholds;
  assert.equal(getPoseState('up', thresholds, 0, 20), 'valid');
  assert.equal(getPoseState('up', thresholds, 0, 4), 'invalid');
  assert.equal(getPoseState('down', thresholds, 0, -20), 'valid');
  assert.equal(getPoseState('down', thresholds, 0, -3), 'invalid');
});

test('up cannot auto-capture immediately after the angle changes', () => {
  assert.equal(shouldResetStabilityWindow('right', 'up'), true);
  assert.equal(
    hasStableCaptureWindow(
      0,
      enrollmentValidationConfig.stabilityDurationMs - 1,
      enrollmentValidationConfig.stabilityDurationMs
    ),
    false
  );
  assert.equal(
    hasStableCaptureWindow(
      100,
      100 + enrollmentValidationConfig.stabilityDurationMs,
      enrollmentValidationConfig.stabilityDurationMs
    ),
    true
  );
});

test('angle changes reset the stability window before auto-capture', () => {
  assert.equal(shouldResetStabilityWindow('right', 'up'), true);
  assert.equal(
    hasStableCaptureWindow(
      0,
      500,
      enrollmentValidationConfig.stabilityDurationMs
    ),
    false
  );
});

test('capture requires the pose to remain stable long enough', () => {
  assert.equal(
    hasStableCaptureWindow(
      100,
      800,
      enrollmentValidationConfig.stabilityDurationMs
    ),
    true
  );
  assert.equal(
    hasStableCaptureWindow(
      200,
      700,
      enrollmentValidationConfig.stabilityDurationMs
    ),
    false
  );
});

test('local frame gate rejects blurry, dark, too-small, and multi-face frames', () => {
  const accepted = isFrameLocallyAcceptable({
    singleFace: true,
    angleValid: true,
    sizeOk: true,
    centered: true,
    edgeOk: true,
    eyesVisible: true,
    sharpEnough: true,
    brightnessOk: true,
    resolutionOk: true,
  });

  assert.equal(accepted, true);
  assert.equal(
    isFrameLocallyAcceptable({
      singleFace: false,
      angleValid: true,
      sizeOk: true,
      centered: true,
      edgeOk: true,
      eyesVisible: true,
      sharpEnough: true,
      brightnessOk: true,
      resolutionOk: true,
    }),
    false
  );
  assert.equal(
    isFrameLocallyAcceptable({
      singleFace: true,
      angleValid: true,
      sizeOk: true,
      centered: true,
      edgeOk: true,
      eyesVisible: true,
      sharpEnough: false,
      brightnessOk: true,
      resolutionOk: true,
    }),
    false
  );
  assert.equal(
    isFrameLocallyAcceptable({
      singleFace: true,
      angleValid: true,
      sizeOk: true,
      centered: true,
      edgeOk: true,
      eyesVisible: true,
      sharpEnough: true,
      brightnessOk: false,
      resolutionOk: true,
    }),
    false
  );
  assert.equal(
    isFrameLocallyAcceptable({
      singleFace: true,
      angleValid: true,
      sizeOk: false,
      centered: true,
      edgeOk: true,
      eyesVisible: true,
      sharpEnough: true,
      brightnessOk: true,
      resolutionOk: true,
    }),
    false
  );
});

test('yaw normalization matches the corrected user-facing polarity', () => {
  assert.equal(normalizeYawForUser(18), -18);
  assert.equal(normalizeYawForUser(-18), 18);
});
