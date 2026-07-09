import type { VerificationAngle } from '@/features/registration/verification/types';
import { enrollmentValidationConfig } from '@/features/registration/capture/enrollmentValidationConfig';

export const guidedAngles: VerificationAngle[] = [
  'front',
  'left',
  'right',
  'up',
  'down',
];
export const naturalFrontAngle: VerificationAngle = 'natural_front';
export const captureAngles: VerificationAngle[] = [...guidedAngles];
export const BURST_CAPTURE_FRAME_COUNT = enrollmentValidationConfig.requiredSamplesPerAngle;
export const NATURAL_FRONT_FRAME_COUNT = 2;

export function getRequiredFramesForAngle(angle: VerificationAngle): number {
  return angle === naturalFrontAngle
    ? NATURAL_FRONT_FRAME_COUNT
    : BURST_CAPTURE_FRAME_COUNT;
}

export const perAngleInstruction: Record<VerificationAngle, string> = {
  front: 'Look Straight',
  left: 'Turn Toward Highlight',
  right: 'Turn Toward Highlight',
  up: 'Lift Chin Slightly',
  down: 'Lower Chin Slightly',
  natural_front: 'Look at the camera normally.',
};

export const perAngleHint: Record<VerificationAngle, string> = {
  front: 'Keep your face centered inside the circle.',
  left: 'Slowly turn your head toward the highlighted side of the ring.',
  right: 'Slowly turn your head toward the highlighted side of the ring.',
  up: 'Lift your chin toward the highlighted top arc.',
  down: 'Lower your chin toward the highlighted bottom arc.',
  natural_front: 'No strict pose needed. Keep one face visible.',
};

export const STABILITY_WINDOW_MS = enrollmentValidationConfig.stabilityDurationMs;
export const POST_CAPTURE_COOLDOWN_MS = 360;
export const STABILITY_GRACE_MS = enrollmentValidationConfig.stabilityGraceMs;
export const GUIDANCE_STICK_MS = 800; // Updated for debounce

export const MIN_FACE_AREA_RATIO = enrollmentValidationConfig.minFaceAreaRatio;
export const MAX_FACE_AREA_RATIO = enrollmentValidationConfig.maxFaceAreaRatio;
export const MAX_CENTER_OFFSET = enrollmentValidationConfig.maxCenterOffset;
export const MIN_BLUR_VARIANCE = enrollmentValidationConfig.minBlurVariance;
export const MIN_BRIGHTNESS = enrollmentValidationConfig.brightnessRange.min;
export const MAX_BRIGHTNESS = enrollmentValidationConfig.brightnessRange.max;

export const ANGLE_THRESHOLDS = enrollmentValidationConfig.poseThresholds;

export const captureStorageVersion = 5;
