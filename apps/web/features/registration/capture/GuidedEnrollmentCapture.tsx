'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  captureAngles,
  guidedAngles,
  getRequiredFramesForAngle,
} from '@/features/registration/capture/constants';
import { CameraPreview } from '@/features/registration/capture/CameraPreview';
import { useFaceCapture } from '@/features/registration/capture/useFaceCapture';
import { CircularProgressGuide } from '@/features/registration/verification/CircularProgressGuide';
import { useCamera } from '@/features/registration/verification/useCamera';
import { totalRequiredShots } from '@/features/registration/verification/constants';
import type {
  VerificationAngle,
  VerificationCompletionSummary,
} from '@/features/registration/verification/types';
import { cn } from '@/lib/utils';

type GuidedEnrollmentCaptureProps = {
  studentId: string;
  onComplete: (summary: VerificationCompletionSummary) => void | Promise<void>;
  isSubmittingCompletion?: boolean;
  completionErrorMessage?: string | null;
};

function getStorageKey(studentId: string) {
  const normalized = studentId.trim().toLowerCase();
  return `diu-lens-capture:${normalized || 'unknown'}`;
}

function getAngleLabel(angle: VerificationAngle | string) {
  if (angle === 'natural_front') return 'Natural Front';
  return angle.charAt(0).toUpperCase() + angle.slice(1);
}

