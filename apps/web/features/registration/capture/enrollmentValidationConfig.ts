import type { VerificationAngle } from '@/features/registration/verification/types';

export type PoseThreshold = {
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
};

export type PoseThresholdSet = {
  valid: PoseThreshold;
  near: PoseThreshold;
};

export type LivenessChallenge = 'blink' | 'left' | 'right' | 'up' | 'down' | 'center';

export type LivenessYawDirectionMode =
  | 'auto'
  | 'negative-left'
  | 'positive-left'
  | 'either';

export const enrollmentValidationConfig = {
  SHOWCASE_ENROLLMENT_MODE:
    process.env.NEXT_PUBLIC_SHOWCASE_ENROLLMENT_MODE === 'true',
  minDetectionScore: 0.55,
  minFaceAreaRatio: 0.09,
  maxFaceAreaRatio: 0.35,
  maxCenterOffset: 0.24,
  minEdgeMarginRatio: 0.03,
  minBlurVariance: 45,
  brightnessRange: { min: 70, max: 200 },
  minResolution: { width: 320, height: 240 },
  stabilityDurationMs: 500,
  stabilityGraceMs: 280,
  livenessHoldMs: 420,
  livenessMotionHoldMs: 320,
  livenessChallengeTimeoutMs: 6500,
  livenessMinYawDeltaDegrees: 11,
  livenessCenterYawToleranceDegrees: 9,
  livenessYawDirectionMode: 'auto' as LivenessYawDirectionMode,
  requiredSamplesPerAngle: 3,
  livenessChallengeCount: 3,
  livenessPassCount: 2,
  livenessMaxRetries: 2,
  randomizeLivenessChallenges: false,
  debugOverlayQueryParam: 'debug',
  debugOverlayEnv:
    process.env.NEXT_PUBLIC_ENROLLMENT_CAPTURE_DEBUG === 'true',
  poseThresholds: {
    front: {
      valid: { yawMin: -15, yawMax: 15, pitchMin: -12, pitchMax: 12 },
      near: { yawMin: -20, yawMax: 20, pitchMin: -16, pitchMax: 16 },
    },
    left: {
      valid: { yawMin: -45, yawMax: -10, pitchMin: -18, pitchMax: 18 },
      near: { yawMin: -52, yawMax: -7, pitchMin: -22, pitchMax: 22 },
    },
    right: {
      valid: { yawMin: 10, yawMax: 45, pitchMin: -18, pitchMax: 18 },
      near: { yawMin: 7, yawMax: 52, pitchMin: -22, pitchMax: 22 },
    },
    up: {
      valid: { yawMin: -18, yawMax: 18, pitchMin: -40, pitchMax: -8 },
      near: { yawMin: -22, yawMax: 22, pitchMin: -45, pitchMax: -5 },
    },
    down: {
      valid: { yawMin: -18, yawMax: 18, pitchMin: 8, pitchMax: 40 },
      near: { yawMin: -22, yawMax: 22, pitchMin: 5, pitchMax: 45 },
    },
  } satisfies Record<Exclude<VerificationAngle, 'natural_front'>, PoseThresholdSet>,
} as const;

export const livenessChallengePool: LivenessChallenge[] = [
  'left',
  'right',
  'center',
];
