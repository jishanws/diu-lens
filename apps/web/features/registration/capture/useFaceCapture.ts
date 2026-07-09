import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ANGLE_THRESHOLDS,
  captureAngles,
  getRequiredFramesForAngle,
  MIN_FACE_AREA_RATIO,
  MAX_FACE_AREA_RATIO,
  MAX_CENTER_OFFSET,
  POST_CAPTURE_COOLDOWN_MS,
  STABILITY_WINDOW_MS,
  STABILITY_GRACE_MS,
  GUIDANCE_STICK_MS,
  captureStorageVersion,
  perAngleInstruction,
} from '@/features/registration/capture/constants';
import {
  enrollmentValidationConfig,
  livenessChallengePool,
  type LivenessChallenge,
} from '@/features/registration/capture/enrollmentValidationConfig';
import { useAngleProgress } from '@/features/registration/capture/useAngleProgress';
import type {
  CapturePersistencePayload,
  CapturedShot,
  CapturedShotsByAngle,
  FaceCaptureState,
  CaptureFeedback,
  PoseValidationState,
} from '@/features/registration/capture/types';
import type {
  VerificationAngle,
  VerificationCapturesByAngle,
  VerificationFrameMetadataByAngle,
} from '@/features/registration/verification/types';

type CaptureSnapshotFn = () => Promise<Blob | null>;

type UseFaceCaptureParams = {
  videoElement: HTMLVideoElement | null;
  streamActive: boolean;
  captureSnapshot: CaptureSnapshotFn;
  storageKey: string;
};

type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
};

type DetectionResult = {
  faceLandmarks?: LandmarkPoint[][];
};

type FaceLandmarker = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => DetectionResult;
  close: () => void;
};

const detectionIntervalMs = 90;
const MIN_CAPTURE_FILE_SIZE_BYTES = 10 * 1024;
const LIVENESS_HOLD_MS = enrollmentValidationConfig.livenessMotionHoldMs;
const LIVENESS_CHALLENGE_TIMEOUT_MS =
  enrollmentValidationConfig.livenessChallengeTimeoutMs;
const FACE_GUIDANCE_WASM_BASE_PATH =
  '/vendor/mediapipe/tasks-vision/wasm';
const FACE_GUIDANCE_WASM_LOADER_PATH = `${FACE_GUIDANCE_WASM_BASE_PATH}/vision_wasm_internal.js`;
const FACE_GUIDANCE_MODEL_PATH =
  '/vendor/mediapipe/models/face_landmarker.task';
const FACE_GUIDANCE_UNAVAILABLE_MESSAGE =
  'Face guidance is temporarily unavailable. Check camera permission, refresh the page, try another browser or device, and contact an admin if the issue persists.';

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

function logFaceGuidanceInitError(error: unknown) {
  if (process.env.NODE_ENV === 'production') return;

  console.error('[face-guidance] initialization failed', error);
}

function assertFaceGuidanceAssetPath(path: string, label: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    throw new Error(`Invalid ${label} asset path: ${path}`);
  }
}

async function verifyFaceGuidanceAsset(path: string, label: string) {
  assertFaceGuidanceAssetPath(path, label);

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is unavailable for face guidance assets.');
  }

  const response = await fetch(path, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(
      `Unable to load ${label} asset from ${path}: HTTP ${response.status}`
    );
  }
}

async function verifyFaceGuidanceEnvironment() {
  if (typeof window === 'undefined') {
    throw new Error('Face guidance must be initialized in the browser.');
  }

  if (typeof WebAssembly === 'undefined') {
    throw new Error('WebAssembly is unavailable in this browser.');
  }

  await Promise.all([
    verifyFaceGuidanceAsset(
      FACE_GUIDANCE_WASM_LOADER_PATH,
      'MediaPipe WASM loader'
    ),
    verifyFaceGuidanceAsset(FACE_GUIDANCE_MODEL_PATH, 'face landmarker model'),
  ]);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emptyCapturedShots(): CapturedShotsByAngle {
  return {
    front: [],
    left: [],
    right: [],
    up: [],
    down: [],
    natural_front: [],
  };
}

function makeLivenessSequence(): LivenessChallenge[] {
  const pool = [...livenessChallengePool];
  const challenges = enrollmentValidationConfig.randomizeLivenessChallenges
    ? pool.sort(() => Math.random() - 0.5)
    : pool;
  return challenges.slice(0, enrollmentValidationConfig.livenessChallengeCount);
}

function isAngleComplete(
  capturedShots: CapturedShotsByAngle,
  angle: VerificationAngle
) {
  return capturedShots[angle].length >= getRequiredFramesForAngle(angle);
}

function allAnglesComplete(capturedShots: CapturedShotsByAngle) {
  return captureAngles.every((angle) => isAngleComplete(capturedShots, angle));
}

function findFirstMissingAngle(
  capturedShots: CapturedShotsByAngle
): VerificationAngle | null {
  return (
    captureAngles.find((angle) => !isAngleComplete(capturedShots, angle)) ??
    null
  );
}

function getStoragePayload(
  activeAngle: VerificationAngle,
  capturedShots: CapturedShotsByAngle
): CapturePersistencePayload {
  return {
    version: captureStorageVersion,
    activeAngle,
    shots: captureAngles
      .flatMap((angle) =>
        capturedShots[angle].map((shot) => ({
          angle,
          dataUrl: shot.dataUrl,
          capturedAt: shot.capturedAt,
          captureLatencyMs: shot.captureLatencyMs,
        }))
      )
      .filter((entry) => entry.dataUrl.length > 0),
  };
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return null;

  const header = dataUrl.slice(0, commaIndex);
  const content = dataUrl.slice(commaIndex + 1);
  const mimeMatch = header.match(/^data:(.*?);base64$/);
  if (!mimeMatch) return null;

  try {
    const bytes = atob(content);
    const array = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) {
      array[index] = bytes.charCodeAt(index);
    }
    return new Blob([array], { type: mimeMatch[1] || 'image/jpeg' });
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        console.log('[capture] data url created', {
          size: blob.size,
          type: blob.type,
          length: reader.result.length,
        });
        resolve(reader.result);
      } else reject('Failed to convert capture to data URL');
    };
    reader.onerror = () => reject('Failed to read captured blob');
    reader.readAsDataURL(blob);
  });
}

function toBlobUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

function getLandmark(
  landmarks: LandmarkPoint[],
  index: number
): LandmarkPoint | null {
  const point = landmarks[index];
  if (!point) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return point;
}

function computeFaceBox(landmarks: LandmarkPoint[]) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const landmark of landmarks) {
    minX = Math.min(minX, landmark.x);
    minY = Math.min(minY, landmark.y);
    maxX = Math.max(maxX, landmark.x);
    maxY = Math.max(maxY, landmark.y);
  }

  return {
    minX: clamp(minX, 0, 1),
    minY: clamp(minY, 0, 1),
    maxX: clamp(maxX, 0, 1),
    maxY: clamp(maxY, 0, 1),
  };
}

function estimateYawPitch(landmarks: LandmarkPoint[]): {
  yaw: number;
  pitch: number;
  roll: number;
} {
  const leftEye = getLandmark(landmarks, 33);
  const rightEye = getLandmark(landmarks, 263);
  const noseTip = getLandmark(landmarks, 1);
  const upperLip = getLandmark(landmarks, 13);
  const lowerLip = getLandmark(landmarks, 14);

  if (!leftEye || !rightEye || !noseTip || !upperLip || !lowerLip) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeDistance = Math.max(0.001, Math.abs(rightEye.x - leftEye.x));
  const mouthMidY = (upperLip.y + lowerLip.y) / 2;
  const verticalSpan = Math.max(0.02, mouthMidY - eyeMidY);

  const yawNorm = (noseTip.x - eyeMidX) / (eyeDistance * 0.5);
  const pitchNorm = (noseTip.y - eyeMidY) / verticalSpan - 0.5;
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

  return {
    yaw: clamp(yawNorm * 32, -45, 45),
    pitch: clamp(pitchNorm * 42, -35, 35),
    roll: clamp(roll, -45, 45),
  };
}

