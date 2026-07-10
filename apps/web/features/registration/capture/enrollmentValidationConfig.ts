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

export type LivenessChallenge =
  | 'blink'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'center';

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
  stabilityDurationMs: 650,
  stabilityGraceMs: 220,
  postCaptureCooldownMs: 300,
  motionDeltaMaxDegrees: 3,
  livenessHoldMs: 420,
  livenessMotionHoldMs: 320,
  livenessChallengeTimeoutMs: 6500,
  livenessMinYawDeltaDegrees: 11,
  livenessCenterYawToleranceDegrees: 9,
  livenessYawDirectionMode: 'positive-left' as LivenessYawDirectionMode,
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
  debugOverlayEnv: process.env.NEXT_PUBLIC_ENROLLMENT_CAPTURE_DEBUG === 'true',
  poseThresholds: {
    front: {
      valid: { yawMin: -18, yawMax: 18, pitchMin: -18, pitchMax: 18 },
      near: { yawMin: -22, yawMax: 22, pitchMin: -22, pitchMax: 22 },
    },
    left: {
      valid: { yawMin: 12, yawMax: 45, pitchMin: -25, pitchMax: 25 },
      near: { yawMin: 8, yawMax: 52, pitchMin: -30, pitchMax: 30 },
    },
    right: {
      valid: { yawMin: -45, yawMax: -12, pitchMin: -25, pitchMax: 25 },
      near: { yawMin: -52, yawMax: -8, pitchMin: -30, pitchMax: 30 },
    },
    up: {
      valid: { yawMin: -35, yawMax: 35, pitchMin: 8, pitchMax: 40 },
      near: { yawMin: -39, yawMax: 39, pitchMin: 5, pitchMax: 45 },
    },
    down: {
      valid: { yawMin: -35, yawMax: 35, pitchMin: -40, pitchMax: -7 },
      near: { yawMin: -39, yawMax: 39, pitchMin: -45, pitchMax: -4 },
    },
  } satisfies Record<
    Exclude<VerificationAngle, 'natural_front'>,
    PoseThresholdSet
  >,
};

export function updateValidationConfig(
  newConfig: Partial<typeof enrollmentValidationConfig>
) {
  if (newConfig.minDetectionScore !== undefined)
    enrollmentValidationConfig.minDetectionScore = newConfig.minDetectionScore;
  if (newConfig.minFaceAreaRatio !== undefined)
    enrollmentValidationConfig.minFaceAreaRatio = newConfig.minFaceAreaRatio;
  if (newConfig.maxFaceAreaRatio !== undefined)
    enrollmentValidationConfig.maxFaceAreaRatio = newConfig.maxFaceAreaRatio;
  if (newConfig.maxCenterOffset !== undefined)
    enrollmentValidationConfig.maxCenterOffset = newConfig.maxCenterOffset;
  if (newConfig.minEdgeMarginRatio !== undefined)
    enrollmentValidationConfig.minEdgeMarginRatio =
      newConfig.minEdgeMarginRatio;
  if (newConfig.minBlurVariance !== undefined)
    enrollmentValidationConfig.minBlurVariance = newConfig.minBlurVariance;

  if (newConfig.brightnessRange) {
    Object.assign(
      enrollmentValidationConfig.brightnessRange,
      newConfig.brightnessRange
    );
  }
  if (newConfig.minResolution) {
    Object.assign(
      enrollmentValidationConfig.minResolution,
      newConfig.minResolution
    );
  }

  if (newConfig.stabilityDurationMs !== undefined)
    enrollmentValidationConfig.stabilityDurationMs =
      newConfig.stabilityDurationMs;
  if (newConfig.requiredSamplesPerAngle !== undefined)
    enrollmentValidationConfig.requiredSamplesPerAngle =
      newConfig.requiredSamplesPerAngle;
  if (newConfig.livenessChallengeCount !== undefined)
    enrollmentValidationConfig.livenessChallengeCount =
      newConfig.livenessChallengeCount;

  if (newConfig.poseThresholds) {
    for (const [angle, thresholds] of Object.entries(
      newConfig.poseThresholds
    )) {
      if (
        enrollmentValidationConfig.poseThresholds[
          angle as keyof typeof enrollmentValidationConfig.poseThresholds
        ]
      ) {
        const target =
          enrollmentValidationConfig.poseThresholds[
            angle as keyof typeof enrollmentValidationConfig.poseThresholds
          ];
        const nextThresholds = thresholds as {
          valid?: PoseThreshold;
          near?: PoseThreshold;
        };
        if (nextThresholds.valid && nextThresholds.near) {
          target.valid = nextThresholds.valid;
          target.near = nextThresholds.near;
        }
      }
    }
  }
}

export const livenessChallengePool: LivenessChallenge[] = [
  'center',
  'left',
  'right',
];
