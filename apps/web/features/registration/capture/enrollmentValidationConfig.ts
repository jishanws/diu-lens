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

export type LivenessChallenge = 'blink' | 'left' | 'right' | 'up' | 'down' | 'front';

export const enrollmentValidationConfig = {
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
  livenessChallengeTimeoutMs: 6500,
  livenessMinMotionDegrees: 8,
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
      valid: { yawMin: -12, yawMax: 12, pitchMin: -10, pitchMax: 10 },
      near: { yawMin: -18, yawMax: 18, pitchMin: -15, pitchMax: 15 },
    },
    left: {
      valid: { yawMin: -38, yawMax: -12, pitchMin: -14, pitchMax: 14 },
      near: { yawMin: -48, yawMax: -8, pitchMin: -18, pitchMax: 18 },
    },
    right: {
      valid: { yawMin: 12, yawMax: 38, pitchMin: -14, pitchMax: 14 },
      near: { yawMin: 8, yawMax: 48, pitchMin: -18, pitchMax: 18 },
    },
    up: {
      valid: { yawMin: -14, yawMax: 14, pitchMin: -35, pitchMax: -10 },
      near: { yawMin: -18, yawMax: 18, pitchMin: -42, pitchMax: -6 },
    },
    down: {
      valid: { yawMin: -14, yawMax: 14, pitchMin: 10, pitchMax: 35 },
      near: { yawMin: -18, yawMax: 18, pitchMin: 6, pitchMax: 42 },
    },
  } satisfies Record<Exclude<VerificationAngle, 'natural_front'>, PoseThresholdSet>,
} as const;

export const livenessChallengePool: LivenessChallenge[] = [
  'left',
  'right',
  'front',
];
