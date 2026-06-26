import type { VerificationAngle } from '@/features/registration/verification/types';

export type PoseThreshold = {
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
};

export type LivenessChallenge = 'blink' | 'left' | 'right' | 'up' | 'down';

export const enrollmentValidationConfig = {
  minDetectionScore: 0.55,
  minFaceAreaRatio: 0.09,
  maxFaceAreaRatio: 0.35,
  maxCenterOffset: 0.24,
  minEdgeMarginRatio: 0.03,
  minBlurVariance: 45,
  brightnessRange: { min: 70, max: 200 },
  minResolution: { width: 320, height: 240 },
  stabilityDurationMs: 650,
  livenessHoldMs: 420,
  requiredSamplesPerAngle: 3,
  livenessChallengeCount: 3,
  poseThresholds: {
    front: { yawMin: -10, yawMax: 10, pitchMin: -8, pitchMax: 8 },
    left: { yawMin: -35, yawMax: -15, pitchMin: -10, pitchMax: 10 },
    right: { yawMin: 15, yawMax: 35, pitchMin: -10, pitchMax: 10 },
    up: { yawMin: -10, yawMax: 10, pitchMin: -30, pitchMax: -12 },
    down: { yawMin: -10, yawMax: 10, pitchMin: 12, pitchMax: 30 },
  } satisfies Record<Exclude<VerificationAngle, 'natural_front'>, PoseThreshold>,
} as const;

export const livenessChallengePool: LivenessChallenge[] = [
  'blink',
  'left',
  'right',
  'up',
  'down',
];
