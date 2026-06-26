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
const BURST_CAPTURE_GAP_MS = 500;
const LIVENESS_HOLD_MS = enrollmentValidationConfig.livenessHoldMs;

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

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
  const shuffled = [...livenessChallengePool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, enrollmentValidationConfig.livenessChallengeCount);
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
} {
  const leftEye = getLandmark(landmarks, 33);
  const rightEye = getLandmark(landmarks, 263);
  const noseTip = getLandmark(landmarks, 1);
  const upperLip = getLandmark(landmarks, 13);
  const lowerLip = getLandmark(landmarks, 14);

  if (!leftEye || !rightEye || !noseTip || !upperLip || !lowerLip) {
    return { yaw: 0, pitch: 0 };
  }

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeDistance = Math.max(0.001, Math.abs(rightEye.x - leftEye.x));
  const mouthMidY = (upperLip.y + lowerLip.y) / 2;
  const verticalSpan = Math.max(0.02, mouthMidY - eyeMidY);

  const yawNorm = (noseTip.x - eyeMidX) / (eyeDistance * 0.5);
  const pitchNorm = (noseTip.y - eyeMidY) / verticalSpan - 0.5;

  return {
    yaw: clamp(yawNorm * 32, -45, 45),
    pitch: clamp(pitchNorm * 42, -35, 35),
  };
}

function isRoughAngleMatch(
  angle: VerificationAngle,
  yaw: number,
  pitch: number,
  marginBoost: number = 0
) {
  if (angle === 'natural_front') return true;
  const threshold = ANGLE_THRESHOLDS[angle];
  if (!threshold) return false;
  const yawMargin = marginBoost;
  const pitchMargin = marginBoost;

  return (
    yaw >= threshold.yawMin - yawMargin &&
    yaw <= threshold.yawMax + yawMargin &&
    pitch >= threshold.pitchMin - pitchMargin &&
    pitch <= threshold.pitchMax + pitchMargin
  );
}

function challengeMatched(
  challenge: LivenessChallenge,
  yaw: number,
  pitch: number,
  landmarks: LandmarkPoint[]
) {
  if (challenge === 'blink') {
    return areEyesClosed(landmarks);
  }
  return isRoughAngleMatch(challenge, yaw, pitch, 3);
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
    if (yaw < ANGLE_THRESHOLDS.front.yawMin) return { instruction: 'Look right', liveMessage: 'Turn slightly right' };
    if (yaw > ANGLE_THRESHOLDS.front.yawMax) return { instruction: 'Look left', liveMessage: 'Turn slightly left' };
    if (pitch < ANGLE_THRESHOLDS.front.pitchMin) return { instruction: 'Look down', liveMessage: 'Look slightly down' };
    if (pitch > ANGLE_THRESHOLDS.front.pitchMax) return { instruction: 'Look up', liveMessage: 'Look slightly up' };
    return { instruction: 'Look forward', liveMessage: 'Look forward' };
  }
  if (angle === 'left') {
    if (yaw > ANGLE_THRESHOLDS.left.yawMax) return { instruction: 'Turn slightly left', liveMessage: 'Turn slightly left' };
    if (pitch < ANGLE_THRESHOLDS.left.pitchMin || pitch > ANGLE_THRESHOLDS.left.pitchMax) return { instruction: 'Keep head level', liveMessage: 'Level your head' };
    return { instruction: 'Look left', liveMessage: 'Look left' };
  }
  if (angle === 'right') {
    if (yaw < ANGLE_THRESHOLDS.right.yawMin) return { instruction: 'Turn slightly right', liveMessage: 'Turn slightly right' };
    if (pitch < ANGLE_THRESHOLDS.right.pitchMin || pitch > ANGLE_THRESHOLDS.right.pitchMax) return { instruction: 'Keep head level', liveMessage: 'Level your head' };
    return { instruction: 'Look right', liveMessage: 'Look right' };
  }
  if (angle === 'up') {
    if (pitch > ANGLE_THRESHOLDS.up.pitchMax) return { instruction: 'Look up', liveMessage: 'Look higher' };
    if (yaw < ANGLE_THRESHOLDS.up.yawMin || yaw > ANGLE_THRESHOLDS.up.yawMax) return { instruction: 'Face forward', liveMessage: 'Keep face centered' };
    return { instruction: 'Look up', liveMessage: 'Look up' };
  }
  if (angle === 'down') {
    if (pitch < ANGLE_THRESHOLDS.down.pitchMin) return { instruction: 'Look down', liveMessage: 'Look lower' };
    if (yaw < ANGLE_THRESHOLDS.down.yawMin || yaw > ANGLE_THRESHOLDS.down.yawMax) return { instruction: 'Face forward', liveMessage: 'Keep face centered' };
    return { instruction: 'Look down', liveMessage: 'Look down' };
  }

  return { instruction: getAngleGuidance(angle), liveMessage: getAngleGuidance(angle) };
}

