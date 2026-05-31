import {
  IdCard,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { HeroSection } from '@/components/HeroSection';

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
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
    </>
  );
}

function BenefitsSection() {
  return (
    <section id="features" className="scroll-mt-24 py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.65rem] font-medium tracking-widest text-slate-500 uppercase">
          Features
        </p>
        <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-white sm:text-[2.2rem]">
          Built for secure, modern campus verification.
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className="landing-card-surface flex h-full min-h-[10.5rem] flex-col rounded-[2rem] border border-white/5 bg-[#16191f]/50 p-5"
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
    <section id="how-it-works" className="scroll-mt-24 py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.65rem] font-medium tracking-widest text-slate-500 uppercase">
          How It Works
        </p>
        <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-white sm:text-[2.2rem]">
          A clear path before the form begins.
        </h2>
      </div>

      <ol className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {workflowSteps.map((step, index) => (
          <li
            key={step.title}
            className="landing-card-surface relative flex h-full min-h-[10.5rem] flex-col rounded-[2rem] border border-white/5 bg-[#16191f]/50 p-5"
          >
            {index < workflowSteps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[calc(100%-1rem)] top-10 hidden h-px w-8 bg-white/5 lg:block"
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
