'use client';

import { Camera, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  captureAngles,
  guidedAngles,
  getRequiredFramesForAngle,
  perAngleHint,
  perAngleInstruction,
} from '@/features/registration/capture/constants';
import { CameraPreview } from '@/features/registration/capture/CameraPreview';
import { useFaceCapture } from '@/features/registration/capture/useFaceCapture';
import { CircularProgressGuide } from '@/features/registration/verification/CircularProgressGuide';
import { useCamera } from '@/features/registration/verification/useCamera';
import { totalRequiredShots } from '@/features/registration/verification/constants';
import type {
  EnrollmentCompletionResult,
  VerificationCompletionSummary,
} from '@/features/registration/verification/types';
import {
  failedCaptureAngles,
  type FailedCapture,
} from '@/features/registration/verification/failedCaptures';
import { cn } from '@/lib/utils';

type GuidedEnrollmentCaptureProps = {
  studentId: string;
  onComplete: (
    summary: VerificationCompletionSummary
  ) => Promise<EnrollmentCompletionResult>;
  isSubmittingCompletion?: boolean;
  completionErrorMessage?: string | null;
  initialFailedCaptures?: FailedCapture[];
};

type SubmitPhase = 'idle' | 'submitting' | 'success' | 'error';

function getStorageKey(studentId: string) {
  const normalized = studentId.trim().toLowerCase();
  return `diu-lens-capture:${normalized || 'unknown'}`;
}

function getLivenessChallengeLabel(challenge: string | null) {
  if (challenge === 'left') return 'Turn Left';
  if (challenge === 'right') return 'Turn Right';
  if (challenge === 'center') return 'Look Straight';
  if (challenge === 'blink') return 'Blink Once';
  return 'Liveness';
}

function getLivenessChallengeHelper(challenge: string | null) {
  if (challenge === 'left') return 'Turn your head left.';
  if (challenge === 'right') return 'Turn your head right.';
  if (challenge === 'center') return 'Face the camera.';
  if (challenge === 'blink') return 'Keep your face centered while blinking.';
  return 'Keep your face centered.';
}

function HealthBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-medium border transition-colors",
      active 
        ? "bg-[#6493b5]/10 border-[#6493b5]/20 text-[#6493b5]" 
        : "bg-white/5 border-white/10 text-slate-500"
    )}>
      <div className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-[#6493b5]" : "bg-slate-600")} />
      {label}
    </div>
  );
}

function debugValue(value: string | number | boolean | null) {
  if (value === null) return 'null';
  if (typeof value === 'number' && !Number.isInteger(value)) {
    return value.toFixed(4);
  }
  return String(value);
}

const angleSummaryLabel = {
  front: 'Front',
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
  natural_front: 'Front',
} as const;

