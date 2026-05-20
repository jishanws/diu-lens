import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

type SuccessStepProps = {
  onDone?: () => void;
};

export function SuccessStep({ onDone }: SuccessStepProps) {
  return (
    <div className="space-y-5 pt-1 text-center sm:space-y-6">
      <div className="mx-auto inline-flex size-11 items-center justify-center rounded-full bg-blue-500/12 text-blue-300/90">
        <CheckCircle2 className="size-5" />
      </div>

      <header className="space-y-1.5">
        <h2 className="landing-text-primary text-[1.22rem] font-semibold tracking-tight sm:text-[1.35rem]">
          Registration Complete
        </h2>
        <p className="landing-text-secondary mx-auto max-w-[34ch] text-[0.84rem] leading-[1.55] sm:text-[0.86rem]">
          Your onboarding details have been saved. Face verification integration
          will be connected in the next release.
        </p>
      </header>

      <Button
        type="button"
        onClick={onDone}
        className="landing-button-bg landing-cta w-full px-8 text-white"
      >
        Done
      </Button>
    </div>
  );
}
