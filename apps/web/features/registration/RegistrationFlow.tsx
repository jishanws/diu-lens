'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { registrationStepMeta } from '@/features/registration/constants';
import {
  GENERIC_ENROLLMENT_ERROR,
  GENERIC_REGISTRATION_COMPLETION_ERROR,
  submitEnrollment,
  submitEnrollmentCompletion,
  validateStudentId,
  normalizeStudentId,
  fetchValidationConfig,
  createVerificationCredentials,
  fetchEnrollmentVerificationStatus,
  type EnrollmentVerificationStatus,
  type VerificationCredentials,
} from '@/features/registration/api';
import { RegistrationShell } from '@/features/registration/RegistrationShell';
import { AlreadyRegisteredPanel } from '@/features/registration/steps/AlreadyRegisteredPanel';
import { BasicInfoStep } from '@/features/registration/steps/BasicInfoStep';
import { StudentIdStep } from '@/features/registration/steps/StudentIdStep';
import { SuccessStep } from '@/features/registration/steps/SuccessStep';
import { VerificationProgressStep } from '@/features/registration/steps/VerificationProgressStep';
import { VerificationFlow } from '@/features/registration/verification/VerificationFlow';
import type {
  EnrollmentCompletionResult,
  VerificationCompletionSummary,
} from '@/features/registration/verification/types';
import { formatFailedCaptures } from '@/features/registration/verification/failedCaptures';
import type { FailedCapture } from '@/features/registration/verification/failedCaptures';
import type {
  RegistrationFlowProps,
  RegistrationFormValues,
  StudentIdValidationState,
} from '@/features/registration/types';
import { cn } from '@/lib/utils';

const transition = {
  duration: 0.24,
  ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number],
};

function toFriendlyVerificationMessage(message: string | null | undefined) {
  if (!message) {
    return GENERIC_REGISTRATION_COMPLETION_ERROR;
  }

  const normalized = message.toLowerCase();
  if (
    normalized === 'load failed' ||
    normalized === 'failed to fetch' ||
    normalized.includes('network request failed')
  ) {
    return 'Unable to reach the enrollment service. Your captures are preserved; retry submission.';
  }
  if (normalized.includes('missing_image_data')) {
    return 'One or more captured files are missing. Please retake the affected angle.';
  }
  if (normalized.includes('invalid_image_data')) {
    return 'One or more captured files are unreadable. Please retake the affected angle.';
  }
  if (normalized.includes('image_too_small')) {
    return 'One or more captured files are too small to process. Please retake the affected angle.';
  }
  if (normalized.includes('image sanity validation failed')) {
    return message;
  }
  if (normalized.includes('image sanity checks failed')) {
    return message;
  }
  if (normalized.includes('image integrity validation failed')) {
    return message;
  }
  if (normalized.includes('image integrity checks failed')) {
    return message;
  }
  if (normalized.includes('enrollment images failed validation')) {
    return 'Some captures failed backend validation. Please retake the failed angle.';
  }
  if (normalized.includes('face processing service is temporarily unavailable')) {
    return 'Face processing is temporarily unavailable. Your captures are preserved; try again later.';
  }
  if (normalized.includes('image storage is temporarily unavailable')) {
    return 'Enrollment storage is temporarily unavailable. Your captures are preserved; retry submission.';
  }
  if (normalized.includes('database is temporarily unavailable')) {
    return 'Enrollment service is temporarily unavailable. Your captures are preserved; retry submission.';
  }

  return message;
}

const initialValues: RegistrationFormValues = {
  studentId: '',
  fullName: '',
  phoneNumber: '',
  universityEmail: '',
};

const verificationStorageKey = 'diu-lens:active-verification';

type PersistedVerification = VerificationCredentials & {
  studentId: string;
  fullName: string;
  verificationJob?: EnrollmentVerificationStatus;
};