export function GuidedEnrollmentCapture({
  studentId,
  onComplete,
  isSubmittingCompletion = false,
  completionErrorMessage,
  initialFailedCaptures = [],
}: GuidedEnrollmentCaptureProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null
  );
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [failedCaptures, setFailedCaptures] = useState<FailedCapture[]>([]);
  const [submitDiagnostics, setSubmitDiagnostics] = useState({
    requestUrl: '',
    httpStatus: null as number | null,
    responseBody: null as string | null,
    error: null as string | null,
    imageCount: 0,
    countByAngle: '',
    imageBlobSizes: '',
    currentRoute: '',
    navigationTriggered: false,
  });
  const currentAngleRef = useRef<string>('front');
  const currentBlockerRef = useRef<string>('no_face');

  const {
    videoRef,
    status: permissionState,
    errorMessage,
    streamActive,
    requestAccess,
    resetPermission,
    stopStream,
    captureSnapshot,
  } = useCamera();

  const mergedVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      setVideoElement(node);
      videoRef(node);
    },
    [videoRef]
  );

  const {
    state,
    capturesByAngle,
    frameMetadataByAngle,
    clearSession,
    retakeAngle,
    invalidateAngles,
    restartCapture,
  } =
    useFaceCapture({
      videoElement,
      streamActive,
      captureSnapshot,
      storageKey: getStorageKey(studentId),
    });



  useEffect(() => {
    if (initialFailedCaptures.length) {
      setFailedCaptures(initialFailedCaptures);
      invalidateAngles(failedCaptureAngles(initialFailedCaptures));
    }
  }, [initialFailedCaptures, invalidateAngles]);

  useEffect(() => {
    currentAngleRef.current = state.currentAngle;
    currentBlockerRef.current = state.feedback.guidanceState;
  }, [state.currentAngle, state.feedback.guidanceState]);

  useEffect(() => {
    if (permissionState === 'idle') {
      void requestAccess();
    }
  }, [permissionState, requestAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }
          if (arg instanceof Error) {
            return arg.message;
          }
          if (arg && typeof arg === 'object' && 'message' in arg) {
            return String((arg as { message?: unknown }).message ?? '');
          }
          return String(arg);
        })
        .join(' ');

      if (
        message.includes('[capture-error]') ||
        message.includes('[capture-overlay-suppressed]') ||
        message.includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
        message.includes('XNNPACK delegate')
      ) {
        originalConsoleWarn(...args);
        return;
      }

      originalConsoleError(...args);
    };

    const previousOnError = window.onerror;
    const previousOnUnhandledRejection = window.onunhandledrejection;

    const describeError = (error: unknown) => {
      if (error instanceof Error) {
        return {
          message: error.message,
          stack: error.stack ?? null,
        };
      }
      return {
        message: typeof error === 'string' ? error : String(error),
        stack: null,
      };
    };

    const logCaptureError = (source: string, error: unknown) => {
      const details = describeError(error);
      console.error('[capture-overlay-suppressed]', {
        source,
        message: details.message,
        stack: details.stack,
        currentTargetAngle: currentAngleRef.current,
        currentBlocker: currentBlockerRef.current,
      });
    };

    window.onerror = (message, source, lineno, colno, error) => {
      logCaptureError('window.onerror', error ?? message);
      if (typeof previousOnError === 'function') {
        try {
          previousOnError.call(window, message, source, lineno, colno, error);
        } catch (handlerError) {
          console.error('[capture-overlay-suppressed]', {
            source: 'window.onerror.previous_handler_failed',
            message: String(handlerError),
            currentTargetAngle: currentAngleRef.current,
            currentBlocker: currentBlockerRef.current,
          });
        }
      }
      return true;
    };

    window.onunhandledrejection = (event) => {
      logCaptureError('window.onunhandledrejection', event.reason);
      event.preventDefault();
      if (typeof previousOnUnhandledRejection === 'function') {
        try {
          previousOnUnhandledRejection.call(window, event);
        } catch (handlerError) {
          console.error('[capture-overlay-suppressed]', {
            source: 'window.onunhandledrejection.previous_handler_failed',
            message: String(handlerError),
            currentTargetAngle: currentAngleRef.current,
            currentBlocker: currentBlockerRef.current,
          });
        }
      }
      return true;
    };

    return () => {
      console.error = originalConsoleError;
      window.onerror = previousOnError;
      window.onunhandledrejection = previousOnUnhandledRejection;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const handleSubmit = useCallback(async () => {
    console.log('[verification-timing] submit button clicked', {
      nowMs: Number(performance.now().toFixed(2)),
      canSubmit: state.canSubmit,
      isSubmittingCompletion,
    });
    if (isSubmittingCompletion || submitPhase === 'submitting' || !state.canSubmit) {
      return;
    }

    setLocalErrorMessage(null);
    setSubmitPhase('submitting');
    console.log('[verification] final submit triggered', {
      studentId,
      capturedCount: state.capturedCount,
    });
    const invalidGuidedAngle = guidedAngles.find((angle) => {
      const captures = capturesByAngle[angle] ?? [];
      const metadata = frameMetadataByAngle[angle] ?? [];
      if (captures.length !== getRequiredFramesForAngle(angle)) {
        return true;
      }
      if (metadata.length !== captures.length) {
        return true;
      }
      return captures.some(
        (capture) => !(capture instanceof Blob) || capture.size <= 0
      );
    });
    const totalImages = guidedAngles.reduce(
      (total, angle) => total + (capturesByAngle[angle]?.length ?? 0),
      0
    );
    if (!studentId.trim() || invalidGuidedAngle || totalImages !== totalRequiredShots) {
      console.warn('[verification] invalid guided captures', {
        studentId,
        angle: invalidGuidedAngle,
      });
      setLocalErrorMessage(
        'Enrollment payload is incomplete. Please retake missing captures.'
      );
      setSubmitPhase('error');
      return;
    }
    const captureSummary = captureAngles.map((angle) => {
      const captures = capturesByAngle[angle] ?? [];
      const sizes = captures.map((capture) => capture.size);
      const types = captures.map((capture) => capture.type);
      return {
        angle,
        count: captures.length,
        sizes,
        types,
        totalBytes: sizes.reduce((total, size) => total + size, 0),
      };
    });
    console.log('[verification] capture summary', {
      studentId,
      captureSummary,
    });
    const countByAngle = Object.fromEntries(
      guidedAngles.map((angle) => [angle, capturesByAngle[angle].length])
    );
    const imageBlobSizes = Object.fromEntries(
      guidedAngles.map((angle) => [
        angle,
        capturesByAngle[angle].map((capture) => capture.size),
      ])
    );
    setSubmitDiagnostics({
      requestUrl: '',
      httpStatus: null,
      responseBody: null,
      error: null,
      imageCount: totalImages,
      countByAngle: JSON.stringify(countByAngle),
      imageBlobSizes: JSON.stringify(imageBlobSizes),
      currentRoute: typeof window === 'undefined' ? '' : window.location.pathname,
      navigationTriggered: false,
    });

    try {
      const uploadAngles = guidedAngles;
      const summary: VerificationCompletionSummary = {
        livenessPassed: state.liveness.completed,
        verificationCompleted: true,
        totalRequiredShots,
        totalAcceptedShots: uploadAngles.reduce(
          (total, angle) => total + capturesByAngle[angle].length,
          0
        ),
        angles: uploadAngles.map((angle) => ({
          angle,
          acceptedShots: capturesByAngle[angle].length,
          requiredShots: getRequiredFramesForAngle(angle),
        })),
        capturesByAngle,
        frameMetadataByAngle,
      };

      const result = await onComplete(summary);
      setSubmitDiagnostics((current) => ({
        ...current,
        requestUrl: result.diagnostics.requestUrl,
        httpStatus: result.diagnostics.httpStatus,
        responseBody: result.diagnostics.responseBody,
        error: result.diagnostics.error,
      }));
      if (!result.success) {
        if (result.failedCaptures?.length) {
          setFailedCaptures(result.failedCaptures);
          invalidateAngles(failedCaptureAngles(result.failedCaptures));
        }
        setSubmitPhase('error');
        setLocalErrorMessage(result.message);
        return;
      }
      setSubmitPhase('success');
      if (result.registrationComplete) {
        clearSession();
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message !== 'Load failed'
          ? error.message
          : 'Unable to reach the enrollment service. Your captures are preserved; retry submission.';
      console.error('[verification] final submit failed at capture step', error);
      setSubmitDiagnostics((current) => ({
        ...current,
        error: error instanceof Error ? error.message : String(error),
      }));
      setSubmitPhase('error');
      setLocalErrorMessage(message);
    }
  }, [
    capturesByAngle,
    clearSession,
    frameMetadataByAngle,
    isSubmittingCompletion,
    onComplete,
    invalidateAngles,
    state.canSubmit,
    state.capturedCount,
    state.liveness.completed,
    studentId,
    submitPhase,
  ]);

  useEffect(() => {
    setFailedCaptures((current) => current.filter(
      (failure) => capturesByAngle[failure.angle].length < getRequiredFramesForAngle(failure.angle)
    ));
  }, [capturesByAngle]);

  useEffect(() => {
    if (state.canSubmit) {
      stopStream();
    }
  }, [state.canSubmit, stopStream]);

  const permissionBlocked = permissionState !== 'granted';

  const statusText = useMemo(() => {
    if (isSubmittingCompletion) {
      return 'Uploading verification images...';
    }

    if (state.canSubmit) {
      return completionErrorMessage ?? 'All captures completed.';
    }

    if (completionErrorMessage) {
      return completionErrorMessage;
    }

    if (localErrorMessage) {
      return localErrorMessage;
    }

    if (permissionBlocked) {
      return (
        errorMessage ??
        'Camera access is required for guided enrollment. Allow camera permission to continue.'
      );
    }

    if (state.modelErrorMessage) {
      return state.modelErrorMessage;
    }

    if (!state.modelReady) {
      return 'Loading face model...';
    }

    return state.feedback.liveMessage;
  }, [
    completionErrorMessage,
    errorMessage,
    isSubmittingCompletion,
    localErrorMessage,
    permissionBlocked,
    state.feedback.liveMessage,
    state.canSubmit,
    state.modelReady,
    state.modelErrorMessage,
  ]);

  const [debouncedStatusText, setDebouncedStatusText] = useState(statusText);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedStatusText(statusText);
    }, 1500);
    return () => clearTimeout(handler);
  }, [statusText]);

  const permissionButtonLabel =
    permissionState === 'requesting' ? 'Starting camera...' : 'Enable camera';
  const captureTitle = state.liveness.completed
    ? perAngleInstruction[state.currentAngle]
    : getLivenessChallengeLabel(state.liveness.currentChallenge);
  const captureHelper = state.liveness.completed
    ? perAngleHint[state.currentAngle]
    : getLivenessChallengeHelper(state.liveness.currentChallenge);
  const showCompletionState = state.canSubmit;
  const guidePoseState =
    state.feedback.guidanceState === 'ready' ||
    state.feedback.guidanceState === 'hold_steady' ||
    state.feedback.guidanceState === 'cooldown'
      ? 'valid'
      : state.debug.angleState === 'near_valid'
        ? 'near_valid'
        : 'invalid';
  const captureSummaryRows = captureAngles.map((angle) => ({
    angle,
    label: angleSummaryLabel[angle],
    count: capturesByAngle[angle]?.length ?? 0,
    required: getRequiredFramesForAngle(angle),
  }));
  const currentAngleAccepted = capturesByAngle[state.currentAngle]?.length ?? 0;
  const currentAngleRequired = getRequiredFramesForAngle(state.currentAngle);

  return (
    <section className="space-y-3">
      {/* ── Main scan card ──────────────────────────────────────── */}
      <div className="rounded-[1.15rem] border border-white/[0.07] bg-[#0d1728]/95 px-4 py-5 shadow-[0_24px_56px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:rounded-[1.2rem] sm:px-5 sm:py-6">
        <div className="space-y-5">

          {/* STATUS HEADER */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="mb-[0.2rem] text-[0.63rem] font-semibold tracking-[0.12em] uppercase"
                style={{ color: 'rgba(100, 147, 181, 0.7)' }}
              >
                {showCompletionState
                  ? 'Ready To Submit'
                  : state.liveness.completed
                    ? 'Face Verification'
                    : 'Liveness Check'}
              </p>
              <h3 className="landing-text-primary text-[1.08rem] font-semibold tracking-tight sm:text-[1.15rem]">
                {showCompletionState ? 'Ready to Submit' : captureTitle}
              </h3>
              <p className="mt-1 max-w-[15rem] text-[0.72rem] leading-snug text-slate-400">
                {showCompletionState
                  ? 'All enrollment captures are complete.'
                  : captureHelper}
              </p>
            </div>

            {/* Step dot progress */}
            <div
              className="flex items-center gap-[0.28rem] pt-1"
              aria-label={`Step ${captureAngles.indexOf(state.currentAngle) + 1} of ${captureAngles.length}`}
            >
              <span
                className={cn(
                  'mr-1 rounded-full transition-all duration-300',
                  state.liveness.completed
                    ? 'h-[5px] w-[5px] bg-emerald-300'
                    : 'biometric-dot-active h-[6px] w-[6px] bg-amber-300'
                )}
              />
              {captureAngles.map((angle, i) => {
                const currentIdx = captureAngles.indexOf(state.currentAngle);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const backendFailed = failedCaptures.some((failure) => failure.angle === angle);
                return (
                  <span
                    key={angle}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      backendFailed
                        ? 'h-[6px] w-[6px] bg-red-400'
                        : isDone
                        ? 'h-[5px] w-[5px] bg-[#6493b5]'
                        : isCurrent
                          ? 'biometric-dot-active h-[6px] w-[6px] bg-[#7BA8C0]'
                          : 'h-[4px] w-[4px] bg-white/[0.18]'
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* SCAN CIRCLE AREA */}
          <div className="relative mx-auto w-full max-w-[16rem] sm:max-w-[18rem]">

            {/* Ambient bloom behind circle */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(100, 147, 181,0.09) 0%, transparent 65%)',
              }}
            />

            {showCompletionState ? (
              <div className="relative flex aspect-square flex-col items-center justify-center rounded-full border border-emerald-300/20 bg-[#06130f] px-6 text-center shadow-[0_0_0_1.5px_rgba(255,255,255,0.06),0_0_0_3px_rgba(16,185,129,0.08),inset_0_0_32px_rgba(0,0,0,0.55)]">
                <CheckCircle2 className="mb-3 size-9 text-emerald-300" />
                <p className="text-sm font-semibold text-emerald-100">
                  All captures completed
                </p>
                <p className="mt-1 text-[0.72rem] leading-snug text-emerald-100/65">
                  Ready for secure validation.
                </p>
              </div>
            ) : (
              <CameraPreview
                videoRef={mergedVideoRef}
                streamActive={streamActive}
                fallbackMessage={permissionBlocked ? statusText : undefined}
                className="aspect-square rounded-full shadow-[0_0_0_1.5px_rgba(255,255,255,0.06),0_0_0_3px_rgba(100, 147, 181,0.08),inset_0_0_32px_rgba(0,0,0,0.55)]"
              />
            )}

            {/* Inner biometric guide ring */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[10%] rounded-full border border-white/[0.08]"
              style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.35)' }}
            />

            {/* Animated scan line — only when camera is live */}
            {streamActive && !permissionBlocked && !showCompletionState && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              >
                <div
                  className="biometric-scan-line absolute left-[10%] right-[10%] h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(100, 147, 181,0.4) 35%, rgba(160,195,215,0.65) 50%, rgba(100, 147, 181,0.4) 65%, transparent 100%)',
                  }}
                />
              </div>
            )}

            {/*
              Biometric progress ring — LAST child so it renders ON TOP of the camera.
              -inset-4 extends 16px beyond camera edges; z-10 ensures it's above everything.
              Segments in CircularProgressGuide at r=150 appear around the camera rim.
            */}
            <div
              className="pointer-events-none absolute -inset-4 z-10"
              aria-hidden="true"
            >
              <CircularProgressGuide
                captureCounts={{
                  front: capturesByAngle.front?.length ?? 0,
                  left: capturesByAngle.left?.length ?? 0,
                  right: capturesByAngle.right?.length ?? 0,
                  up: capturesByAngle.up?.length ?? 0,
                  down: capturesByAngle.down?.length ?? 0,
                  natural_front: 0,
                }}
                requiredCount={currentAngleRequired}
                activeDirection={state.currentAngle}
                poseState={guidePoseState}
              />
            </div>

            {state.debug.enabled ? (
              <div className="fixed inset-x-2 bottom-2 z-50 max-h-[55dvh] overflow-y-auto rounded-md border border-amber-300/40 bg-black/90 px-2.5 py-2 text-left font-mono text-[0.58rem] leading-[1.35] text-amber-100 shadow-xl sm:left-3 sm:right-auto sm:w-[28rem]">
                {[
                  ['Camera', [
                    ['cameraReady', state.debug.cameraReady],
                    ['videoReady', state.debug.videoReady],
                    ['videoWidth', state.debug.videoWidth],
                    ['videoHeight', state.debug.videoHeight],
                    ['frameLoopRunning', state.debug.frameLoopRunning],
                    ['lastFrameAt', state.debug.lastFrameAt],
                  ]],
                  ['Face model', [
                    ['faceModelStatus', state.debug.faceModelStatus],
                    ['faceModelError', state.debug.faceModelError],
                    ['wasmPath', state.debug.wasmPath],
                    ['modelPath', state.debug.modelPath],
                    ['lastDetectionAt', state.debug.lastDetectionAt],
                    ['facesDetectedCount', state.debug.facesDetectedCount],
                    ['rawDetectionConfidence', state.debug.rawDetectionConfidence],
                  ]],
                  ['Validation', [
                    ['visibilityValid', state.debug.visibilityValid],
                    ['eyesValid', state.debug.eyesValid],
                    ['framingValid', state.debug.framingValid],
                    ['lightingValid', state.debug.lightingValid],
                    ['brightnessValue', state.debug.brightnessValue],
                    ['minAllowedBrightness', state.debug.minAllowedBrightness],
                    ['blurValid', state.debug.blurValid],
                    ['livenessCompleted', state.liveness.completed],
                    ['movementValid', state.debug.movementValid],
                    ['angleState', state.debug.angleState],
                    ['blockerReason', state.debug.blockerReason],
                    ['canCapture', state.debug.canCapture],
                  ]],
                  ['Geometry', [
                    ['faceBoxX', state.debug.faceBoxX],
                    ['faceBoxY', state.debug.faceBoxY],
                    ['faceBoxWidth', state.debug.faceBoxWidth],
                    ['faceBoxHeight', state.debug.faceBoxHeight],
                    ['faceCenterOffsetX', state.debug.faceCenterOffsetX],
                    ['faceCenterOffsetY', state.debug.faceCenterOffsetY],
                    ['faceSizeRatio', state.debug.faceSizeRatio],
                    ['maxAllowedCenterOffset', state.debug.maxAllowedCenterOffset],
                    ['minAllowedFaceSizeRatio', state.debug.minAllowedFaceSizeRatio],
                  ]],
                  ['Pose', [
                    ['yaw', state.debug.yaw],
                    ['pitch', state.debug.pitch],
                    ['roll', state.debug.roll],
                    ['baselineYaw', state.debug.baselineYaw],
                    ['baselinePitch', state.debug.baselinePitch],
                  ]],
                  ['Capture', [
                    ['capturePhase', !state.liveness.completed ? 'liveness' : state.canSubmit ? 'completion' : 'capture'],
                    ['submitPhase', submitPhase],
                    ['currentLivenessChallenge', state.liveness.currentChallenge],
                    ['currentCaptureAngle', state.currentAngle],
                    ['currentAngle', state.debug.currentAngle],
                    ['currentAngleAccepted', state.debug.currentAngleAccepted],
                    ['requiredSamplesPerAngle', state.debug.requiredSamplesPerAngle],
                    ['stableMs', state.debug.stableMs],
                    ['lastCaptureError', state.debug.lastCaptureError],
                  ]],
                  ['Submission', [
                    ['submitting', submitPhase === 'submitting' || isSubmittingCompletion],
                    ['requestUrl', submitDiagnostics.requestUrl || null],
                    ['httpStatus', submitDiagnostics.httpStatus],
                    ['responseBody', submitDiagnostics.responseBody],
                    ['error', submitDiagnostics.error],
                    ['imageCount', submitDiagnostics.imageCount],
                    ['countByAngle', submitDiagnostics.countByAngle || null],
                    ['imageBlobSizes', submitDiagnostics.imageBlobSizes || null],
                    ['studentId', studentId || null],
                    ['currentRoute', submitDiagnostics.currentRoute || null],
                    ['navigationTriggered', submitDiagnostics.navigationTriggered],
                  ]],
                ].map(([section, fields]) => (
                  <div key={section as string} className="mb-1.5 last:mb-0">
                    <div className="font-bold text-amber-300">{section as string}</div>
                    {(fields as Array<[string, string | number | boolean | null]>).map(([label, value]) => (
                      <div key={label} className="break-all">{label}: {debugValue(value)}</div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

          </div>

          {showCompletionState ? (
            <div className="space-y-3 px-1 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/5 px-2.5 py-2 text-[0.72rem] text-emerald-100">
                  <span className="font-semibold">Liveness</span>: passed
                </div>
                {captureSummaryRows.map((row) => (
                  <div
                    key={row.angle}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-[0.72rem] text-slate-300"
                  >
                    <span className="font-semibold text-slate-100">
                      {row.label}
                    </span>
                    : {row.count}/{row.required}
                  </div>
                ))}
              </div>

              {(completionErrorMessage || localErrorMessage) ? (
                <p className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-center text-[0.75rem] text-rose-100">
                  {completionErrorMessage ?? localErrorMessage}
                </p>
              ) : null}

              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmittingCompletion || submitPhase === 'submitting'}
                  size="cta"
                  className="w-full"
                >
                  {isSubmittingCompletion || submitPhase === 'submitting' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting enrollment...
                    </>
                  ) : (
                    submitPhase === 'error' ? 'Retry Submit' : 'Submit Enrollment'
                  )}
                </Button>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={restartCapture}
                    disabled={isSubmittingCompletion || submitPhase === 'submitting'}
                    className="text-slate-300 hover:bg-white/5"
                  >
                    <RotateCcw className="size-3.5" />
                    Restart Capture
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {!showCompletionState && state.liveness.completed ? (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-center">
              <p className="text-[0.78rem] font-semibold text-slate-100">
                {angleSummaryLabel[state.currentAngle]} {currentAngleAccepted}/
                {currentAngleRequired}
              </p>
              <p className="mt-0.5 text-[0.68rem] text-slate-400">
                Two images are captured for better recognition accuracy.
              </p>
            </div>
          ) : null}

          {/* STATUS MESSAGE */}
          <div className="min-h-[2.2rem] px-1 text-center" aria-hidden="true">
            <p
              className="text-[0.85rem] leading-[1.5] font-medium transition-colors duration-300"
              style={{ color: state.feedback.guidanceState === 'hold_steady' ? 'rgba(100, 147, 181, 0.9)' : 'rgba(148,163,184,0.9)' }}
            >
              {showCompletionState ? 'All enrollment captures are complete.' : statusText}
            </p>
          </div>
          
          {/* SCREEN READER DEBOUNCED STATUS */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {debouncedStatusText}
          </div>

          {/* LIVE HEALTH INDICATORS */}
          {streamActive && !permissionBlocked && !state.canSubmit && (
            <div className="flex justify-center flex-wrap gap-2 mt-2 px-2">
              <HealthBadge label="Visibility" active={state.feedback.readiness.faceDetected && state.feedback.readiness.singleFace} />
              <HealthBadge label="Eyes" active={state.feedback.readiness.eyesVisible} />
              <HealthBadge label="Framing" active={state.feedback.readiness.faceLargeEnough && state.feedback.readiness.centered} />
              <HealthBadge label="Lighting" active={state.feedback.readiness.brightnessOk} />
              <HealthBadge label="Liveness" active={state.feedback.readiness.livenessPassed} />
              <HealthBadge
                label={state.liveness.completed ? 'Angle' : 'Movement'}
                active={state.feedback.readiness.angleMatch}
              />
            </div>
          )}

          {/* CAMERA PERMISSION BUTTON */}
          {permissionBlocked ? (
            <Button
              type="button"
              onClick={() => {
                resetPermission();
                void requestAccess();
              }}
              size="cta"
              disabled={permissionState === 'requesting'}
              className="w-full"
            >
              <Camera className="size-4" />
              {permissionButtonLabel}
            </Button>
          ) : null}
          {!permissionBlocked && !streamActive && !showCompletionState ? (
            <Button
              type="button"
              onClick={() => {
                resetPermission();
                void requestAccess();
              }}
              size="cta"
              className="w-full"
            >
              <Camera className="size-4" />
              Resume Camera
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Submit button row ────────────────────────────────────── */}
      {!showCompletionState ? (
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-white/[0.06] bg-[#0b1422]/80 px-4 py-3">
        {completionErrorMessage || localErrorMessage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => retakeAngle(state.currentAngle)}
            disabled={isSubmittingCompletion}
            className="text-slate-300 hover:bg-white/5"
          >
            <RotateCcw className="size-3.5" />
            Retake current angle
          </Button>
        ) : null}
        {(completionErrorMessage || localErrorMessage || showCompletionState) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={restartCapture}
            disabled={isSubmittingCompletion}
            className="text-slate-300 hover:bg-white/5"
          >
            <RotateCcw className="size-3.5" />
            Restart capture
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            permissionBlocked ||
            !state.modelReady ||
            !state.canSubmit ||
            isSubmittingCompletion
          }
          size="cta"
          className="min-w-[9.5rem]"
        >
          {isSubmittingCompletion ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Complete Enrollment'
          )}
        </Button>
      </div>
      ) : null}
    </section>
  );
}
