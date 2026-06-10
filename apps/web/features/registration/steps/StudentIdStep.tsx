'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo } from 'react';
import { ArrowRight, CheckCircle2, Loader2, XCircle, WifiOff, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StudentIdValidationState } from '@/features/registration/types';
import { normalizeStudentId, checkStudentIdFormat } from '@/features/registration/api';
import { cn } from '@/lib/utils';

type StudentIdStepProps = {
  studentId: string;
  onStudentIdChange: (value: string) => void;
  /** Called when the user clicks Continue — parent handles the async validation. */
  onContinue: () => void;
  validationState: StudentIdValidationState;
};

/**
 * Sanitize raw input: allow only digits, hyphens, and spaces (spaces are
 * trimmed later). This prevents accidental letters/symbols from reaching the
 * validation layer.
 */
function sanitizeStudentIdInput(raw: string): string {
  return raw.replace(/[^\d\s-]/g, '');
}

export function StudentIdStep({
  studentId,
  onStudentIdChange,
  onContinue,
  validationState,
}: StudentIdStepProps) {
  const isValidating = validationState.status === 'validating';
  const isValid = validationState.status === 'valid';
  const isInvalid = validationState.status === 'invalid';
  const errorMessage = isInvalid ? validationState.reason : null;

  // Determine whether the current input is even submittable.
  const normalized = useMemo(() => normalizeStudentId(studentId), [studentId]);
  const clientFormatError = useMemo(
    () => (normalized ? checkStudentIdFormat(normalized) : null),
    [normalized]
  );
  const canSubmit = Boolean(normalized) && !clientFormatError && !isValidating;

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onStudentIdChange(sanitizeStudentIdInput(event.target.value));
    },
    [onStudentIdChange]
  );

  const handleFormSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (canSubmit) onContinue();
    },
    [canSubmit, onContinue]
  );

  // Pick error icon based on the error reason category.
  const ErrorIcon = useMemo(() => {
    if (!isInvalid) return XCircle;
    const reason = validationState.reason ?? '';
    if (reason.toLowerCase().includes('connect') || reason.toLowerCase().includes('internet')) {
      return WifiOff;
    }
    if (reason.toLowerCase().includes('unavailable') || reason.toLowerCase().includes('wrong')) {
      return AlertTriangle;
    }
    return XCircle;
  }, [isInvalid, validationState]);

  const inputRingClass = isInvalid
    ? 'ring-2 ring-red-500/60 focus-visible:ring-red-500/60'
    : isValid
      ? 'ring-2 ring-[#6493b5]/60 focus-visible:ring-[#6493b5]/60'
      : '';

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <header className="space-y-2">
        <h3 className="landing-text-primary text-[1.22rem] leading-[1.15] font-semibold tracking-[-0.012em] sm:text-[1.35rem] sm:tracking-[-0.014em]">
          Check Registration Status
        </h3>
        <p className="landing-text-secondary text-[0.84rem] leading-[1.55] sm:text-[0.86rem]">
          Enter your student ID to get started.
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="student-id" className="landing-form-label text-[0.82rem] sm:text-[0.85rem] sr-only">
          Student ID
        </Label>

        <div className="relative">
          <Input
            id="student-id"
            name="student-id"
            placeholder="222-15-6001"
            autoComplete="off"
            inputMode="tel"
            value={studentId}
            onChange={handleInputChange}
            disabled={isValidating}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? 'student-id-error' : undefined}
            className={cn(
              'landing-form-input pr-10 transition-all duration-200 placeholder:text-white/30 placeholder:font-light',
              inputRingClass
            )}
            required
          />

          {/* Trailing status icon */}
          <AnimatePresence mode="wait">
            {isValidating && (
              <motion.span
                key="spinner"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                aria-hidden="true"
              >
                <Loader2 className="size-4 animate-spin text-blue-400" />
              </motion.span>
            )}
            {isValid && (
              <motion.span
                key="check"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                aria-hidden="true"
              >
                <CheckCircle2 className="size-4 text-[#6493b5]" />
              </motion.span>
            )}
            {isInvalid && (
              <motion.span
                key="error-icon"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                aria-hidden="true"
              >
                <XCircle className="size-4 text-red-400" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Inline error message */}
        <AnimatePresence>
          {isInvalid && errorMessage && (
            <motion.p
              id="student-id-error"
              role="alert"
              className="flex items-center gap-1.5 text-[0.78rem] text-red-400"
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            >
              <ErrorIcon className="size-3 shrink-0" aria-hidden="true" />
              {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Button
        id="student-id-continue"
        type="submit"
        disabled={!canSubmit}
        size="cta"
        className="w-full"
        aria-busy={isValidating}
      >
        {isValidating ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Checking...</span>
          </>
        ) : (
          <>
            <span>Continue</span>
            <ArrowRight
              className="size-4 opacity-90 transition-transform duration-200 group-hover/button:translate-x-0.5"
              aria-hidden="true"
            />
          </>
        )}
      </Button>
    </form>
  );
}

