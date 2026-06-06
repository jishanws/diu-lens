'use client';

import { useState } from 'react';
import { ShieldCheck, LockKeyhole } from 'lucide-react';
import { RegistrationFlow } from '@/features/registration/RegistrationFlow';
import { cn } from '@/lib/utils';

export function VerifyPageClient() {
  const [activeStep, setActiveStep] = useState(0);
  const isVerificationStep = activeStep === 2;

  return (
    <div className="flex w-full flex-col items-center justify-center pt-8 lg:pt-12">
      {/* Centered Workflow Area */}
      <div 
        className={cn(
          "relative w-full transition-all duration-700 ease-in-out",
          isVerificationStep ? "max-w-5xl" : "max-w-[28rem] sm:max-w-[32rem] md:max-w-[36rem]"
        )}
      >
        <div className="relative z-10 w-full">
          <RegistrationFlow onStepIndexChange={setActiveStep} />
        </div>
      </div>

      {/* Minimal Trust Messaging Below */}
      <div 
        className={cn(
          "mt-4 flex flex-wrap items-center justify-center gap-4 px-4 transition-all duration-700 ease-in-out",
          isVerificationStep ? "opacity-0 translate-y-4 pointer-events-none absolute" : "opacity-100 translate-y-0 relative"
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 px-5 py-2">
          <div className="flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide text-slate-500/70">
            <ShieldCheck className="size-3 opacity-50" aria-hidden="true" />
            <span>Secure biometric verification</span>
          </div>
          <div className="hidden h-3 w-px bg-white/[0.04] sm:block" aria-hidden="true" />
          <div className="flex items-center gap-1.5 text-[0.65rem] font-medium tracking-wide text-slate-500/70">
            <LockKeyhole className="size-3 opacity-50" aria-hidden="true" />
            <span>Encrypted identity protection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
