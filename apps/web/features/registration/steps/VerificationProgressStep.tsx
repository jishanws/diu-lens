'use client';

import { CheckCircle2, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { EnrollmentVerificationStatus } from '@/features/registration/api';
import { formatFailedCaptures } from '@/features/registration/verification/failedCaptures';

const stages = [
  ['queued', 'Queued'],
  ['validating', 'Checking images'],
  ['verifying_identity', 'Generating face template'],
  ['completing', 'Saving enrollment'],
] as const;

export function VerificationProgressStep({ job, networkMessage, onRetake, onRetry }: {
  job: EnrollmentVerificationStatus;
  networkMessage?: string | null;
  onRetake: () => void;
  onRetry: () => void;
}) {
  const currentIndex = Math.max(0, stages.findIndex(([stage]) => stage === job.stage));
  const succeeded = job.status === 'succeeded';
  const retake = job.status === 'retake_required';
  const failed = job.status === 'failed';

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/5">
        {succeeded ? <CheckCircle2 className="size-9 text-emerald-300" /> : retake || failed ? <RotateCcw className="size-8 text-amber-300" /> : <ShieldCheck className="size-8 text-sky-200" />}
      </div>
      <div>
        <h3 className="landing-text-primary text-xl font-semibold">
          {succeeded ? 'Registration complete' : retake ? 'A specific capture must be retaken' : failed ? 'Verification could not finish' : 'Registration submitted'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          {succeeded ? 'Your enrollment transaction has been committed successfully.' : retake ? 'Only the listed angles will be recaptured; your successful captures are preserved.' : failed ? job.error?.message ?? 'Your captures are preserved and you can retry safely.' : 'Your upload is complete and your enrollment is being verified in the background. You no longer need to keep the camera open.'}
        </p>
      </div>
      {!succeeded && !retake && !failed && (
        <div className="space-y-3 text-left">
          {stages.map(([stage, label], index) => {
            const complete = index < currentIndex;
            const active = index === currentIndex;
            return <div key={stage} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
              {active ? <Loader2 className="size-4 animate-spin text-sky-300" /> : <CheckCircle2 className={`size-4 ${complete ? 'text-emerald-300' : 'text-slate-600'}`} />}
              <span className={active || complete ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
            </div>;
          })}
        </div>
      )}
      {retake && <div className="flex flex-wrap justify-center gap-2">
        {[...new Set(job.failed_angles.map((failure) => failure.angle))].map((angle) => <span key={angle} className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1 text-xs capitalize text-amber-200">{angle}</span>)}
      </div>}
      {retake && job.failed_angles.length > 0 && (
        <p className="mx-auto max-w-lg rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-left text-xs leading-relaxed text-amber-100">
          {formatFailedCaptures(job.failed_angles)}
        </p>
      )}
      {networkMessage && !succeeded && <p className="text-xs text-amber-200">{networkMessage}</p>}
      {retake && <Button onClick={onRetake}>Retake affected angles</Button>}
      {failed && <Button onClick={onRetry}>Retry verification</Button>}
    </div>
  );
}