function thresholdContains(
  threshold: { yawMin: number; yawMax: number; pitchMin: number; pitchMax: number },
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

function getPoseState(
  angle: VerificationAngle,
  yaw: number,
  pitch: number,
  marginBoost: number = 0
): PoseValidationState {
  if (angle === 'natural_front') return 'valid';
  const threshold = ANGLE_THRESHOLDS[angle];
  if (!threshold) return 'invalid';
  if (thresholdContains(threshold.valid, yaw, pitch, marginBoost)) {
    return 'valid';
  }
  if (thresholdContains(threshold.near, yaw, pitch, marginBoost)) {
    return 'near_valid';
  }
  return 'invalid';
}

function getLivenessExpectedDirection(
  challenge: LivenessChallenge,
  observedLeftDirection: number | null
) {
  if (challenge === 'center') return 'center';
  if (challenge === 'blink') return 'blink';

  const mode = enrollmentValidationConfig.livenessYawDirectionMode;
  if (mode === 'either') return 'either';
  if (mode === 'negative-left') return challenge === 'left' ? 'negative' : 'positive';
  if (mode === 'positive-left') return challenge === 'left' ? 'positive' : 'negative';
  if (observedLeftDirection) {
    const expected = challenge === 'left' ? observedLeftDirection : -observedLeftDirection;
    return expected < 0 ? 'negative' : 'positive';
  }
  return 'either';
}

function normalizeYawForUser(rawYaw: number) {
  const mode = enrollmentValidationConfig.livenessYawDirectionMode;
  if (mode === 'positive-left') return rawYaw;
  return -rawYaw;
}

function normalizePitchForUser(rawPitch: number) {
  return rawPitch;
}

function getUserFacingDirection(rawYaw: number) {
  const normalizedYaw = normalizeYawForUser(rawYaw);
  if (normalizedYaw <= -8) return 'right';
  if (normalizedYaw >= 8) return 'left';
  return 'center';
}

function getExpectedPoseLabel(angle: VerificationAngle) {
  if (angle === 'front') return 'Look Straight';
  if (angle === 'left') return 'Turn Left';
  if (angle === 'right') return 'Turn Right';
  if (angle === 'up') return 'Look Up';
  if (angle === 'down') return 'Look Down';
  return 'Look Straight';
}

function getRequiredPitchRange(angle: VerificationAngle) {
  if (angle === 'natural_front') return 'any';
  const threshold = ANGLE_THRESHOLDS[angle];
  return `${threshold.valid.pitchMin}..${threshold.valid.pitchMax}`;
}

function getHybridPoseState(
  angle: VerificationAngle,
  yaw: number,
  pitch: number,
  baseline: { yaw: number; pitch: number } | null,
  marginBoost: number = 0
): PoseValidationState {
  const absoluteState = getPoseState(angle, yaw, pitch, marginBoost);
  if (absoluteState === 'invalid' || angle === 'natural_front') return absoluteState;
  if (!baseline || angle === 'front') return absoluteState;

  const yawDelta = yaw - baseline.yaw;
  const pitchDelta = pitch - baseline.pitch;
  const delta = enrollmentValidationConfig.poseDeltaThresholds;
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
      pitchDelta <= -delta.pitchDegrees &&
      Math.abs(yawDelta) <= delta.centerYawToleranceDegrees + 8;
  } else if (angle === 'down') {
    moved =
      pitchDelta >= delta.pitchDegrees &&
      Math.abs(yawDelta) <= delta.centerYawToleranceDegrees + 8;
  }

  if (moved) return absoluteState;
  return absoluteState === 'valid' ? 'near_valid' : 'invalid';
}

function isHybridAngleMatch(
  angle: VerificationAngle,
  yaw: number,
  pitch: number,
  baseline: { yaw: number; pitch: number } | null,
  marginBoost: number = 0
) {
  return getHybridPoseState(angle, yaw, pitch, baseline, marginBoost) === 'valid';
}

function livenessChallengeMatched(
  challenge: LivenessChallenge,
  yaw: number,
  landmarks: LandmarkPoint[],
  baselineYaw: number | null,
  observedLeftDirection: number | null
): { matched: boolean; yawDelta: number | null; expectedDirection: string; observedDirection: number | null } {
  if (challenge === 'blink') {
    return {
      matched: areEyesClosed(landmarks),
      yawDelta: baselineYaw === null ? null : yaw - baselineYaw,
      expectedDirection: 'blink',
      observedDirection: null,
    };
  }
  if (baselineYaw === null) {
    return {
      matched: false,
      yawDelta: null,
      expectedDirection: getLivenessExpectedDirection(challenge, observedLeftDirection),
      observedDirection: null,
    };
  }

  const yawDelta = yaw - baselineYaw;
  const absDelta = Math.abs(yawDelta);
  const observedDirection = absDelta >= enrollmentValidationConfig.livenessMinYawDeltaDegrees
    ? Math.sign(yawDelta)
    : null;

  if (challenge === 'center') {
    return {
      matched: absDelta <= enrollmentValidationConfig.livenessCenterYawToleranceDegrees,
      yawDelta,
      expectedDirection: 'center',
      observedDirection: null,
    };
  }

  const expectedDirection = getLivenessExpectedDirection(challenge, observedLeftDirection);
  const directionOk =
    expectedDirection === 'either' ||
    (expectedDirection === 'negative' && yawDelta <= -enrollmentValidationConfig.livenessMinYawDeltaDegrees) ||
    (expectedDirection === 'positive' && yawDelta >= enrollmentValidationConfig.livenessMinYawDeltaDegrees);

  return {
    matched: absDelta >= enrollmentValidationConfig.livenessMinYawDeltaDegrees && directionOk,
    yawDelta,
    expectedDirection,
    observedDirection,
  };
}

function areEyesVisible(landmarks: LandmarkPoint[]) {
  return Boolean(
    getLandmark(landmarks, 33) &&
      getLandmark(landmarks, 263) &&
      getLandmark(landmarks, 159) &&
      getLandmark(landmarks, 386)
  );
}

function areEyesClosed(landmarks: LandmarkPoint[]) {
  const leftTop = getLandmark(landmarks, 159);
  const leftBottom = getLandmark(landmarks, 145);
  const rightTop = getLandmark(landmarks, 386);
  const rightBottom = getLandmark(landmarks, 374);
  const leftOuter = getLandmark(landmarks, 33);
  const leftInner = getLandmark(landmarks, 133);
  const rightInner = getLandmark(landmarks, 362);
  const rightOuter = getLandmark(landmarks, 263);
  if (!leftTop || !leftBottom || !rightTop || !rightBottom || !leftOuter || !leftInner || !rightInner || !rightOuter) {
    return false;
  }
  const leftOpen = Math.abs(leftTop.y - leftBottom.y) / Math.max(0.001, Math.abs(leftInner.x - leftOuter.x));
  const rightOpen = Math.abs(rightTop.y - rightBottom.y) / Math.max(0.001, Math.abs(rightOuter.x - rightInner.x));
  return leftOpen < 0.12 && rightOpen < 0.12;
}

function analyzeVideoQuality(video: HTMLVideoElement): {
  blurVariance: number;
  brightness: number;
  resolutionOk: boolean;
} {
  const width = Math.min(160, video.videoWidth || 0);
  const height =
    video.videoWidth > 0 && video.videoHeight > 0
      ? Math.max(1, Math.round((width * video.videoHeight) / video.videoWidth))
      : 0;
  const resolutionOk =
    video.videoWidth >= enrollmentValidationConfig.minResolution.width &&
    video.videoHeight >= enrollmentValidationConfig.minResolution.height;

  if (width <= 0 || height <= 0) {
    return { blurVariance: 0, brightness: 0, resolutionOk };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { blurVariance: 0, brightness: 0, resolutionOk };
  }

  context.drawImage(video, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  let brightnessTotal = 0;

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const value = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    gray[pixel] = value;
    brightnessTotal += value;
  }

  let laplacianTotal = 0;
  let laplacianSquaredTotal = 0;
  let laplacianCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      const laplacian =
        gray[center - width] +
        gray[center - 1] -
        4 * gray[center] +
        gray[center + 1] +
        gray[center + width];
      laplacianTotal += laplacian;
      laplacianSquaredTotal += laplacian * laplacian;
      laplacianCount += 1;
    }
  }

  const laplacianMean = laplacianCount > 0 ? laplacianTotal / laplacianCount : 0;
  const blurVariance =
    laplacianCount > 0
      ? Math.max(0, laplacianSquaredTotal / laplacianCount - laplacianMean * laplacianMean)
      : 0;

  return {
    blurVariance,
    brightness: brightnessTotal / Math.max(1, width * height),
    resolutionOk,
  };
}

