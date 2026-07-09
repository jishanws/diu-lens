import type { VerificationAngle } from '@/features/registration/verification/types';
import type { LivenessChallenge } from '@/features/registration/capture/enrollmentValidationConfig';

export type PoseValidationState = 'valid' | 'near_valid' | 'invalid';

export type CapturedShot = {
  angle: VerificationAngle;
  blob: Blob;
  previewUrl: string;
  capturedAt: number;
  captureLatencyMs?: number;
  dataUrl: string;
  quality: {
    selectionScore?: number;
    captureConfidence?: 'ideal' | 'near_ready';
    warnings?: string[];
    yaw: number;
    pitch: number;
    faceAreaRatio: number;
    centerOffset: number;
    blurVariance: number;
    brightness: number;
  };
};

export type CapturedShotsByAngle = Record<VerificationAngle, CapturedShot[]>;

export type CaptureReadiness = {
  faceDetected: boolean;
  singleFace: boolean;
  faceLargeEnough: boolean;
  centered: boolean;
  eyesVisible: boolean;
  sharpEnough: boolean;
  brightnessOk: boolean;
  angleMatch: boolean;
  livenessPassed: boolean;
};

export type CaptureFeedback = {
  guidanceState:
    | 'no_face'
    | 'multiple_faces'
    | 'face_too_small'
    | 'off_center'
    | 'blurry'
    | 'lighting_low'
    | 'lighting_high'
    | 'wrong_angle'
    | 'liveness'
    | 'eyes_hidden'
    | 'hold_steady'
    | 'ready'
    | 'cooldown'
    | 'complete';
  instruction: string;
  liveMessage: string;
  holdProgress: number;
  readiness: CaptureReadiness;
};

export type CaptureDebugState = {
  enabled: boolean;
  yaw: number | null;
  rawYaw: number | null;
  normalizedYaw: number | null;
  pitch: number | null;
  rawPitch: number | null;
  normalizedPitch: number | null;
  roll: number | null;
  userFacingDirection: string;
  expectedPose: string;
  guidanceMessage: string;
  baselineYaw: number | null;
  baselinePitch: number | null;
  yawDelta: number | null;
  pitchDelta: number | null;
  expectedAngle: VerificationAngle;
  angleState: PoseValidationState;
  currentPoseState: PoseValidationState;
  requiredPitchRange: string;
  livenessChallenge: LivenessChallenge | null;
  livenessExpectedDirection: string;
  livenessCompletedCount: number;
  livenessRequiredPassCount: number;
  livenessAttempts: number;
  livenessBlockerReason: string;
  stableForMs: number;
  stableRequiredMs: number;
  blockedReason: string;
  blockerReason: string;
};

export type FaceCaptureState = {
  modelReady: boolean;
  modelErrorMessage: string | null;
  currentAngle: VerificationAngle;
  currentAngleIndex: number;
  capturedShots: CapturedShotsByAngle;
  capturedCount: number;
  canSubmit: boolean;
  isAutoCapturing: boolean;
  feedback: CaptureFeedback;
  liveness: {
    completed: boolean;
    failed: boolean;
    currentChallenge: string | null;
    completedCount: number;
    requiredCount: number;
    message: string;
  };
  debug: CaptureDebugState;
};

export type RestoreCaptureShot = {
  angle: VerificationAngle;
  dataUrl: string;
  capturedAt: number;
  captureLatencyMs?: number;
};

export type CapturePersistencePayload = {
  version: number;
  activeAngle: VerificationAngle;
  shots: RestoreCaptureShot[];
};
