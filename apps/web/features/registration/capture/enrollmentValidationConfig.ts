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
  minDetectionScore: 0.55,
  minFaceAreaRatio: 0.09,
  maxFaceAreaRatio: 0.35,
  maxCenterOffset: 0.24,
  minEdgeMarginRatio: 0.03,
  minBlurVariance: 35,
  brightnessRange: { min: 70, max: 200 },
  minResolution: { width: 320, height: 240 },
  stabilityDurationMs: 350,
  stabilityGraceMs: 220,
  postCaptureCooldownMs: 300,
  livenessHoldMs: 420,
  livenessMotionHoldMs: 320,
  livenessChallengeTimeoutMs: 6500,
  livenessMinYawDeltaDegrees: 11,
  livenessCenterYawToleranceDegrees: 9,
  livenessYawDirectionMode: 'auto' as LivenessYawDirectionMode,
  poseDeltaThresholds: {
    yawDegrees: 9,
    pitchDegrees: 6,
    centerYawToleranceDegrees: 16,
    centerPitchToleranceDegrees: 14,
  },
  requiredSamplesPerAngle: 2,
  livenessChallengeCount: 3,
  livenessPassCount: 2,
  livenessMaxRetries: 2,
  randomizeLivenessChallenges: false,
  debugOverlayQueryParam: 'debug',
  debugOverlayEnv:
    process.env.NEXT_PUBLIC_ENROLLMENT_CAPTURE_DEBUG === 'true',
  poseThresholds: {
    front: {
      valid: { yawMin: -18, yawMax: 18, pitchMin: -18, pitchMax: 18 },
      near: { yawMin: -22, yawMax: 22, pitchMin: -22, pitchMax: 22 },
    },
    left: {
      valid: { yawMin: -45, yawMax: -12, pitchMin: -25, pitchMax: 25 },
      near: { yawMin: -52, yawMax: -8, pitchMin: -30, pitchMax: 30 },
    },
    right: {
      valid: { yawMin: 12, yawMax: 45, pitchMin: -25, pitchMax: 25 },
      near: { yawMin: 8, yawMax: 52, pitchMin: -30, pitchMax: 30 },
    },
    up: {
      valid: { yawMin: -35, yawMax: 35, pitchMin: 8, pitchMax: 40 },
      near: { yawMin: -40, yawMax: 40, pitchMin: 5, pitchMax: 45 },
    },
    down: {
      valid: { yawMin: -35, yawMax: 35, pitchMin: -40, pitchMax: -7 },
      near: { yawMin: -40, yawMax: 40, pitchMin: -45, pitchMax: -4 },
    },
  } satisfies Record<Exclude<VerificationAngle, 'natural_front'>, PoseThresholdSet>,
} as const;

export const livenessChallengePool: LivenessChallenge[] = [
  'center',
  'left',
  'right',
];