function getDynamicAngleGuidance(
  angle: VerificationAngle,
  yaw: number,
  pitch: number,
  faceAreaRatio: number
): { instruction: string; liveMessage: string } {
  if (faceAreaRatio < MIN_FACE_AREA_RATIO) {
    return { instruction: 'Move closer', liveMessage: 'Face too far away' };
  }
  if (faceAreaRatio > MAX_FACE_AREA_RATIO) {
    return { instruction: 'Move back', liveMessage: 'Face too close' };
  }

  if (angle === 'natural_front') return { instruction: 'Look naturally', liveMessage: 'Look at the camera naturally' };
  
  if (angle === 'front') {
    if (yaw < ANGLE_THRESHOLDS.front.valid.yawMin || yaw > ANGLE_THRESHOLDS.front.valid.yawMax) return { instruction: 'Face the camera.', liveMessage: 'Face the camera.' };
    if (pitch < ANGLE_THRESHOLDS.front.valid.pitchMin) return { instruction: 'Lower your chin a little', liveMessage: 'Lower your chin a little' };
    if (pitch > ANGLE_THRESHOLDS.front.valid.pitchMax) return { instruction: 'Lift your chin a little', liveMessage: 'Lift your chin a little' };
    return { instruction: 'Hold still', liveMessage: 'Hold still' };
  }
  if (angle === 'left') {
    if (yaw > ANGLE_THRESHOLDS.left.valid.yawMax) return { instruction: 'Turn your head left.', liveMessage: 'Turn your head left.' };
    if (yaw < ANGLE_THRESHOLDS.left.valid.yawMin) return { instruction: 'Face the camera.', liveMessage: 'Face the camera.' };
    if (pitch < ANGLE_THRESHOLDS.left.valid.pitchMin) return { instruction: 'Lower your chin a little', liveMessage: 'Lower your chin a little' };
    if (pitch > ANGLE_THRESHOLDS.left.valid.pitchMax) return { instruction: 'Lift your chin a little', liveMessage: 'Lift your chin a little' };
    return { instruction: 'Hold still', liveMessage: 'Hold still' };
  }
  if (angle === 'right') {
    if (yaw < ANGLE_THRESHOLDS.right.valid.yawMin) return { instruction: 'Turn your head right.', liveMessage: 'Turn your head right.' };
    if (yaw > ANGLE_THRESHOLDS.right.valid.yawMax) return { instruction: 'Face the camera.', liveMessage: 'Face the camera.' };
    if (pitch < ANGLE_THRESHOLDS.right.valid.pitchMin) return { instruction: 'Lower your chin a little', liveMessage: 'Lower your chin a little' };
    if (pitch > ANGLE_THRESHOLDS.right.valid.pitchMax) return { instruction: 'Lift your chin a little', liveMessage: 'Lift your chin a little' };
    return { instruction: 'Hold still', liveMessage: 'Hold still' };
  }
  if (angle === 'up') {
    if (pitch > ANGLE_THRESHOLDS.up.valid.pitchMax) return { instruction: 'Lift your chin slightly', liveMessage: 'Lift your chin slightly' };
    if (pitch < ANGLE_THRESHOLDS.up.valid.pitchMin) return { instruction: 'Lower your chin slightly', liveMessage: 'Lower your chin slightly' };
    if (yaw < ANGLE_THRESHOLDS.up.valid.yawMin || yaw > ANGLE_THRESHOLDS.up.valid.yawMax) return { instruction: 'Face the camera.', liveMessage: 'Face the camera.' };
    return { instruction: 'Hold still', liveMessage: 'Hold still' };
  }
  if (angle === 'down') {
    if (pitch < ANGLE_THRESHOLDS.down.valid.pitchMin) return { instruction: 'Lower your chin slightly', liveMessage: 'Lower your chin slightly' };
    if (pitch > ANGLE_THRESHOLDS.down.valid.pitchMax) return { instruction: 'Lift your chin slightly', liveMessage: 'Lift your chin slightly' };
    if (yaw < ANGLE_THRESHOLDS.down.valid.yawMin || yaw > ANGLE_THRESHOLDS.down.valid.yawMax) return { instruction: 'Face the camera.', liveMessage: 'Face the camera.' };
    return { instruction: 'Hold still', liveMessage: 'Hold still' };
  }

  return { instruction: getAngleGuidance(angle), liveMessage: getAngleGuidance(angle) };
}

function getAngleGuidance(angle: VerificationAngle) {
  if (angle === 'natural_front') return 'Look at the camera naturally';
  if (angle === 'front') return 'Face the camera.';
  if (angle === 'left') return 'Turn your head left.';
  if (angle === 'right') return 'Turn your head right.';
  if (angle === 'up') return 'Lift your chin slightly.';
  return 'Lower your chin slightly.';
}

function getLivenessInstruction(challenge: LivenessChallenge | null) {
  if (challenge === 'left') return 'Turn Left';
  if (challenge === 'right') return 'Turn Right';
  if (challenge === 'center') return 'Look Straight';
  if (challenge === 'up') return 'Look slightly up';
  if (challenge === 'down') return 'Look slightly down';
  if (challenge === 'blink') return 'Blink once';
  return 'Follow the movement instruction';
}

function getLivenessHelper(challenge: LivenessChallenge | null) {
  if (challenge === 'left') return 'Turn your head left.';
  if (challenge === 'right') return 'Turn your head right.';
  if (challenge === 'center') return 'Face the camera.';
  if (challenge) return 'Follow the instruction.';
  return 'Keep your face centered.';
}

async function loadFaceLandmarker() {
  if (faceLandmarkerPromise) return faceLandmarkerPromise;

  faceLandmarkerPromise = (async () => {
    await verifyFaceGuidanceEnvironment();

    const tasksVision = await import('@mediapipe/tasks-vision');
    const vision = await tasksVision.FilesetResolver.forVisionTasks(
      FACE_GUIDANCE_WASM_BASE_PATH
    );

    return await tasksVision.FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_GUIDANCE_MODEL_PATH,
      },
      runningMode: 'VIDEO',
      numFaces: 2,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  })().catch((error) => {
    faceLandmarkerPromise = null;
    throw error;
  });

  return faceLandmarkerPromise;
}