function getLivenessChallengeLabel(challenge: string | null) {
  if (challenge === 'left') return 'Turn Your Head Left';
  if (challenge === 'right') return 'Turn Your Head Right';
  if (challenge === 'center') return 'Look Back At The Camera';
  if (challenge === 'blink') return 'Blink Once';
  return 'Liveness';
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


export function GuidedEnrollmentCapture({
  studentId,
  onComplete,
  isSubmittingCompletion = false,
  completionErrorMessage,
}: GuidedEnrollmentCaptureProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null
  );
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

  const { state, capturesByAngle, frameMetadataByAngle, clearSession } =
    useFaceCapture({
      videoElement,
      streamActive,
      captureSnapshot,
      storageKey: getStorageKey(studentId),
    });

  /**
   * Map each directional angle to a boolean: true when enough frames have
   * been captured for that angle. Used by CircularProgressGuide to light
   * the correct arc independently (not sequentially).
   */
  const completedDirections = useMemo(() => {
    const dirs = ['up', 'left', 'right', 'down'] as const;
    return Object.fromEntries(
      dirs.map((dir) => [
        dir,
        (capturesByAngle[dir] ?? []).length >=
          getRequiredFramesForAngle(dir),
      ])
    );
  }, [capturesByAngle]);

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
    if (isSubmittingCompletion || !state.canSubmit) {
      return;
    }

    setLocalErrorMessage(null);
    console.log('[verification] final submit triggered', {
      studentId,
      capturedCount: state.capturedCount,
    });
    const invalidGuidedAngle = guidedAngles.find((angle) => {
      const captures = capturesByAngle[angle] ?? [];
      if (captures.length < getRequiredFramesForAngle(angle)) {
        return true;
      }
      return captures.some((capture) => capture.size <= 0);
    });
    if (invalidGuidedAngle) {
      console.warn('[verification] invalid guided captures', {
        studentId,
        angle: invalidGuidedAngle,
      });
      setLocalErrorMessage(
        'One or more guided shots are missing or empty. Please retake the affected angle.'
      );
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

      await onComplete(summary);
      clearSession();
    } catch {
      console.error('[verification] final submit failed at capture step');
      setLocalErrorMessage('Unable to submit verification. Please try again.');
    }
  }, [
    capturesByAngle,
    clearSession,
    frameMetadataByAngle,
    isSubmittingCompletion,
    onComplete,
    state.canSubmit,
    state.capturedCount,
    state.liveness.completed,
    studentId,
  ]);

  /**
   * Auto-submit guard — fires exactly once when all captures are complete.
   * The ref prevents duplicate submissions on re-renders or StrictMode double-invoke.
   * setTimeout(0) defers the call past the current render cycle so React does not
   * flag synchronous setState calls inside the effect body.
   */
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!state.canSubmit || isSubmittingCompletion || autoSubmittedRef.current) {
      return;
    }
    autoSubmittedRef.current = true;
    console.log('[auto-submit] all captures complete — scheduling auto-submit', {
      capturedCount: state.capturedCount,
      currentAngle: state.currentAngle,
    });
    const timerId = window.setTimeout(() => {
      console.log('[auto-submit] executing handleSubmit');
      void handleSubmit();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [state.canSubmit, isSubmittingCompletion, handleSubmit, state.capturedCount, state.currentAngle]);

  const permissionBlocked = permissionState !== 'granted';

  const statusText = useMemo(() => {
    if (isSubmittingCompletion) {
      return 'Uploading verification images...';
    }

    if (state.canSubmit) {
      // Captures are done; auto-submit is about to fire (or already fired).
      // Don't show any stale capture message from the detection loop.
      return completionErrorMessage ?? 'All captures complete. Submitting...';
    }

    if (completionErrorMessage) {
      return completionErrorMessage;
    }

    if (localErrorMessage) {
      return localErrorMessage;
    }

    if (state.modelErrorMessage) {
      return state.modelErrorMessage;
    }

    if (permissionBlocked) {
      return (
        errorMessage ??
        'Camera access is required for guided enrollment. Allow camera permission to continue.'
      );
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
                {state.liveness.completed ? 'Face Verification' : 'Liveness Check'}
              </p>
              <h3 className="landing-text-primary text-[1.08rem] font-semibold tracking-tight sm:text-[1.15rem]">
                {state.liveness.completed
                  ? getAngleLabel(state.currentAngle)
                  : getLivenessChallengeLabel(state.liveness.currentChallenge)}
              </h3>
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
                return (
                  <span
                    key={angle}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      isDone
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

            {/* Circular camera feed — flow element, sets container height */}
            <CameraPreview
              videoRef={mergedVideoRef}
              streamActive={streamActive}
              fallbackMessage={permissionBlocked ? statusText : undefined}
              className="aspect-square rounded-full shadow-[0_0_0_1.5px_rgba(255,255,255,0.06),0_0_0_3px_rgba(100, 147, 181,0.08),inset_0_0_32px_rgba(0,0,0,0.55)]"
            />

            {/* Inner biometric guide ring */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[10%] rounded-full border border-white/[0.08]"
              style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.35)' }}
            />

            {/* Animated scan line — only when camera is live */}
            {streamActive && !permissionBlocked && (
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
                completedDirections={completedDirections}
                activeDirection={state.currentAngle}
              />
            </div>

            {state.debug.enabled ? (
              <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-md border border-amber-300/30 bg-black/70 px-2 py-1.5 text-left font-mono text-[0.58rem] leading-snug text-amber-100 shadow-lg">
                <div>yaw: {state.debug.yaw?.toFixed(1) ?? 'n/a'}</div>
                <div>pitch: {state.debug.pitch?.toFixed(1) ?? 'n/a'}</div>
                <div>roll: {state.debug.roll?.toFixed(1) ?? 'n/a'}</div>
                <div>base yaw: {state.debug.baselineYaw?.toFixed(1) ?? 'n/a'}</div>
                <div>yaw delta: {state.debug.yawDelta?.toFixed(1) ?? 'n/a'}</div>
                <div>angle: {state.debug.expectedAngle}</div>
                <div>pose: {state.debug.angleState}</div>
                <div>dir: {state.debug.livenessExpectedDirection}</div>
                <div>
                  live: {state.debug.livenessChallenge ?? 'done'}{' '}
                  {state.debug.livenessCompletedCount}/
                  {state.debug.livenessRequiredPassCount}
                </div>
                <div>live block: {state.debug.livenessBlockerReason}</div>
                <div>
                  stable: {state.debug.stableForMs}/
                  {state.debug.stableRequiredMs}ms
                </div>
                <div>block: {state.debug.blockedReason}</div>
              </div>
            ) : null}

          </div>

          {/* STATUS MESSAGE */}
          <div className="min-h-[2.2rem] px-1 text-center" aria-hidden="true">
            <p
              className="text-[0.85rem] leading-[1.5] font-medium transition-colors duration-300"
              style={{ color: state.feedback.guidanceState === 'hold_steady' ? 'rgba(100, 147, 181, 0.9)' : 'rgba(148,163,184,0.9)' }}
            >
              {statusText}
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
        </div>
      </div>

      {/* ── Submit button row ────────────────────────────────────── */}
      <div className="flex items-center justify-end rounded-xl border border-white/[0.06] bg-[#0b1422]/80 px-4 py-3">
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
              Uploading...
            </>
          ) : (
            'Complete Enrollment'
          )}
        </Button>
      </div>
    </section>
  );
}
