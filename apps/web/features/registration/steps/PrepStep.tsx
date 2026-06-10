import { ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { registrationPrepTips } from '@/features/registration/constants';

type PrepStepProps = {
  onContinue: () => void;
};

export function PrepStep({ onContinue }: PrepStepProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h2 className="landing-text-primary text-[1.22rem] font-semibold tracking-tight sm:text-[1.35rem]">
          Face Verification
        </h2>
        <p className="landing-text-secondary text-[0.84rem] leading-[1.55] sm:text-[0.86rem]">
          Before continuing, make sure your environment is ready for a quick and
          accurate face verification scan.
        </p>
      </header>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
        <p className="mb-3 inline-flex items-center gap-2 text-[0.82rem] font-semibold tracking-wide text-slate-300">
          <ShieldCheck className="size-[0.9rem] text-blue-400" />
          Quick preparation tips
        </p>
        <ul className="space-y-2 text-[0.84rem] leading-[1.5] text-slate-400">
          {registrationPrepTips.map((tip) => (
            <li
              key={tip}
              className="inline-flex items-start gap-2.5"
            >
              <span
                className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-blue-400/70"
                aria-hidden="true"
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        onClick={onContinue}
        size="cta"
        className="w-full sm:w-auto"
      >
        Start Verification
      </Button>
    </div>
  );
}
