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
    title: 'Trusted Campus Identity',
    description:
      'Create a secure biometric identity connected directly to official DIU student records. The platform helps establish a trusted digital identity layer that can support future campus authentication systems and student services.',
    Icon: ShieldCheck,
  },
  {
    title: 'Intelligent Face Verification',
    description:
      'Advanced facial verification technology helps validate student identity through a guided and reliable enrollment process. The experience is designed to remain accurate, fast, and accessible across modern devices.',
    Icon: Sparkles,
  },
  {
    title: 'Impersonation Protection',
    description:
      'Reduce identity misuse through biometric enrollment tied directly to the enrolled student. DIU Lens strengthens authenticity and helps ensure that campus identity remains personal, verifiable, and protected.',
    Icon: LockKeyhole,
  },
] as const;

const workflowSteps = [
  {
    title: 'Student Verification',
    description:
      'Begin by confirming your DIU student identity through institutional verification. This step establishes the foundation required for secure enrollment within the platform.',
    Icon: IdCard,
  },
  {
    title: 'Profile Confirmation',
    description:
      'Review and confirm essential student information before continuing to biometric enrollment. This helps maintain profile accuracy and verification consistency.',
    Icon: UserRound,
  },
  {
    title: 'Biometric Enrollment',
    description:
      'Complete the guided facial capture process to securely enroll your biometric identity. The system validates image quality and enrollment integrity in real time.',
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
    <section id="features" className="scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.68rem] font-semibold tracking-[0.15em] text-slate-500/80 uppercase">
          FEATURES
        </p>
        <h2 className="mt-4 text-[1.8rem] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[2.4rem] sm:leading-[1.1] sm:tracking-[-0.03em]">
          Built for secure and modern campus identity.
        </h2>
        <p className="mx-auto mt-5 max-w-[36rem] text-[0.95rem] leading-[1.75] text-slate-400 sm:text-[1.05rem]">
          DIU Lens is designed to create a trusted identity layer for students across university systems. From biometric enrollment to authentication workflows, every part of the platform is built with clarity, reliability, and long-term campus integration in mind.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 md:grid-cols-3 sm:gap-5 lg:gap-6">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className="landing-card-surface flex h-full min-h-[12rem] flex-col rounded-[24px] border border-white/5 bg-[#16191f]/50 p-7 sm:rounded-[2rem] sm:p-7 lg:p-8"
          >
            <div className="mb-6 flex items-center gap-3 sm:mb-8">
              <benefit.Icon
                className="size-5 text-slate-400 sm:size-4.5"
                aria-hidden="true"
              />
              <span className="mt-[2px] text-[0.7rem] font-semibold tracking-[0.1em] text-slate-500/80 uppercase sm:text-[0.68rem] sm:tracking-[0.08em]">
                Feature 0{index + 1}
              </span>
            </div>
            <h3 className="text-[1.1rem] font-medium tracking-[-0.01em] text-slate-100">
              {benefit.title}
            </h3>
            <p className="mt-3 text-[0.92rem] leading-[1.65] text-slate-400/90">
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
    <section id="how-it-works" className="scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.68rem] font-semibold tracking-[0.15em] text-slate-500/80 uppercase">
          HOW IT WORKS
        </p>
        <h2 className="mt-4 text-[1.8rem] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[2.4rem] sm:leading-[1.1] sm:tracking-[-0.03em]">
          Three steps to secure biometric enrollment.
        </h2>
        <p className="mx-auto mt-5 max-w-[36rem] text-[0.95rem] leading-[1.75] text-slate-400 sm:text-[1.05rem]">
          The verification process is intentionally designed to remain simple, guided, and easy to complete while maintaining strong identity validation standards throughout enrollment.
        </p>
      </div>

      <ol className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {workflowSteps.map((step, index) => (
          <li
            key={step.title}
            className="landing-card-surface relative flex h-full min-h-[12rem] flex-col rounded-[24px] border border-white/5 bg-[#16191f]/50 p-7 sm:rounded-[2rem] sm:p-7 lg:p-8"
          >
            {index < workflowSteps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[calc(100%-1rem)] top-[3.25rem] hidden h-px w-8 bg-white/5 lg:block"
              />
            ) : null}
            <div className="mb-6 flex items-center gap-3 sm:mb-8">
              <step.Icon
                className="size-5 text-slate-400 sm:size-4.5"
                aria-hidden="true"
              />
              <span className="mt-[2px] text-[0.7rem] font-semibold tracking-[0.1em] text-slate-500/80 uppercase sm:text-[0.68rem] sm:tracking-[0.08em]">
                Step 0{index + 1}
              </span>
            </div>
            <h3 className="text-[1.1rem] font-medium tracking-[-0.01em] text-slate-100">
              {step.title}
            </h3>
            <p className="mt-3 text-[0.92rem] leading-[1.65] text-slate-400/90">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
