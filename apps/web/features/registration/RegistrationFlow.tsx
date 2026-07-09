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
} from '@/features/registration/api';
import { RegistrationShell } from '@/features/registration/RegistrationShell';
import { AlreadyRegisteredPanel } from '@/features/registration/steps/AlreadyRegisteredPanel';
import { BasicInfoStep } from '@/features/registration/steps/BasicInfoStep';
import { StudentIdStep } from '@/features/registration/steps/StudentIdStep';
import { SuccessStep } from '@/features/registration/steps/SuccessStep';
import { VerificationFlow } from '@/features/registration/verification/VerificationFlow';
import type {
  EnrollmentCompletionResult,
  VerificationCompletionSummary,
} from '@/features/registration/verification/types';
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

export function RegistrationFlow({
  className,
  onStepIndexChange,
  onDone,
}: RegistrationFlowProps) {
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
    setActiveStep(0);
  }, [onDone]);

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
          summary.frameMetadataByAngle
        );

        if (!result.success) {
          const message = toFriendlyVerificationMessage(result.message);
          setVerificationError(message);
          return {
            success: false,
            message,
            diagnostics: result.diagnostics ?? {
              requestUrl: '',
              httpStatus: null,
              responseBody: null,
              error: result.message,
            },
          };
        }

        setActiveStep(3);
        return {
          success: true,
          message: 'Enrollment submitted successfully.',
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
        />
      );
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