export function RegistrationFlow({
  className,
  onStepIndexChange,
  onDone,
}: RegistrationFlowProps) {
  useEffect(() => {
    fetchValidationConfig();
  }, []);

  const [values, setValues] = useState<RegistrationFormValues>(initialValues);
  const [activeStep, setActiveStep] = useState(0);
  const [validationState, setValidationState] = useState<StudentIdValidationState>(
    { status: 'idle' }
  );
  const [isSubmittingBasicInfo, setIsSubmittingBasicInfo] = useState(false);
  const [basicInfoError, setBasicInfoError] = useState<string | null>(null);
  const [isCompletingRegistration, setIsCompletingRegistration] =
    useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [alreadyRegisteredName, setAlreadyRegisteredName] = useState<string | undefined>();
  const [verificationJob, setVerificationJob] = useState<EnrollmentVerificationStatus | null>(null);
  const [verificationNetworkMessage, setVerificationNetworkMessage] = useState<string | null>(null);
  const [retakeFailures, setRetakeFailures] = useState<FailedCapture[]>([]);
  const [exitAfterAcceptedSubmission, setExitAfterAcceptedSubmission] = useState(false);
  const verificationCredentialsRef = useRef<VerificationCredentials | null>(null);
  // Tracks the student ID that was successfully validated so that Step 2
  // cannot open for a different (or no) validated ID.
  const validatedStudentIdRef = useRef<string | null>(null);
  const toErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) {
      const normalized = error.message.trim().toLowerCase();
      if (
        normalized === 'load failed' ||
        normalized === 'failed to fetch' ||
        normalized.includes('network request failed')
      ) {
        return fallback;
      }
      return error.message;
    }

    return fallback;
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(verificationStorageKey);
    if (!raw) return;
    try {
      const persisted = JSON.parse(raw) as PersistedVerification;
      if (!persisted.studentId || !persisted.ownerToken || !persisted.idempotencyKey) return;
      verificationCredentialsRef.current = {
        ownerToken: persisted.ownerToken,
        idempotencyKey: persisted.idempotencyKey,
      };
      setValues((current) => ({
        ...current,
        studentId: persisted.studentId,
        fullName: persisted.fullName || current.fullName,
      }));
      if (persisted.verificationJob) {
        setVerificationJob(persisted.verificationJob);
        setActiveStep(3);
      }
    } catch {
      window.localStorage.removeItem(verificationStorageKey);
    }
  }, []);

  useEffect(() => {
    const statusEndpoint = verificationJob?.status_endpoint;
    if (!statusEndpoint || activeStep !== 3 || !verificationCredentialsRef.current) return;
    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      try {
        const next = await fetchEnrollmentVerificationStatus(
          statusEndpoint,
          verificationCredentialsRef.current!.ownerToken
        );
        if (cancelled) return;
        setVerificationNetworkMessage(null);
        setVerificationJob(next);
        const persisted: PersistedVerification = {
          ...verificationCredentialsRef.current!,
          studentId: values.studentId,
          fullName: values.fullName,
          verificationJob: next,
        };
        window.localStorage.setItem(verificationStorageKey, JSON.stringify(persisted));
        if (next.status === 'succeeded') {
          window.localStorage.removeItem(verificationStorageKey);
          window.localStorage.removeItem(`diu-lens-capture:${values.studentId.trim().toLowerCase()}`);
          setActiveStep(4);
          return;
        }
        if (next.status === 'failed') {
          return;
        }
        if (next.status === 'retake_required') {
          return;
        }
      } catch {
        if (!cancelled) setVerificationNetworkMessage('Connection interrupted. Verification continues in the background and will resume here automatically.');
      }
      if (!cancelled) timer = window.setTimeout(poll, 1500);
    };
    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeStep, values.fullName, values.studentId, verificationJob?.status_endpoint]);

  const handleDone = useCallback(() => {
    if (onDone) {
      onDone();
      return;
    }

    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.assign('/');
      return;
    }

    setValues(initialValues);
    setValidationState({ status: 'idle' });
    setAlreadyRegistered(false);
    setAlreadyRegisteredName(undefined);
    validatedStudentIdRef.current = null;
    setBasicInfoError(null);
    setVerificationError(null);
    setIsSubmittingBasicInfo(false);
    setIsCompletingRegistration(false);
    setVerificationJob(null);
    setRetakeFailures([]);
    verificationCredentialsRef.current = null;
    window.localStorage.removeItem(verificationStorageKey);
    setActiveStep(0);
  }, [onDone]);

  useEffect(() => {
    if (!exitAfterAcceptedSubmission || activeStep !== 3 || !verificationJob) return;

    const timer = window.setTimeout(() => {
      if (onDone) {
        onDone();
        return;
      }
      window.location.assign('/');
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [activeStep, exitAfterAcceptedSubmission, onDone, verificationJob]);

  /**
   * Step 1 — Validate student ID before advancing.
   * Prevents users from wasting time on Basic Info if the ID is invalid.
   */
  // Reset validation state when student ID changes.
  const handleStudentIdChange = useCallback(
    (value: string) => {
      setValues((prev) => ({ ...prev, studentId: value }));
      // If the user edits the ID, clear previous validation result.
      if (validationState.status !== 'idle' && validationState.status !== 'validating') {
        setValidationState({ status: 'idle' });
        validatedStudentIdRef.current = null;
      }
    },
    [validationState.status]
  );

  const handleStudentIdContinue = useCallback(async () => {
    const rawId = normalizeStudentId(values.studentId);
    if (!rawId) return;

    // Already validated this exact ID — skip the round-trip.
    if (
      validationState.status === 'valid' &&
      validatedStudentIdRef.current === rawId
    ) {
      setActiveStep(1);
      return;
    }

    setValidationState({ status: 'validating' });

    const result = await validateStudentId(rawId);

    if (result.valid) {
      validatedStudentIdRef.current = rawId;
      setValidationState({ status: 'valid' });
      // Brief delay so the user sees the green check before the step animates.
      window.setTimeout(() => setActiveStep(1), 220);
    } else if (result.reason === 'already_registered') {
      // Don't treat this as an error — show the premium already-enrolled state.
      setValidationState({ status: 'idle' });
      setAlreadyRegistered(true);
      setAlreadyRegisteredName(result.studentName);
    } else {
      validatedStudentIdRef.current = null;
      setValidationState({ status: 'invalid', reason: result.message });
    }
  }, [validationState.status, values.studentId]);

  const handleBasicInfoContinue = useCallback(async () => {

    // Bypass guard: Step 2 must not open unless the current student ID
    // was explicitly validated in this session.
    if (
      validationState.status !== 'valid' ||
      validatedStudentIdRef.current !== values.studentId.trim()
    ) {
      setActiveStep(0);
      return;
    }

    if (isSubmittingBasicInfo) {
      return;
    }

    const fullName = values.fullName.trim();
    const phoneNumber = values.phoneNumber.trim();
    const universityEmail = values.universityEmail.trim();

    if (!fullName || !phoneNumber || !universityEmail) {
      setBasicInfoError(GENERIC_ENROLLMENT_ERROR);
      return;
    }

    setBasicInfoError(null);
    setIsSubmittingBasicInfo(true);

    try {
      const result = await submitEnrollment({
        student_id: values.studentId,
        full_name: fullName,
        phone: phoneNumber,
        university_email: universityEmail,
      });

      if (!result.success) {
        setBasicInfoError(result.message || GENERIC_ENROLLMENT_ERROR);
        return;
      }

      setVerificationError(null);
      setActiveStep(2);
    } catch (error) {
      setBasicInfoError(toErrorMessage(error, GENERIC_ENROLLMENT_ERROR));
    } finally {
      setIsSubmittingBasicInfo(false);
    }
  }, [
    isSubmittingBasicInfo,
    toErrorMessage,
    validationState.status,
    values.fullName,
    values.phoneNumber,
    values.studentId,
    values.universityEmail,
  ]);

  const handleVerificationComplete = useCallback(
    async (
      summary: VerificationCompletionSummary
    ): Promise<EnrollmentCompletionResult> => {
      if (isCompletingRegistration) {
        return {
          success: false,
          message: 'Enrollment submission is already in progress.',
          diagnostics: {
            requestUrl: '',
            httpStatus: null,
            responseBody: null,
            error: 'duplicate_submission',
          },
        };
      }

      setVerificationError(null);
      setIsCompletingRegistration(true);

      try {
        const credentials = verificationCredentialsRef.current ?? createVerificationCredentials();
        verificationCredentialsRef.current = credentials;
        window.localStorage.setItem(verificationStorageKey, JSON.stringify({
          ...credentials,
          studentId: values.studentId,
          fullName: values.fullName.trim(),
        } satisfies PersistedVerification));
        const result = await submitEnrollmentCompletion(
          {
            student_id: values.studentId,
            full_name: values.fullName.trim(),
            phone: values.phoneNumber.trim(),
            university_email: values.universityEmail.trim(),
            liveness_passed: summary.livenessPassed === true,
            verification_completed: summary.verificationCompleted,
            total_required_shots: summary.totalRequiredShots,
            total_accepted_shots: summary.totalAcceptedShots,
            angles: summary.angles.map((entry) => ({
              angle: entry.angle,
              accepted_shots: entry.acceptedShots,
              required_shots: entry.requiredShots,
            })),
          },
          summary.capturesByAngle,
          summary.frameMetadataByAngle,
          credentials
        );

        if (!result.success) {
          const message = result.failedCaptures?.length
            ? formatFailedCaptures(result.failedCaptures)
            : toFriendlyVerificationMessage(result.message);
          setVerificationError(message);
          return {
            success: false,
            message,
            failedCaptures: result.failedCaptures,
            diagnostics: result.diagnostics ?? {
              requestUrl: '',
              httpStatus: null,
              responseBody: null,
              error: result.message,
            },
          };
        }

        if (!result.verificationJob) {
          verificationCredentialsRef.current = null;
          window.localStorage.removeItem(verificationStorageKey);
          return {
            success: true,
            registrationComplete: true,
            message: result.message,
            diagnostics: result.diagnostics ?? {
              requestUrl: '',
              httpStatus: 200,
              responseBody: null,
              error: null,
            },
          };
        }
        setVerificationJob(result.verificationJob);
        window.localStorage.setItem(verificationStorageKey, JSON.stringify({
          ...credentials,
          studentId: values.studentId,
          fullName: values.fullName.trim(),
          verificationJob: result.verificationJob,
        } satisfies PersistedVerification));
        setActiveStep(3);
        setExitAfterAcceptedSubmission(true);
        return {
          success: true,
          accepted: true,
          message: 'Verification upload accepted.',
          diagnostics: result.diagnostics ?? {
            requestUrl: '',
            httpStatus: null,
            responseBody: null,
            error: null,
          },
        };
      } catch (error) {
        const message = toFriendlyVerificationMessage(
          toErrorMessage(error, GENERIC_REGISTRATION_COMPLETION_ERROR)
        );
        setVerificationError(message);
        return {
          success: false,
          message,
          diagnostics: {
            requestUrl: '',
            httpStatus: null,
            responseBody: null,
            error: error instanceof Error ? error.message : String(error),
          },
        };
      } finally {
        setIsCompletingRegistration(false);
      }
    },
    [
      isCompletingRegistration,
      toErrorMessage,
      values.fullName,
      values.phoneNumber,
      values.studentId,
      values.universityEmail,
    ]
  );

  useEffect(() => {
    onStepIndexChange?.(activeStep);
  }, [activeStep, onStepIndexChange]);

  const renderedStep = useMemo(() => {
    // Already-registered short-circuit: bypass all enrollment steps.
    if (alreadyRegistered) {
      return (
        <AlreadyRegisteredPanel
          studentId={values.studentId || undefined}
          studentName={alreadyRegisteredName}
          onDone={handleDone}
        />
      );
    }

    if (activeStep === 0) {
      return (
        <StudentIdStep
          studentId={values.studentId}
          onStudentIdChange={handleStudentIdChange}
          onContinue={() => { void handleStudentIdContinue(); }}
          validationState={validationState}
        />
      );
    }

    if (activeStep === 1) {
      return (
        <BasicInfoStep
          values={values}
          onFieldChange={(field, value) => {
            setBasicInfoError(null);
            setValues((current) => ({ ...current, [field]: value }));
          }}
          onBack={() => {
            setBasicInfoError(null);
            setActiveStep(0);
          }}
          onContinue={handleBasicInfoContinue}
          isSubmitting={isSubmittingBasicInfo}
          errorMessage={basicInfoError}
        />
      );
    }

    if (activeStep === 2) {
      return (
        <VerificationFlow
          studentId={values.studentId}
          onComplete={handleVerificationComplete}
          isSubmittingCompletion={isCompletingRegistration}
          completionErrorMessage={verificationError}
          initialFailedCaptures={retakeFailures}
        />
      );
    }

    if (activeStep === 3 && verificationJob) {
      return <VerificationProgressStep
        job={verificationJob}
        networkMessage={verificationNetworkMessage}
        onRetake={() => {
          setRetakeFailures(verificationJob.failed_angles);
          setVerificationError(formatFailedCaptures(verificationJob.failed_angles));
          setVerificationJob(null);
          verificationCredentialsRef.current = null;
          window.localStorage.removeItem(verificationStorageKey);
          setActiveStep(2);
        }}
        onRetry={() => {
          setVerificationError(verificationJob.error?.message ?? null);
          setVerificationJob(null);
          verificationCredentialsRef.current = null;
          window.localStorage.removeItem(verificationStorageKey);
          setActiveStep(2);
        }}
      />;
    }

    return (
      <SuccessStep
        studentId={values.studentId}
        studentName={values.fullName}
        onDone={handleDone}
      />
    );
  }, [
    activeStep,
    alreadyRegistered,
    alreadyRegisteredName,
    basicInfoError,
    handleDone,
    handleStudentIdChange,
    handleStudentIdContinue,
    handleVerificationComplete,
    handleBasicInfoContinue,
    isCompletingRegistration,
    isSubmittingBasicInfo,
    validationState,
    verificationError,
    verificationJob,
    verificationNetworkMessage,
    retakeFailures,
    values,
  ]);

  // When showing AlreadyRegisteredPanel, bypass RegistrationShell entirely.
  const isVerificationStep = activeStep === 2;

  const stepContent = (
    <div className="flex min-h-0 flex-col">
      <div aria-live="polite" className="sr-only">
        {`Step ${activeStep + 1} of ${registrationStepMeta.length}: ${registrationStepMeta[activeStep]?.title || 'Success'}`}
      </div>
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        <motion.div
          key={activeStep}
          className="flex h-full flex-col"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={transition}
        >
          {renderedStep}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (alreadyRegistered) {
    return (
      <section className={cn('w-full', className)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key="already-registered"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transition}
          >
            {renderedStep}
          </motion.div>
        </AnimatePresence>
      </section>
    );
  }

  if (isVerificationStep) {
    return (
      <section
        className={cn(
          'flex h-[min(600px,calc(100dvh-9.75rem))] max-h-[600px] w-full flex-col',
          className
        )}
      >
        {stepContent}
      </section>
    );
  }

  return (
    <RegistrationShell
      className={className}
      activeIndex={activeStep}
      steps={registrationStepMeta}
    >
      {stepContent}
    </RegistrationShell>
  );
}
