import type { VerificationAngle } from '../verification/types';

export type PoseThreshold = {
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
};

export type PoseValidationState = 'valid' | 'near_valid' | 'invalid';

export function thresholdContains(
  threshold: PoseThreshold,
  yaw: number,
  pitch: number,
  marginBoost: number = 0
) {
  return (
    yaw >= threshold.yawMin - marginBoost &&
    yaw <= threshold.yawMax + marginBoost &&
    pitch >= threshold.pitchMin - marginBoost &&
    pitch <= threshold.pitchMax + marginBoost
  );
}

export function getPoseState(
  angle: VerificationAngle,
  thresholds: Record<
    Exclude<VerificationAngle, 'natural_front'>,
    { valid: PoseThreshold; near: PoseThreshold }
  >,
  yaw: number,
  pitch: number,
  marginBoost: number = 0
): PoseValidationState {
  if (angle === 'natural_front') return 'valid';
  const threshold =
    thresholds[angle as Exclude<VerificationAngle, 'natural_front'>];
  if (!threshold) return 'invalid';
  if (thresholdContains(threshold.valid, yaw, pitch, marginBoost)) {
    return 'valid';
  }
  if (thresholdContains(threshold.near, yaw, pitch, marginBoost)) {
    return 'near_valid';
  }
  return 'invalid';
}

export function normalizeYawForUser(rawYaw: number) {
  return -rawYaw;
}

export function shouldResetStabilityWindow(
  previousAngle: VerificationAngle,
  nextAngle: VerificationAngle
) {
  return previousAngle !== nextAngle;
}

export function hasStableCaptureWindow(
  stableSinceMs: number,
  nowMs: number,
  requiredStableMs: number
) {
  return stableSinceMs > 0 && nowMs - stableSinceMs >= requiredStableMs;
}

export function isFrameLocallyAcceptable({
  singleFace,
  angleValid,
  sizeOk,
  centered,
  edgeOk,
  eyesVisible,
  sharpEnough,
  brightnessOk,
  resolutionOk,
}: {
  singleFace: boolean;
  angleValid: boolean;
  sizeOk: boolean;
  centered: boolean;
  edgeOk: boolean;
  eyesVisible: boolean;
  sharpEnough: boolean;
  brightnessOk: boolean;
  resolutionOk: boolean;
}) {
  return (
    singleFace &&
    angleValid &&
    sizeOk &&
    centered &&
    edgeOk &&
    eyesVisible &&
    sharpEnough &&
    brightnessOk &&
    resolutionOk
  );
}

export function getHybridPoseState(
  angle: VerificationAngle,
  thresholds: Record<
    Exclude<VerificationAngle, 'natural_front'>,
    { valid: PoseThreshold; near: PoseThreshold }
  >,
  yaw: number,
  pitch: number,
  baseline: { yaw: number; pitch: number } | null,
  marginBoost: number = 0
): PoseValidationState {
  const absoluteState = getPoseState(
    angle,
    thresholds,
    yaw,
    pitch,
    marginBoost
  );
  if (absoluteState === 'invalid' || angle === 'natural_front') {
    return absoluteState;
  }
  if (!baseline || angle === 'front') return absoluteState;

  const yawDelta = yaw - baseline.yaw;
  const pitchDelta = pitch - baseline.pitch;
  const delta = {
    yawDegrees: 9,
    pitchDegrees: 6,
    centerYawToleranceDegrees: 16,
    centerPitchToleranceDegrees: 14,
  };
  let moved = false;

  if (angle === 'left') {
    moved =
      yawDelta <= -delta.yawDegrees &&
      Math.abs(pitchDelta) <= delta.centerPitchToleranceDegrees + 8;
  } else if (angle === 'right') {
    moved =
      yawDelta >= delta.yawDegrees &&
      Math.abs(pitchDelta) <= delta.centerPitchToleranceDegrees + 8;
  } else if (angle === 'up') {
    moved =
      pitchDelta >= delta.pitchDegrees &&
      Math.abs(yawDelta) <= delta.centerYawToleranceDegrees + 8;
  } else if (angle === 'down') {
    moved =
      pitchDelta <= -delta.pitchDegrees &&
      Math.abs(yawDelta) <= delta.centerYawToleranceDegrees + 8;
  }

  if (moved) return absoluteState;
  return absoluteState === 'valid' ? 'near_valid' : 'invalid';
}
