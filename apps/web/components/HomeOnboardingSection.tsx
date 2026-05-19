'use client';

import { useState } from 'react';
import {
  Clock3,
  Fingerprint,
  IdCard,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { HeroSection } from '@/components/HeroSection';
import { RegistrationCard } from '@/components/RegistrationCard';
import { cn } from '@/lib/utils';

const benefits = [
  {
    title: 'Secure Campus Identity',
    description:
      'Connect student records with a trusted biometric identity layer for DIU services.',
    Icon: ShieldCheck,
  },
  {
    title: 'AI-Powered Verification',
    description:
      'Guided face checks help validate identity with a fast, modern capture flow.',
    Icon: Sparkles,
  },
  {
    title: 'Anti-Impersonation Protection',
    description:
      'Reduce identity misuse with enrollment designed around ownership and presence.',
    Icon: LockKeyhole,
  },
] as const;

const workflowSteps = [
  {
    title: 'Student ID Check',
    description:
      'Start by validating the institutional ID that anchors the student profile.',
    Icon: IdCard,
  },
  {
    title: 'Basic Information',
    description:
      'Confirm essential contact and profile details before biometric capture.',
    Icon: UserRound,
  },
  {
    title: 'Face Verification',
    description:
      'Complete guided face capture to create the secure biometric enrollment.',
    Icon: ScanFace,
  },
] as const;

export function HomeOnboardingSection() {
  const [activeStep, setActiveStep] = useState(0);
  const isVerificationStep = activeStep === 2;

  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />

      <section
        id="start-verification"
        className="relative scroll-mt-8 py-10 sm:py-14 lg:py-16"
      >
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-center">
          <div
            className={cn(
              'mx-auto max-w-md text-center transition-all duration-300 ease-out lg:mx-0 lg:text-left',
              activeStep > 0 && !isVerificationStep
                ? 'lg:opacity-80'
                : 'lg:opacity-100'
            )}
          >
            <h2 className="text-[2rem] leading-tight font-semibold tracking-tight text-white sm:text-[2.25rem]">
              Enter the DIU Lens onboarding experience.
            </h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-slate-400">
              The product workflow starts here. Follow the guided steps to
              validate your student ID, confirm your details, and complete face
              verification.
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-[27rem] justify-center drop-shadow-[0_12px_30px_rgba(0,0,0,0.4)] md:max-w-[31rem] lg:mx-0 lg:max-w-none lg:justify-end">
            <RegistrationCard onStepIndexChange={setActiveStep} />
          </div>
        </div>
      </section>
    </>
  );
}

function BenefitsSection() {
  return (
    <section className="py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.65rem] font-medium tracking-widest text-slate-500 uppercase">
          Trusted Identity Layer
        </p>
        <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-white sm:text-[2.2rem]">
          Built for secure, modern campus verification.
        </h2>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-slate-400 sm:text-[1rem]">
          DIU Lens brings identity assurance, biometric enrollment, and faster
          access into one focused student verification experience.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className="landing-card-surface flex h-full min-h-[12rem] flex-col rounded-2xl border border-white/5 bg-[#0a1120]/40 p-6"
          >
            <div className="mb-5 flex items-center gap-2.5">
              <benefit.Icon
                className="size-4 text-slate-400"
                aria-hidden="true"
              />
              <span className="text-[0.7rem] font-medium tracking-wide text-slate-500 uppercase">
                Feature 0{index + 1}
              </span>
            </div>
            <h3 className="text-[1.05rem] font-medium text-slate-100">
              {benefit.title}
            </h3>
            <p className="mt-2.5 text-[0.85rem] leading-relaxed text-slate-400">
              {benefit.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.65rem] font-medium tracking-widest text-slate-500 uppercase">
          How It Works
        </p>
        <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-white sm:text-[2.2rem]">
          A clear path before the form begins.
        </h2>
      </div>

      <ol className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
        {workflowSteps.map((step, index) => (
          <li
            key={step.title}
            className="landing-card-surface relative flex h-full min-h-[12rem] flex-col rounded-2xl border border-white/5 bg-[#0a1120]/40 p-6"
          >
            {index < workflowSteps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[calc(100%-1rem)] top-10 hidden h-px w-8 bg-white/5 md:block"
              />
            ) : null}
            <div className="mb-5 flex items-center gap-2.5">
              <step.Icon
                className="size-4 text-slate-400"
                aria-hidden="true"
              />
              <span className="text-[0.7rem] font-medium tracking-wide text-slate-500 uppercase">
                Step 0{index + 1}
              </span>
            </div>
            <h3 className="text-[1.05rem] font-medium text-slate-100">
              {step.title}
            </h3>
            <p className="mt-2.5 text-[0.85rem] leading-relaxed text-slate-400">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
