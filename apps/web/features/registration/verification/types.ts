import type { RefCallback } from 'react';
import type { FailedCapture } from '@/features/registration/verification/failedCaptures';

export type PermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type VerificationAngle =
  | 'front'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'natural_front';

export type AngleCaptureSummary = {
  angle: VerificationAngle;
  acceptedShots: number;
  requiredShots: number;
};

export type VerificationCapturesByAngle = Record<VerificationAngle, Blob[]>;
export type VerificationFrameMetadataByAngle = Record<
  VerificationAngle,
  { capturedAt: number; captureLatencyMs?: number }[]
>;

export type VerificationCompletionSummary = {
  livenessPassed?: boolean;
  verificationCompleted: boolean;
  totalRequiredShots: number;
  totalAcceptedShots: number;
  angles: AngleCaptureSummary[];
  capturesByAngle: VerificationCapturesByAngle;
  frameMetadataByAngle: VerificationFrameMetadataByAngle;
};

export type EnrollmentSubmitDiagnostics = {
  requestUrl: string;
  httpStatus: number | null;
  responseBody: string | null;
  error: string | null;
  requestId?: string | null;
  errorCode?: string | null;
};

export type EnrollmentCompletionResult = {
  success: boolean;
  message: string;
  diagnostics: EnrollmentSubmitDiagnostics;
  failedCaptures?: FailedCapture[];
  accepted?: boolean;
  registrationComplete?: boolean;
};

export type CameraHookResult = {
  videoRef: RefCallback<HTMLVideoElement>;
  status: PermissionState;
  errorMessage: string | null;
  streamActive: boolean;
  requestAccess: () => Promise<boolean>;
  resetPermission: () => void;
  stopStream: () => void;
  captureSnapshot: () => Promise<Blob | null>;
};