function getAngleGuidance(angle: VerificationAngle) {
  if (angle === 'natural_front') return 'Look at the camera naturally';
  if (angle === 'front') return 'Look forward';
  if (angle === 'left') return 'Look left';
  if (angle === 'right') return 'Look right';
  if (angle === 'up') return 'Look up';
  return 'Look down';
}

function waitMs(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function stopVideoStream(videoElement: HTMLVideoElement | null) {
  if (!videoElement) return;
  const source = videoElement.srcObject;
  if (!(source instanceof MediaStream)) return;
  for (const track of source.getTracks()) {
    track.stop();
  }
  videoElement.srcObject = null;
}

async function loadFaceLandmarker() {
  if (faceLandmarkerPromise) return faceLandmarkerPromise;

  faceLandmarkerPromise = (async () => {
    const tasksVision = await import('@mediapipe/tasks-vision');
    const vision = await tasksVision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
    );

    return await tasksVision.FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      runningMode: 'VIDEO',
      numFaces: 2,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  })();

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
  const livenessSequenceRef = useRef<LivenessChallenge[]>(makeLivenessSequence());
  const livenessIndexRef = useRef(0);
  const livenessMatchedSinceRef = useRef(0);
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
    requiredCount: livenessSequenceRef.current.length,
    message: 'Complete liveness check',
  });

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
      } catch {
        if (cancelled) return;
        setModelReady(false);
        setModelErrorMessage(
          'Face guidance is temporarily unavailable. Please refresh and try again.'
        );
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

      stopVideoStream(videoElement);
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

      const requiredFrames = getRequiredFramesForAngle(targetAngle);
      const candidates: CapturedShot[] = [];
      for (let i = 0; i < requiredFrames; i += 1) {
        if (finalizedRef.current) break;
        if (isAngleComplete(latestShotsRef.current, targetAngle)) break;
        if (!force && currentAngleRef.current !== targetAngle) break;
        const detection = safeDetect(videoElement);
        const faces = detection?.faceLandmarks ?? [];

        if (force || faces.length === 1) {
          let yaw = 0;
          let pitch = 0;
          let faceAreaRatio = 0;

          if (faces.length === 1) {
            const landmarks = faces[0];
            const box = computeFaceBox(landmarks);
            faceAreaRatio = Math.max(
              0,
              (box.maxX - box.minX) * (box.maxY - box.minY)
            );
            const centerOffset = Math.hypot((box.minX + box.maxX) / 2 - 0.5, (box.minY + box.maxY) / 2 - 0.5);
            const edgeMargin = Math.min(box.minX, box.minY, 1 - box.maxX, 1 - box.maxY);
            if (
              centerOffset > MAX_CENTER_OFFSET ||
              edgeMargin < enrollmentValidationConfig.minEdgeMarginRatio ||
              !areEyesVisible(landmarks)
            ) {
              continue;
            }
            const pose = estimateYawPitch(landmarks);
            yaw = pose.yaw;
            pitch = pose.pitch;
          }

          const marginBoost = Math.min(10, Math.floor(consecutiveFailuresRef.current / 10) * 2);
          const angleOk = isRoughAngleMatch(targetAngle, yaw, pitch, marginBoost);
          const sizeOk = faceAreaRatio >= MIN_FACE_AREA_RATIO && faceAreaRatio <= MAX_FACE_AREA_RATIO;
          if (force || !angleOk || !sizeOk) {
            continue;
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
            if (candidates.some((candidate) => candidate.dataUrl === dataUrl)) {
              continue;
            }
            const warnings: string[] = [];
            if (!angleOk) warnings.push('angle');
            if (!sizeOk) warnings.push('face_size');
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
                centerOffset: 0,
                blurVariance: 0,
                brightness: 0,
                captureConfidence:
                  !force && angleOk && sizeOk ? 'ideal' : 'near_ready',
                warnings,
              },
            });
          }
        }

        if (i < requiredFrames - 1) {
          await waitMs(BURST_CAPTURE_GAP_MS);
        }
      }

      if (candidates.length === 0) return false;

      setCapturedShots((current) => {
        if (isAngleComplete(current, targetAngle)) {
          for (const candidate of candidates) {
            URL.revokeObjectURL(candidate.previewUrl);
          }
          return current;
        }
        for (const previous of current[targetAngle]) {
          URL.revokeObjectURL(previous.previewUrl);
        }
        return { ...current, [targetAngle]: candidates };
      });

      const nextShots: CapturedShotsByAngle = {
        ...latestShotsRef.current,
        [targetAngle]: candidates,
      };
      const nextAngle = findFirstMissingAngle(nextShots);
      cooldownUntilRef.current = performance.now() + POST_CAPTURE_COOLDOWN_MS;
      if (nextAngle) {
        console.log('[capture] angle complete, advancing', {
          completedAngle: targetAngle,
          nextAngle,
          totalCompleted: captureAngles.filter(
            (a) => isAngleComplete(nextShots, a)
          ).length,
          totalRequired: captureAngles.length,
        });
        setActiveAngle(nextAngle);
      } else {
        console.log('[capture] ALL angles complete — finalizing', {
          completedAngle: targetAngle,
          totalCompleted: captureAngles.length,
          totalRequired: captureAngles.length,
        });
        finalizedRef.current = true;
        stopVideoStream(videoElement);
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
        stopVideoStream(videoElement);
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
        setFeedback((prev) => ({
          ...prev,
          guidanceState: 'cooldown',
          liveMessage: 'Captured',
          holdProgress: 0,
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
        stopVideoStream(videoElement);
        return;
      }
      const detection = safeDetect(videoElement);
      const faces = detection?.faceLandmarks ?? [];

      if (faces.length === 0) {
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
        scheduleNext();
        return;
      }

      if (faces.length > 1) {
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
      const centered = centerOffset <= MAX_CENTER_OFFSET;
      const edgeMargin = Math.min(box.minX, box.minY, 1 - box.maxX, 1 - box.maxY);
      const edgeOk = edgeMargin >= enrollmentValidationConfig.minEdgeMarginRatio;
      const eyesVisible = areEyesVisible(landmarks);
      const livenessComplete = livenessIndexRef.current >= livenessSequenceRef.current.length;
      if (!livenessComplete) {
        const challenge = livenessSequenceRef.current[livenessIndexRef.current];
        const matched = challengeMatched(challenge, pose.yaw, pose.pitch, landmarks);
        if (matched) {
          if (livenessMatchedSinceRef.current === 0) {
            livenessMatchedSinceRef.current = now;
          }
          if (now - livenessMatchedSinceRef.current >= LIVENESS_HOLD_MS) {
            livenessIndexRef.current += 1;
            livenessMatchedSinceRef.current = 0;
          }
        } else {
          livenessMatchedSinceRef.current = 0;
        }
        const completedCount = Math.min(livenessIndexRef.current, livenessSequenceRef.current.length);
        const done = completedCount >= livenessSequenceRef.current.length;
        setLivenessState({
          completed: done,
          failed: false,
          currentChallenge: done ? null : livenessSequenceRef.current[completedCount] ?? null,
          completedCount,
          requiredCount: livenessSequenceRef.current.length,
          message: done ? 'Liveness complete' : `Liveness: ${challenge === 'blink' ? 'Blink' : getAngleGuidance(challenge)}`,
        });
        if (!done) {
          setFeedback({
            guidanceState: eyesVisible ? 'liveness' : 'eyes_hidden',
            instruction: challenge === 'blink' ? 'Blink once' : getAngleGuidance(challenge),
            liveMessage: eyesVisible ? 'Complete liveness check' : 'Keep your eyes visible',
            holdProgress: matched ? Math.min(1, (now - livenessMatchedSinceRef.current) / LIVENESS_HOLD_MS) : 0,
            readiness: {
              faceDetected: true,
              singleFace: true,
              faceLargeEnough: faceAreaRatio >= MIN_FACE_AREA_RATIO && faceAreaRatio <= MAX_FACE_AREA_RATIO,
              centered,
              eyesVisible,
              sharpEnough: true,
              brightnessOk: true,
              angleMatch: matched,
              livenessPassed: false,
            },
          });
          scheduleNext();
          return;
        }
      }
      const marginBoost = Math.min(10, Math.floor(consecutiveFailuresRef.current / 10) * 2);
      const nearAngle = isRoughAngleMatch(angle, pose.yaw, pose.pitch, marginBoost);
      const sizeOk = faceAreaRatio >= MIN_FACE_AREA_RATIO && faceAreaRatio <= MAX_FACE_AREA_RATIO;
      const gateOk = nearAngle && sizeOk && centered && edgeOk && eyesVisible;

      if (gateOk) {
        if (stableSinceRef.current === 0) {
          stableSinceRef.current = now;
        }
      } else {
        stableSinceRef.current = 0;
        consecutiveFailuresRef.current += 1;
      }

      const stableFor = stableSinceRef.current > 0 ? now - stableSinceRef.current : 0;
      const isStable = stableFor >= STABILITY_WINDOW_MS;

      let { instruction, liveMessage } = getDynamicAngleGuidance(angle, pose.yaw, pose.pitch, faceAreaRatio);
      const lastG = lastGuidanceRef.current;
      
      // Debounce logic for guidance text
      if (now - lastG.timestamp < GUIDANCE_STICK_MS && lastG.instruction && (!nearAngle || !sizeOk)) {
        instruction = lastG.instruction;
        liveMessage = lastG.liveMessage;
      } else if (!nearAngle || !sizeOk) {
        lastGuidanceRef.current = { instruction, liveMessage, timestamp: now };
      } else {
        lastGuidanceRef.current = { instruction: '', liveMessage: '', timestamp: 0 };
      }

      let guidanceState: CaptureFeedback['guidanceState'] = 'wrong_angle';
      if (gateOk) {
        guidanceState = isStable ? 'ready' : 'hold_steady';
      } else if (faceAreaRatio < MIN_FACE_AREA_RATIO) {
        guidanceState = 'face_too_small';
      } else if (!centered || !edgeOk) {
        guidanceState = 'off_center';
        instruction = 'Center your face';
        liveMessage = 'Center your face';
      } else if (!eyesVisible) {
        guidanceState = 'eyes_hidden';
        instruction = 'Keep your eyes visible';
        liveMessage = 'Keep your eyes visible';
      }

      setFeedback({
        guidanceState,
        instruction,
        liveMessage: gateOk
          ? `Capturing ${angle}...`
          : liveMessage,
        holdProgress: gateOk ? Math.min(1, stableFor / STABILITY_WINDOW_MS) : 0,
        readiness: {
          faceDetected: true,
          singleFace: true,
          faceLargeEnough: sizeOk,
          centered: centered && edgeOk,
          eyesVisible,
          sharpEnough: true, // We can evaluate blur here if needed
          brightnessOk: true,
          angleMatch: nearAngle,
          livenessPassed: true,
        },
      });

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
    setActiveAngle(angle);
    setFeedback((prev) => ({
      ...prev,
      instruction: getAngleGuidance(angle),
      liveMessage: getAngleGuidance(angle),
      holdProgress: 0,
    }));
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
  };

  return {
    state,
    capturesByAngle,
    frameMetadataByAngle,
    firstMissingAngle,
    retakeAngle,
    focusAngle,
    captureAnyway,
    clearSession,
  };
}