export function useFaceCapture({
  videoElement,
  streamActive,
  captureSnapshot,
  storageKey,
}: UseFaceCaptureParams) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const detectionTimerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const cooldownUntilRef = useRef<number>(0);
  const autoCaptureLockRef = useRef(false);
  const currentAngleRef = useRef<VerificationAngle>('front');
  const latestShotsRef = useRef<CapturedShotsByAngle>(emptyCapturedShots());
  const finalizedRef = useRef(false);
  const persistenceEnabledRef = useRef(true);
  const consecutiveFailuresRef = useRef<number>(0);
  const stableSinceRef = useRef<number>(0);
  const stableGraceUntilRef = useRef<number>(0);
  const livenessSequenceRef = useRef<LivenessChallenge[]>(makeLivenessSequence());
  const livenessIndexRef = useRef(0);
  const livenessPassCountRef = useRef(0);
  const livenessAttemptsRef = useRef(0);
  const livenessMatchedSinceRef = useRef(0);
  const livenessChallengeStartedAtRef = useRef(0);
  const livenessBaselineYawRef = useRef<number | null>(null);
  const livenessBaselinePitchRef = useRef<number | null>(null);
  const livenessObservedLeftDirectionRef = useRef<number | null>(null);
  const lastGuidanceRef = useRef<{ instruction: string; liveMessage: string; timestamp: number }>({
    instruction: '',
    liveMessage: '',
    timestamp: 0,
  });

  const [modelReady, setModelReady] = useState(false);
  const [modelErrorMessage, setModelErrorMessage] = useState<string | null>(
    null
  );
  const [activeAngle, setActiveAngle] = useState<VerificationAngle>('front');
  const [capturedShots, setCapturedShots] =
    useState<CapturedShotsByAngle>(emptyCapturedShots());
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [feedback, setFeedback] = useState<FaceCaptureState['feedback']>({
    guidanceState: 'no_face',
    instruction: perAngleInstruction.front,
    liveMessage: 'Look forward',
    holdProgress: 0,
    readiness: {
      faceDetected: false,
      singleFace: false,
      faceLargeEnough: false,
      centered: true,
      eyesVisible: false,
      sharpEnough: true,
      brightnessOk: true,
      angleMatch: false,
      livenessPassed: false,
    },
  });
  const [livenessState, setLivenessState] = useState<FaceCaptureState['liveness']>({
    completed: false,
    failed: false,
    currentChallenge: livenessSequenceRef.current[0] ?? null,
    completedCount: 0,
    requiredCount: enrollmentValidationConfig.livenessPassCount,
    message: 'Complete liveness check',
  });
  const [debugState, setDebugState] = useState<FaceCaptureState['debug']>({
    enabled: false,
    yaw: null,
    rawYaw: null,
    normalizedYaw: null,
    pitch: null,
    rawPitch: null,
    normalizedPitch: null,
    roll: null,
    userFacingDirection: 'unknown',
    expectedPose: 'Look Straight',
    leftRightMappingReversed: true,
    guidanceMessage: perAngleInstruction.front,
    baselineYaw: null,
    baselinePitch: null,
    yawDelta: null,
    pitchDelta: null,
    expectedAngle: 'front',
    angleState: 'invalid',
    currentPoseState: 'invalid',
    requiredPitchRange: getRequiredPitchRange('front'),
    livenessChallenge: livenessSequenceRef.current[0] ?? null,
    livenessExpectedDirection: 'either',
    livenessCompletedCount: 0,
    livenessRequiredPassCount: enrollmentValidationConfig.livenessPassCount,
    livenessAttempts: 0,
    livenessBlockerReason: 'no_face',
    stableForMs: 0,
    stableRequiredMs: STABILITY_WINDOW_MS,
    captureQualityState: 'waiting_for_face',
    cameraReady: false,
    frameLoopRunning: false,
    faceDetected: false,
    faceBox: '{}',
    faceCenterOffset: 0,
    faceSizeRatio: 0,
    visibilityValid: false,
    eyesValid: false,
    framingValid: false,
    lightingValid: false,
    blurValid: false,
    canCapture: false,
    lastCaptureError: '',
    currentSampleCount: 0,
    blockedReason: 'no_face',
    blockerReason: 'no_face',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryEnabled =
      params.get(enrollmentValidationConfig.debugOverlayQueryParam) === '1' ||
      params.get(enrollmentValidationConfig.debugOverlayQueryParam) === 'true';
    setDebugState((prev) => ({
      ...prev,
      enabled: enrollmentValidationConfig.debugOverlayEnv || queryEnabled,
    }));
  }, []);

  const {
    capturedCount,
    canSubmit,
    currentAngle,
    currentAngleIndex,
    firstMissingAngle,
  } = useAngleProgress(capturedShots, activeAngle);

  useEffect(() => {
    latestShotsRef.current = capturedShots;
  }, [capturedShots]);

  useEffect(() => {
    currentAngleRef.current = currentAngle;
  }, [currentAngle]);

  useEffect(() => {
    finalizedRef.current = canSubmit;
  }, [canSubmit]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(storageKey);
    } catch {
      persistenceEnabledRef.current = false;
      return;
    }

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CapturePersistencePayload;
      if (
        parsed.version !== captureStorageVersion ||
        !Array.isArray(parsed.shots)
      )
        return;

      const restored = emptyCapturedShots();
      for (const shot of parsed.shots) {
        if (!captureAngles.includes(shot.angle)) continue;
        const blob = dataUrlToBlob(shot.dataUrl);
        if (!blob) continue;

        restored[shot.angle].push({
          angle: shot.angle,
          blob,
          previewUrl: toBlobUrl(blob),
          dataUrl: shot.dataUrl,
          capturedAt: shot.capturedAt,
          captureLatencyMs: shot.captureLatencyMs,
          quality: {
            yaw: 0,
            pitch: 0,
            faceAreaRatio: 0,
            centerOffset: 0,
            blurVariance: 0,
            brightness: 0,
          },
        });
      }

      setCapturedShots(restored);
      if (captureAngles.includes(parsed.activeAngle)) {
        setActiveAngle(parsed.activeAngle);
      }
    } catch {
      // ignore malformed payload
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!persistenceEnabledRef.current) return;

    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(getStoragePayload(activeAngle, capturedShots))
      );
    } catch {
      persistenceEnabledRef.current = false;
    }
  }, [activeAngle, capturedShots, storageKey]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setModelErrorMessage(null);
        const landmarker = await loadFaceLandmarker();
        if (cancelled) return;
        landmarkerRef.current = landmarker;
        setModelReady(true);
      } catch (error) {
        if (cancelled) return;
        logFaceGuidanceInitError(error);
        setModelReady(false);
        setModelErrorMessage(FACE_GUIDANCE_UNAVAILABLE_MESSAGE);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const shot of Object.values(latestShotsRef.current)) {
        for (const frame of shot) {
          URL.revokeObjectURL(frame.previewUrl);
        }
      }

      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          // ignore
        } finally {
          landmarkerRef.current = null;
          faceLandmarkerPromise = null;
        }
      }
    };
  }, [videoElement]);

  const safeDetect = useCallback(
    (targetVideoElement: HTMLVideoElement | null) => {
      if (!landmarkerRef.current) return null;
      if (!targetVideoElement || targetVideoElement.readyState < 2) return null;

      try {
        return landmarkerRef.current.detectForVideo(
          targetVideoElement,
          performance.now()
        );
      } catch {
        return null;
      }
    },
    []
  );

  const captureAngle = useCallback(
    async (targetAngle: VerificationAngle, force: boolean, captureLatencyMs?: number) => {
      if (!videoElement) return false;
      if (finalizedRef.current) return false;
      if (isAngleComplete(latestShotsRef.current, targetAngle)) return false;
      if (!force && currentAngleRef.current !== targetAngle) return false;

      const candidates: CapturedShot[] = [];
      const detection = safeDetect(videoElement);
      const faces = detection?.faceLandmarks ?? [];

      if (force || faces.length === 1) {
        let yaw = 0;
        let pitch = 0;
        let faceAreaRatio = 0;
        let centerOffset = 0;
        let blurVariance = 0;
        let brightness = 0;
        let qualityOk = true;

        if (faces.length === 1) {
          const landmarks = faces[0];
          const box = computeFaceBox(landmarks);
          faceAreaRatio = Math.max(
            0,
            (box.maxX - box.minX) * (box.maxY - box.minY)
          );
          centerOffset = Math.hypot((box.minX + box.maxX) / 2 - 0.5, (box.minY + box.maxY) / 2 - 0.5);
          const edgeMargin = Math.min(box.minX, box.minY, 1 - box.maxX, 1 - box.maxY);
          const videoQuality = analyzeVideoQuality(videoElement);
          blurVariance = videoQuality.blurVariance;
          brightness = videoQuality.brightness;
          qualityOk =
            videoQuality.resolutionOk &&
            blurVariance >= enrollmentValidationConfig.minBlurVariance &&
            brightness >= enrollmentValidationConfig.brightnessRange.min &&
            brightness <= enrollmentValidationConfig.brightnessRange.max;
          if (
            centerOffset > MAX_CENTER_OFFSET ||
            edgeMargin < enrollmentValidationConfig.minEdgeMarginRatio ||
            !areEyesVisible(landmarks) ||
            !qualityOk
          ) {
            return false;
          }
          const pose = estimateYawPitch(landmarks);
          yaw = pose.yaw;
          pitch = pose.pitch;
        }

        const marginBoost = Math.min(10, Math.floor(consecutiveFailuresRef.current / 10) * 2);
        const baseline =
          livenessBaselineYawRef.current === null || livenessBaselinePitchRef.current === null
            ? null
            : {
                yaw: livenessBaselineYawRef.current,
                pitch: livenessBaselinePitchRef.current,
              };
        const angleOk = isHybridAngleMatch(targetAngle, yaw, pitch, baseline, marginBoost);
        const sizeOk = faceAreaRatio >= MIN_FACE_AREA_RATIO && faceAreaRatio <= MAX_FACE_AREA_RATIO;
        if (!force && (!angleOk || !sizeOk)) {
          return false;
        }

        const snapshot = await captureSnapshot();
        if (snapshot) {
          console.log('[capture] snapshot captured', {
            angle: targetAngle,
            size: snapshot.size,
            type: snapshot.type,
          });
        }
        if (snapshot && snapshot.size >= MIN_CAPTURE_FILE_SIZE_BYTES) {
          const dataUrl = await blobToDataUrl(snapshot);
          if (
            latestShotsRef.current[targetAngle].some(
              (candidate) => candidate.dataUrl === dataUrl
            )
          ) {
            return false;
          }
          const warnings: string[] = [];
          if (!angleOk) warnings.push('angle');
          if (!sizeOk) warnings.push('face_size');
          if (!qualityOk) warnings.push('frame_quality');
          candidates.push({
            angle: targetAngle,
            blob: snapshot,
            dataUrl,
            previewUrl: toBlobUrl(snapshot),
            capturedAt: Date.now(),
            captureLatencyMs,
            quality: {
              yaw,
              pitch,
              faceAreaRatio,
              centerOffset,
              blurVariance,
              brightness,
              captureConfidence:
                !force && angleOk && sizeOk ? 'ideal' : 'near_ready',
              warnings,
            },
          });
        }
      }

      if (candidates.length === 0) return false;

      const nextShots: CapturedShotsByAngle = {
        ...latestShotsRef.current,
        [targetAngle]: [
          ...latestShotsRef.current[targetAngle],
          ...candidates,
        ].slice(0, getRequiredFramesForAngle(targetAngle)),
      };
      latestShotsRef.current = nextShots;

      setCapturedShots((current) => {
        if (isAngleComplete(current, targetAngle)) {
          for (const candidate of candidates) {
            URL.revokeObjectURL(candidate.previewUrl);
          }
          return current;
        }
        return {
          ...current,
          [targetAngle]: [...current[targetAngle], ...candidates].slice(
            0,
            getRequiredFramesForAngle(targetAngle)
          ),
        };
      });

      const nextAngle = findFirstMissingAngle(nextShots);
      cooldownUntilRef.current = performance.now() + POST_CAPTURE_COOLDOWN_MS;
      if (nextAngle && nextAngle !== targetAngle) {
        console.log('[capture] angle complete, advancing', {
          completedAngle: targetAngle,
          nextAngle,
          totalCompleted: captureAngles.filter(
            (a) => isAngleComplete(nextShots, a)
          ).length,
          totalRequired: captureAngles.length,
        });
        setActiveAngle(nextAngle);
      } else if (nextAngle === targetAngle) {
        console.log('[capture] angle sample accepted', {
          angle: targetAngle,
          accepted: nextShots[targetAngle].length,
          required: getRequiredFramesForAngle(targetAngle),
        });
      } else {
        console.log('[capture] ALL angles complete — finalizing', {
          completedAngle: targetAngle,
          totalCompleted: captureAngles.length,
          totalRequired: captureAngles.length,
        });
        finalizedRef.current = true;
      }
      return true;
    },
    [captureSnapshot, safeDetect, videoElement]
  );

  useEffect(() => {
    if (!streamActive || !videoElement || !modelReady || canSubmit) return;
    runningRef.current = true;

    let cancelled = false;
    const scheduleNext = () => {
      if (cancelled) return;
      detectionTimerRef.current = window.setTimeout(loop, detectionIntervalMs);
    };

    const loop = () => {
      if (cancelled || !runningRef.current) return;
      if (finalizedRef.current || allAnglesComplete(latestShotsRef.current)) {
        finalizedRef.current = true;
        runningRef.current = false;
        const timerId = detectionTimerRef.current;
        if (timerId !== null) window.clearTimeout(timerId);
        detectionTimerRef.current = null;
        setIsAutoCapturing(false);
        console.log('[capture-loop] exiting — all captures finalized', {
          totalRequired: captureAngles.length,
        });
        setFeedback((prev) => ({
          ...prev,
          guidanceState: 'complete',
          liveMessage: 'All captures complete.',
          holdProgress: 1,
        }));
        return;
      }
      if (
        !videoElement ||
        videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        scheduleNext();
        return;
      }

      const now = performance.now();
      if (now < cooldownUntilRef.current) {
        const angle = currentAngleRef.current;
        const captured = latestShotsRef.current[angle]?.length ?? 0;
        const total = getRequiredFramesForAngle(angle);
        
        setFeedback((prev) => ({
          ...prev,
          guidanceState: 'cooldown',
          liveMessage: `Capturing ${Math.min(total, Math.max(1, captured))}/${total}`,
          holdProgress: 1,
        }));
        setDebugState((prev) => ({
          ...prev,
          expectedAngle: currentAngleRef.current,
          expectedPose: getExpectedPoseLabel(currentAngleRef.current),
          guidanceMessage: `Capturing ${Math.min(total, Math.max(1, captured))}/${total}`,
          stableForMs: 0,
          captureQualityState: 'cooldown',
          currentSampleCount:
            latestShotsRef.current[currentAngleRef.current]?.length ?? 0,
          blockedReason: 'cooldown',
          blockerReason: 'cooldown',
        }));
        scheduleNext();
        return;
      }

      const angle = currentAngleRef.current;
      if (isAngleComplete(latestShotsRef.current, angle)) {
        const nextAngle = findFirstMissingAngle(latestShotsRef.current);
        if (nextAngle) {
          console.log('[capture-loop] angle already done, advancing', {
            doneAngle: angle,
            nextAngle,
          });
          setActiveAngle(nextAngle);
          scheduleNext();
          return;
        }
        console.log('[capture-loop] all angles already done — finalizing', {
          angle,
        });
        finalizedRef.current = true;
        runningRef.current = false;
        setFeedback((prev) => ({
          ...prev,
          guidanceState: 'complete',
          liveMessage: 'All captures complete.',
          holdProgress: 1,
        }));
        return;
      }
      const detection = safeDetect(videoElement);
      const faces = detection?.faceLandmarks ?? [];

      if (faces.length === 0) {
        stableSinceRef.current = 0;
        stableGraceUntilRef.current = 0;
        setFeedback({
          guidanceState: 'no_face',
          instruction: getAngleGuidance(angle),
          liveMessage: 'Center your face',
          holdProgress: 0,
          readiness: {
            faceDetected: false,
            singleFace: false,
            faceLargeEnough: false,
            centered: true,
            eyesVisible: false,
            sharpEnough: true,
            brightnessOk: true,
            angleMatch: false,
            livenessPassed: livenessState.completed,
          },
        });
        setDebugState((prev) => ({
          ...prev,
          yaw: null,
          rawYaw: null,
          normalizedYaw: null,
          pitch: null,
          rawPitch: null,
          normalizedPitch: null,
          roll: null,
          userFacingDirection: 'unknown',
          expectedPose: getExpectedPoseLabel(angle),
          guidanceMessage: getAngleGuidance(angle),
          expectedAngle: angle,
          angleState: 'invalid',
          currentPoseState: 'invalid',
          requiredPitchRange: getRequiredPitchRange(angle),
          livenessChallenge: livenessState.completed
            ? null
            : livenessSequenceRef.current[livenessIndexRef.current] ?? null,
          stableForMs: 0,
          captureQualityState: 'no_face',
          currentSampleCount: latestShotsRef.current[angle]?.length ?? 0,
          blockedReason: 'no_face',
          blockerReason: 'no_face',
        }));
        scheduleNext();
        return;
      }

      if (faces.length > 1) {
        stableSinceRef.current = 0;
        stableGraceUntilRef.current = 0;
        setFeedback({
          guidanceState: 'multiple_faces',
          instruction: getAngleGuidance(angle),
          liveMessage: 'Only one face should be visible',
          holdProgress: 0,
          readiness: {
            faceDetected: true,
            singleFace: false,
            faceLargeEnough: false,
            centered: true,
            eyesVisible: false,
            sharpEnough: true,
            brightnessOk: true,
            angleMatch: false,
            livenessPassed: livenessState.completed,
          },
        });
        setDebugState((prev) => ({
          ...prev,
          yaw: null,
          rawYaw: null,
          normalizedYaw: null,
          pitch: null,
          rawPitch: null,
          normalizedPitch: null,
          roll: null,
          userFacingDirection: 'unknown',
          expectedPose: getExpectedPoseLabel(angle),
          guidanceMessage: getAngleGuidance(angle),
          expectedAngle: angle,
          angleState: 'invalid',
          currentPoseState: 'invalid',
          requiredPitchRange: getRequiredPitchRange(angle),
          livenessChallenge: livenessState.completed
            ? null
            : livenessSequenceRef.current[livenessIndexRef.current] ?? null,
          stableForMs: 0,
          captureQualityState: 'multiple_faces',
          currentSampleCount: latestShotsRef.current[angle]?.length ?? 0,
          blockedReason: 'multiple_faces',
          blockerReason: 'multiple_faces',
        }));
        scheduleNext();
        return;
      }

      const landmarks = faces[0];
      const box = computeFaceBox(landmarks);
      const faceAreaRatio = Math.max(
        0,
        (box.maxX - box.minX) * (box.maxY - box.minY)
      );
      const pose = estimateYawPitch(landmarks);
      const centerOffset = Math.hypot((box.minX + box.maxX) / 2 - 0.5, (box.minY + box.maxY) / 2 - 0.5);
      const centered = centerOffset <= enrollmentValidationConfig.maxCenterOffset;
      const edgeMargin = Math.min(box.minX, box.minY, 1 - box.maxX, 1 - box.maxY);
      const edgeOk = edgeMargin >= enrollmentValidationConfig.minEdgeMarginRatio;
      
      const eyesVisible = areEyesVisible(landmarks);
      const videoQuality = analyzeVideoQuality(videoElement);
      const resolutionOk = videoQuality.resolutionOk;
      const sharpEnough =
        videoQuality.blurVariance >= enrollmentValidationConfig.minBlurVariance;
      const brightnessOk =
        videoQuality.brightness >= enrollmentValidationConfig.brightnessRange.min &&
        videoQuality.brightness <= enrollmentValidationConfig.brightnessRange.max;
      const sizeOk = faceAreaRatio >= MIN_FACE_AREA_RATIO && faceAreaRatio <= MAX_FACE_AREA_RATIO;
      const livenessComplete =
        livenessPassCountRef.current >= enrollmentValidationConfig.livenessPassCount;
      if (!livenessComplete) {
        let challenge = livenessSequenceRef.current[livenessIndexRef.current];
        if (!challenge) {
          livenessSequenceRef.current = makeLivenessSequence();
          livenessIndexRef.current = 0;
          challenge = livenessSequenceRef.current[0];
        }
        if (!challenge) {
          scheduleNext();
          return;
        }

        const livenessQualityOk = sizeOk && eyesVisible;
        if (livenessBaselineYawRef.current === null && livenessQualityOk) {
          livenessBaselineYawRef.current = pose.yaw;
          livenessBaselinePitchRef.current = pose.pitch;
        }

        let livenessBlockerReason = 'move_more';
        let livenessInstruction = getLivenessInstruction(challenge);
        if (!sizeOk) {
          livenessBlockerReason =
            faceAreaRatio < MIN_FACE_AREA_RATIO ? 'face_too_small' : 'face_too_large';
          livenessInstruction =
            faceAreaRatio < MIN_FACE_AREA_RATIO ? 'Move closer' : 'Move back';
        } else if (!eyesVisible) {
          livenessBlockerReason = 'eyes_hidden';
          livenessInstruction = 'Keep your eyes visible';
        } else if (livenessBaselineYawRef.current === null) {
          livenessBlockerReason = 'baseline_pending';
          livenessInstruction = 'Face the camera.';
        }

        const challengeResult = livenessQualityOk
          ? livenessChallengeMatched(
          challenge,
          pose.yaw,
          landmarks,
              livenessBaselineYawRef.current,
              livenessObservedLeftDirectionRef.current
            )
          : {
              matched: false,
              yawDelta:
                livenessBaselineYawRef.current === null
                  ? null
                  : pose.yaw - livenessBaselineYawRef.current,
              expectedDirection: getLivenessExpectedDirection(
                challenge,
                livenessObservedLeftDirectionRef.current
              ),
              observedDirection: null,
            };
        if (livenessQualityOk && livenessChallengeStartedAtRef.current === 0) {
          livenessChallengeStartedAtRef.current = now;
        }
        const matched = challengeResult.matched;
        if (livenessQualityOk && !matched) {
          if (challenge === 'left') {
            livenessInstruction = 'Turn your head left.';
          } else if (challenge === 'right') {
            livenessInstruction = 'Turn your head right.';
          } else if (challenge === 'center') {
            livenessInstruction = 'Face the camera.';
          }
        }

        if (matched) {
          if (livenessMatchedSinceRef.current === 0) {
            livenessMatchedSinceRef.current = now;
          }
          if (now - livenessMatchedSinceRef.current >= LIVENESS_HOLD_MS) {
            if (
              challenge === 'left' &&
              challengeResult.observedDirection !== null &&
              livenessObservedLeftDirectionRef.current === null
            ) {
              livenessObservedLeftDirectionRef.current = challengeResult.observedDirection;
            }
            livenessPassCountRef.current += 1;
            livenessIndexRef.current += 1;
            livenessMatchedSinceRef.current = 0;
            livenessChallengeStartedAtRef.current = 0;
            livenessBaselineYawRef.current = null;
            livenessBaselinePitchRef.current = null;
          }
        } else {
          livenessMatchedSinceRef.current = 0;
        }

        const timedOut =
          livenessChallengeStartedAtRef.current > 0 &&
          now - livenessChallengeStartedAtRef.current >= LIVENESS_CHALLENGE_TIMEOUT_MS;
        if (timedOut) {
          livenessIndexRef.current += 1;
          livenessMatchedSinceRef.current = 0;
          livenessChallengeStartedAtRef.current = 0;
          livenessBaselineYawRef.current = null;
          livenessBaselinePitchRef.current = null;
        }

        if (
          livenessIndexRef.current >= livenessSequenceRef.current.length &&
          livenessPassCountRef.current < enrollmentValidationConfig.livenessPassCount
        ) {
          livenessAttemptsRef.current += 1;
          if (livenessAttemptsRef.current > enrollmentValidationConfig.livenessMaxRetries) {
            livenessAttemptsRef.current = 0;
          }
          livenessSequenceRef.current = makeLivenessSequence();
          livenessIndexRef.current = 0;
          livenessMatchedSinceRef.current = 0;
          livenessChallengeStartedAtRef.current = 0;
        }

        const completedCount = livenessPassCountRef.current;
        const done =
          completedCount >= enrollmentValidationConfig.livenessPassCount;
        const nextChallenge = done
          ? null
          : livenessSequenceRef.current[livenessIndexRef.current] ?? null;
        setLivenessState({
          completed: done,
          failed: false,
          currentChallenge: nextChallenge,
          completedCount,
          requiredCount: enrollmentValidationConfig.livenessPassCount,
          message: done
            ? 'Liveness complete'
            : getLivenessInstruction(nextChallenge),
        });
        setDebugState((prev) => ({
          ...prev,
          yaw: pose.yaw,
          rawYaw: pose.yaw,
          normalizedYaw: normalizeYawForUser(pose.yaw),
          pitch: pose.pitch,
          rawPitch: pose.pitch,
          normalizedPitch: normalizePitchForUser(pose.pitch),
          roll: pose.roll,
          userFacingDirection: getUserFacingDirection(pose.yaw),
          expectedPose: getLivenessInstruction(nextChallenge),
          guidanceMessage: livenessInstruction,
          baselineYaw: livenessBaselineYawRef.current,
          baselinePitch: livenessBaselinePitchRef.current,
          yawDelta: challengeResult.yawDelta,
          pitchDelta:
            livenessBaselinePitchRef.current === null
              ? null
              : pose.pitch - livenessBaselinePitchRef.current,
          expectedAngle: angle,
          angleState: getPoseState(angle, pose.yaw, pose.pitch),
          currentPoseState: getPoseState(angle, pose.yaw, pose.pitch),
          requiredPitchRange: getRequiredPitchRange(angle),
          livenessChallenge: nextChallenge,
          livenessExpectedDirection: challengeResult.expectedDirection,
          livenessCompletedCount: completedCount,
          livenessRequiredPassCount: enrollmentValidationConfig.livenessPassCount,
          livenessAttempts: livenessAttemptsRef.current,
          livenessBlockerReason,
          stableForMs: 0,
          captureQualityState: done ? 'liveness_complete' : livenessBlockerReason,
          currentSampleCount: latestShotsRef.current[angle]?.length ?? 0,
          blockedReason: done ? 'liveness_complete' : livenessBlockerReason,
          blockerReason: done ? 'liveness_complete' : livenessBlockerReason,
        }));
        if (!done) {
          setFeedback({
            guidanceState: eyesVisible ? 'liveness' : 'eyes_hidden',
            instruction: livenessInstruction,
            liveMessage: eyesVisible
              ? getLivenessHelper(nextChallenge)
              : 'Face lost, look at the camera again',
            holdProgress: matched ? Math.min(1, (now - livenessMatchedSinceRef.current) / LIVENESS_HOLD_MS) : 0,
            readiness: {
              faceDetected: true,
              singleFace: true,
              faceLargeEnough: faceAreaRatio >= MIN_FACE_AREA_RATIO && faceAreaRatio <= MAX_FACE_AREA_RATIO,
              centered,
              eyesVisible,
              sharpEnough: sharpEnough && resolutionOk,
              brightnessOk,
              angleMatch: livenessQualityOk,
              livenessPassed: false,
            },
          });
          scheduleNext();
          return;
        }
      }
      const marginBoost = Math.min(10, Math.floor(consecutiveFailuresRef.current / 10) * 2);
      const baseline =
        livenessBaselineYawRef.current === null || livenessBaselinePitchRef.current === null
          ? null
          : {
              yaw: livenessBaselineYawRef.current,
              pitch: livenessBaselinePitchRef.current,
            };
      const angleState = getHybridPoseState(angle, pose.yaw, pose.pitch, baseline, marginBoost);
      const angleValid = angleState === 'valid';
      const gateOk =
        angleValid &&
        sizeOk &&
        centered &&
        edgeOk &&
        eyesVisible &&
        sharpEnough &&
        brightnessOk &&
        resolutionOk;

      if (gateOk) {
        if (stableSinceRef.current === 0) {
          stableSinceRef.current = now;
        }
        stableGraceUntilRef.current = now + STABILITY_GRACE_MS;
      } else if (
        stableSinceRef.current > 0 &&
        now <= stableGraceUntilRef.current &&
        sizeOk &&
        eyesVisible
      ) {
        // Keep the stability window alive for tiny flickers (pose, edge, blur), but do not capture.
      } else {
        stableSinceRef.current = 0;
        stableGraceUntilRef.current = 0;
        consecutiveFailuresRef.current += 1;
      }

      const stableFor = stableSinceRef.current > 0 ? now - stableSinceRef.current : 0;
      const isStable = stableFor >= STABILITY_WINDOW_MS;

      let { instruction, liveMessage } = getDynamicAngleGuidance(angle, pose.yaw, pose.pitch, faceAreaRatio);
      const lastG = lastGuidanceRef.current;
      
      // Debounce logic for guidance text
      if (now - lastG.timestamp < GUIDANCE_STICK_MS && lastG.instruction && (!angleValid || !sizeOk)) {
        instruction = lastG.instruction;
        liveMessage = lastG.liveMessage;
      } else if (!angleValid || !sizeOk) {
        lastGuidanceRef.current = { instruction, liveMessage, timestamp: now };
      } else {
        lastGuidanceRef.current = { instruction: '', liveMessage: '', timestamp: 0 };
      }

      let guidanceState: CaptureFeedback['guidanceState'] = 'wrong_angle';
      let blockedReason = 'wrong_angle';
      if (gateOk) {
        guidanceState = isStable ? 'ready' : 'hold_steady';
        blockedReason = isStable ? 'ready' : 'hold_steady';
      } else if (faceAreaRatio < MIN_FACE_AREA_RATIO) {
        guidanceState = 'face_too_small';
        blockedReason = 'face_too_small';
      } else if (faceAreaRatio > MAX_FACE_AREA_RATIO) {
        guidanceState = 'face_too_small';
        instruction = 'Move back';
        liveMessage = 'Face too close';
        blockedReason = 'face_too_large';
      } else if (!centered || !edgeOk) {
        guidanceState = 'off_center';
        instruction = 'Center your face';
        liveMessage = 'Center your face';
        blockedReason = !edgeOk ? 'face_too_close_to_edge' : 'off_center';
      } else if (!eyesVisible) {
        guidanceState = 'eyes_hidden';
        instruction = 'Keep your eyes visible';
        liveMessage = 'Keep your eyes visible';
        blockedReason = 'eyes_hidden';
      } else if (!resolutionOk) {
        guidanceState = 'blurry';
        instruction = 'Use a higher resolution camera';
        liveMessage = 'Camera resolution is too low';
        blockedReason = 'resolution_too_low';
      } else if (!sharpEnough) {
        guidanceState = 'blurry';
        instruction = 'Move slowly so we can capture a sharp image.';
        liveMessage = 'Move slowly so we can capture a sharp image.';
        blockedReason = 'blurry';
      } else if (!brightnessOk) {
        guidanceState =
          videoQuality.brightness < enrollmentValidationConfig.brightnessRange.min
            ? 'lighting_low'
            : 'lighting_high';
        instruction =
          videoQuality.brightness < enrollmentValidationConfig.brightnessRange.min
            ? 'Move into brighter light'
            : 'Reduce direct light';
        liveMessage =
          videoQuality.brightness < enrollmentValidationConfig.brightnessRange.min
            ? 'Lighting is too low'
            : 'Lighting is too bright';
        blockedReason = guidanceState;
      } else if (angleState === 'near_valid') {
        guidanceState = 'wrong_angle';
        blockedReason = 'near_valid_pose';
        if (angle === 'left') {
          instruction = 'Turn your head left.';
          liveMessage = 'Turn your head left.';
        } else if (angle === 'right') {
          instruction = 'Turn your head right.';
          liveMessage = 'Turn your head right.';
        } else if (angle === 'up') {
          instruction = 'Lift your chin slightly';
          liveMessage = 'Lift your chin slightly';
        } else if (angle === 'down') {
          instruction = 'Lower your chin slightly';
          liveMessage = 'Lower your chin slightly';
        }
      }

      const captured = latestShotsRef.current[angle]?.length ?? 0;
      const total = getRequiredFramesForAngle(angle);

      setFeedback({
        guidanceState,
        instruction,
        liveMessage: gateOk
          ? isStable
            ? `Capturing ${Math.min(total, captured + 1)}/${total}`
            : captured > 0 ? `Hold still (${captured}/${total})` : 'Hold still'
          : liveMessage,
        holdProgress: gateOk ? Math.min(1, stableFor / STABILITY_WINDOW_MS) : 0,
        readiness: {
          faceDetected: true,
          singleFace: true,
          faceLargeEnough: sizeOk,
          centered: centered && edgeOk,
          eyesVisible,
          sharpEnough: sharpEnough && resolutionOk,
          brightnessOk,
          angleMatch: angleValid,
          livenessPassed: true,
        },
      });
      setDebugState((prev) => ({
        ...prev,
        yaw: pose.yaw,
        rawYaw: pose.yaw,
        normalizedYaw: normalizeYawForUser(pose.yaw),
        pitch: pose.pitch,
        rawPitch: pose.pitch,
        normalizedPitch: normalizePitchForUser(pose.pitch),
        roll: pose.roll,
        userFacingDirection: getUserFacingDirection(pose.yaw),
        expectedPose: getExpectedPoseLabel(angle),
        guidanceMessage: instruction,
        baselineYaw: livenessBaselineYawRef.current,
        baselinePitch: livenessBaselinePitchRef.current,
        yawDelta:
          livenessBaselineYawRef.current === null
            ? null
            : pose.yaw - livenessBaselineYawRef.current,
        pitchDelta:
          livenessBaselinePitchRef.current === null
            ? null
            : pose.pitch - livenessBaselinePitchRef.current,
        expectedAngle: angle,
        angleState,
        currentPoseState: angleState,
        requiredPitchRange: getRequiredPitchRange(angle),
        livenessChallenge: null,
        livenessCompletedCount: livenessPassCountRef.current,
        livenessRequiredPassCount: enrollmentValidationConfig.livenessPassCount,
        livenessAttempts: livenessAttemptsRef.current,
        stableForMs: Math.round(stableFor),
        stableRequiredMs: STABILITY_WINDOW_MS,
        captureQualityState: gateOk ? 'quality_ok' : blockedReason,
        cameraReady: videoElement !== null && videoElement.readyState >= 2,
        frameLoopRunning: runningRef.current,
        faceDetected: true,
        faceBox: JSON.stringify({ minX: box.minX.toFixed(2), maxX: box.maxX.toFixed(2), minY: box.minY.toFixed(2), maxY: box.maxY.toFixed(2) }),
        faceCenterOffset: centerOffset,
        faceSizeRatio: faceAreaRatio,
        visibilityValid: true,
        eyesValid: eyesVisible,
        framingValid: centered && edgeOk,
        lightingValid: brightnessOk,
        blurValid: sharpEnough && resolutionOk,
        canCapture: gateOk && isStable,
        lastCaptureError: '',
        currentSampleCount: latestShotsRef.current[angle]?.length ?? 0,
        blockedReason,
        blockerReason: blockedReason,
      }));

      if (!gateOk || !isStable || autoCaptureLockRef.current) {
        scheduleNext();
        return;
      }

      autoCaptureLockRef.current = true;
      setIsAutoCapturing(true);

      void (async () => {
        try {
          await captureAngle(angle, false, Math.round(stableFor));
        } finally {
          autoCaptureLockRef.current = false;
          setIsAutoCapturing(false);
          scheduleNext();
        }
      })();
    };

    loop();

    return () => {
      cancelled = true;
      runningRef.current = false;
      const timerId = detectionTimerRef.current;
      if (timerId !== null) window.clearTimeout(timerId);
      detectionTimerRef.current = null;
      autoCaptureLockRef.current = false;
    };
  }, [
    canSubmit,
    captureAngle,
    modelReady,
    safeDetect,
    streamActive,
    livenessState.completed,
    videoElement,
  ]);

  const retakeAngle = useCallback((angle: VerificationAngle) => {
    setCapturedShots((current) => {
      const next = { ...current };
      for (const existing of next[angle]) {
        URL.revokeObjectURL(existing.previewUrl);
      }
      next[angle] = [];
      return next;
    });
    cooldownUntilRef.current = 0;
    finalizedRef.current = false;
    runningRef.current = false;
    stableSinceRef.current = 0;
    stableGraceUntilRef.current = 0;
    setActiveAngle(angle);
    setFeedback((prev) => ({
      ...prev,
      instruction: getAngleGuidance(angle),
      liveMessage: getAngleGuidance(angle),
      holdProgress: 0,
    }));
  }, []);

  const restartCapture = useCallback(() => {
    setCapturedShots((current) => {
      for (const shots of Object.values(current)) {
        for (const shot of shots) {
          URL.revokeObjectURL(shot.previewUrl);
        }
      }
      return emptyCapturedShots();
    });
    livenessSequenceRef.current = makeLivenessSequence();
    livenessIndexRef.current = 0;
    livenessPassCountRef.current = 0;
    livenessAttemptsRef.current = 0;
    livenessMatchedSinceRef.current = 0;
    livenessChallengeStartedAtRef.current = 0;
    livenessBaselineYawRef.current = null;
    livenessBaselinePitchRef.current = null;
    livenessObservedLeftDirectionRef.current = null;
    stableSinceRef.current = 0;
    stableGraceUntilRef.current = 0;
    consecutiveFailuresRef.current = 0;
    cooldownUntilRef.current = 0;
    finalizedRef.current = false;
    setActiveAngle('front');
    setLivenessState({
      completed: false,
      failed: false,
      currentChallenge: livenessSequenceRef.current[0] ?? null,
      completedCount: 0,
      requiredCount: enrollmentValidationConfig.livenessPassCount,
      message: 'Complete liveness check',
    });
    setFeedback({
      guidanceState: 'no_face',
      instruction: perAngleInstruction.front,
      liveMessage: 'Center your face',
      holdProgress: 0,
      readiness: {
        faceDetected: false,
        singleFace: false,
        faceLargeEnough: false,
        centered: true,
        eyesVisible: false,
        sharpEnough: true,
        brightnessOk: true,
        angleMatch: false,
        livenessPassed: false,
      },
    });
  }, []);

  const focusAngle = useCallback((angle: VerificationAngle) => {
    setActiveAngle(angle);
  }, []);

  const captureAnyway = useCallback(async () => {
    setFeedback((prev) => ({
      ...prev,
      liveMessage: 'Manual capture is disabled for enrollment quality.',
    }));
    return false;
  }, []);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  const capturesByAngle = useMemo(() => {
    return captureAngles.reduce(
      (accumulator, angle) => {
        accumulator[angle] = capturedShots[angle].map((shot) => shot.blob);
        return accumulator;
      },
      {
        front: [],
        left: [],
        right: [],
        up: [],
        down: [],
        natural_front: [],
      } as VerificationCapturesByAngle
    );
  }, [capturedShots]);

  const frameMetadataByAngle = useMemo(() => {
    return captureAngles.reduce(
      (accumulator, angle) => {
        accumulator[angle] = capturedShots[angle].map((shot) => ({
          capturedAt: shot.capturedAt,
          captureLatencyMs: shot.captureLatencyMs,
        }));
        return accumulator;
      },
      {
        front: [],
        left: [],
        right: [],
        up: [],
        down: [],
        natural_front: [],
      } as VerificationFrameMetadataByAngle
    );
  }, [capturedShots]);

  const state: FaceCaptureState = {
    modelReady,
    modelErrorMessage,
    currentAngle,
    currentAngleIndex,
    capturedShots,
    capturedCount,
    canSubmit,
    isAutoCapturing,
    feedback,
    liveness: livenessState,
    debug: debugState,
  };

  return {
    state,
    capturesByAngle,
    frameMetadataByAngle,
    firstMissingAngle,
    retakeAngle,
    restartCapture,
    focusAngle,
    captureAnyway,
    clearSession,
  };
}
