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
          "mt-8 flex flex-wrap items-center justify-center gap-6 px-4 transition-all duration-700 ease-in-out",
          isVerificationStep ? "opacity-0 translate-y-4 pointer-events-none absolute" : "opacity-100 translate-y-0 relative"
        )}
      >
        <div className="flex items-center gap-2 text-[0.8rem] text-slate-400">
          <ShieldCheck className="size-4 text-blue-400/80" />
          <span>Secure biometric verification</span>
        </div>
        <div className="flex items-center gap-2 text-[0.8rem] text-slate-400">
          <LockKeyhole className="size-4 text-emerald-400/80" />
          <span>Encrypted identity protection</span>
        </div>
      </div>
    </div>
  );
}
