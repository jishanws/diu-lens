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
} from '@/features/registration/api';
import { RegistrationShell } from '@/features/registration/RegistrationShell';
import { AlreadyRegisteredPanel } from '@/features/registration/steps/AlreadyRegisteredPanel';
import { BasicInfoStep } from '@/features/registration/steps/BasicInfoStep';
import { StudentIdStep } from '@/features/registration/steps/StudentIdStep';
import { SuccessStep } from '@/features/registration/steps/SuccessStep';
import { VerificationFlow } from '@/features/registration/verification/VerificationFlow';
import type { VerificationCompletionSummary } from '@/features/registration/verification/types';
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

  return message;
}

function formatStudentId(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
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
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<RegistrationFormValues>(initialValues);
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
      return error.message;
    }

    return fallback;
  }, []);

  const handleDone = useCallback(() => {
    if (onDone) {
      onDone();
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
  const handleStudentIdContinue = useCallback(async () => {
    const rawId = values.studentId.trim();
    if (!rawId) return;

    // Already validated this exact ID — skip the round-trip.
    if (
      validationState.status === 'valid' &&
      validatedStudentIdRef.current === rawId
    ) {
      console.log('[validate-id] already valid, advancing', { studentId: rawId });
      setActiveStep(1);
      return;
    }

    setValidationState({ status: 'validating' });
    console.log('[validate-id] starting validation', { studentId: rawId });

    const result = await validateStudentId(rawId);

    if (result.valid) {
      console.log('[validate-id] passed — advancing to basic info');
      validatedStudentIdRef.current = rawId;
      setValidationState({ status: 'valid' });
      // Brief delay so the user sees the green check before the step animates.
      window.setTimeout(() => setActiveStep(1), 220);
    } else if (result.reason === 'already_registered') {
      // Don't treat this as an error — show the premium already-enrolled state.
      console.log('[validate-id] already_registered — showing AlreadyRegisteredPanel', { studentId: rawId, name: result.studentName });
      setValidationState({ status: 'idle' });
      setAlreadyRegistered(true);
      setAlreadyRegisteredName(result.studentName);
    } else {
      console.warn('[validate-id] failed', { reason: result.reason });
      validatedStudentIdRef.current = null;
      setValidationState({ status: 'invalid', reason: result.message });
    }
  }, [validationState.status, values.studentId]);

  const handleBasicInfoContinue = useCallback(async () => {
    console.log('[registration] handleBasicInfoContinue called');

    // Bypass guard: Step 2 must not open unless the current student ID
    // was explicitly validated in this session.
    if (
      validationState.status !== 'valid' ||
      validatedStudentIdRef.current !== values.studentId.trim()
    ) {
      console.warn('[registration] Step 2 blocked: student ID not validated', {
        validationStatus: validationState.status,
        validatedId: validatedStudentIdRef.current,
        currentId: values.studentId,
      });
      setActiveStep(0);
      return;
    }

    if (isSubmittingBasicInfo) {
      console.log('[registration] submission blocked: request already in flight');
      return;
    }

    const fullName = values.fullName.trim();
    const phoneNumber = values.phoneNumber.trim();
    const universityEmail = values.universityEmail.trim();

    if (!fullName || !phoneNumber || !universityEmail) {
      console.log('[registration] submission blocked: missing required basic info fields');
      setBasicInfoError(GENERIC_ENROLLMENT_ERROR);
      return;
    }

    setBasicInfoError(null);
    setIsSubmittingBasicInfo(true);

    try {
      console.log('[registration] calling submitEnrollment');
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
      console.error('[registration] basic info submit failed', error);
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
    async (summary: VerificationCompletionSummary) => {
      const completionStartMs = performance.now();
      const logTiming = (stage: string, details: Record<string, unknown> = {}) => {
        const nowMs = performance.now();
        console.log('[verification-timing]', stage, {
          nowMs: Number(nowMs.toFixed(2)),
          elapsedMs: Number((nowMs - completionStartMs).toFixed(2)),
          ...details,
        });
      };
      if (isCompletingRegistration) {
        logTiming('verification submit ignored due to in-flight completion');
        return;
      }

      setVerificationError(null);
      setIsCompletingRegistration(true);
      logTiming('verification completion submit started', {
        student_id: values.studentId,
      });
      console.log('[verification] completion submit start', {
        student_id: values.studentId,
      });

      try {
        const result = await submitEnrollmentCompletion(
          {
            student_id: values.studentId,
            full_name: values.fullName.trim(),
            phone: values.phoneNumber.trim(),
            university_email: values.universityEmail.trim(),
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
          console.warn('[verification] completion submit rejected', result);
          setVerificationError(toFriendlyVerificationMessage(result.message));
          return;
        }

        console.log('[verification] completion submit succeeded', result);
        setActiveStep(3);
        logTiming('ui completion state updated', { activeStep: 3 });
      } catch (error) {
        console.error('[verification] completion submit failed', error);
        setVerificationError(
          toErrorMessage(error, GENERIC_REGISTRATION_COMPLETION_ERROR)
        );
        logTiming('verification completion failed');
      } finally {
        setIsCompletingRegistration(false);
        logTiming('verification completion finalize');
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
          onStudentIdChange={(value) => {
            // Reset validation state whenever the user edits the ID.
            setValidationState({ status: 'idle' });
            validatedStudentIdRef.current = null;
            setValues((current) => ({
              ...current,
              studentId: formatStudentId(value),
            }));
          }}
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

    return <SuccessStep onDone={handleDone} />;
  }, [
    activeStep,
    alreadyRegistered,
    alreadyRegisteredName,
    basicInfoError,
    handleDone,
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
