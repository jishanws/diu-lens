'use client';

import { GuidedEnrollmentCapture } from '@/features/registration/capture/GuidedEnrollmentCapture';
import type {
  EnrollmentCompletionResult,
  VerificationCompletionSummary,
} from '@/features/registration/verification/types';
import type { FailedCapture } from '@/features/registration/verification/failedCaptures';

type VerificationFlowProps = {
  studentId: string;
  onComplete: (
    summary: VerificationCompletionSummary
  ) => Promise<EnrollmentCompletionResult>;
  isSubmittingCompletion?: boolean;
  completionErrorMessage?: string | null;
  initialFailedCaptures?: FailedCapture[];
};

export function VerificationFlow({
  studentId,
  onComplete,
  isSubmittingCompletion = false,
  completionErrorMessage,
  initialFailedCaptures = [],
}: VerificationFlowProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <GuidedEnrollmentCapture
        studentId={studentId}
        onComplete={onComplete}
        isSubmittingCompletion={isSubmittingCompletion}
        completionErrorMessage={completionErrorMessage}
        initialFailedCaptures={initialFailedCaptures}
      />
    </div>
  );
}
