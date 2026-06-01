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
    <section id="features" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[0.7rem] font-medium tracking-[0.2em] text-slate-500 uppercase">
          Features
        </p>
        <h2 className="mt-5 text-[2rem] font-medium leading-[1.15] tracking-[-0.02em] text-white sm:text-[2.75rem] sm:leading-[1.1] sm:tracking-[-0.03em]">
          Built for secure and modern campus identity.
        </h2>
        <p className="mx-auto mt-6 max-w-[34rem] text-[0.95rem] leading-[1.75] text-slate-400 sm:text-[1.1rem]">
          DIU Lens is designed to create a trusted identity layer for students across university systems. From biometric enrollment to authentication workflows, every part of the platform is built with clarity, reliability, and long-term campus integration in mind.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-5 sm:mt-24 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-3 lg:gap-6 md:max-w-3xl lg:max-w-5xl">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/[0.03] bg-white/[0.01] p-8 transition-all duration-700 ease-out hover:border-white/[0.06] hover:bg-white/[0.02] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] sm:p-10 md:flex-row md:items-center md:gap-8 lg:flex-col lg:items-start lg:gap-0"
          >
            {/* Subtle atmospheric top highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" aria-hidden="true" />
            
            <div className="relative z-10 flex w-full flex-col md:flex-row md:items-center md:gap-10 lg:flex-col lg:items-start lg:gap-0">
              <div className="mb-12 flex items-start justify-between md:mb-0 md:flex-col md:gap-5 lg:mb-12 lg:flex-row lg:justify-between shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.04] bg-[#111318] shadow-inner transition-all duration-500 group-hover:border-white/[0.08] group-hover:bg-[#16181d] md:h-14 md:w-14 lg:h-12 lg:w-12">
                  <benefit.Icon
                    className="size-[1.375rem] text-slate-400 transition-colors duration-500 group-hover:text-slate-100 md:size-6 lg:size-[1.375rem]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <span className="mt-1.5 text-[0.625rem] font-medium tracking-[0.2em] text-slate-500/60 uppercase transition-colors duration-500 group-hover:text-slate-400/80 md:mt-0 lg:mt-1.5">
                  0{index + 1}
                </span>
              </div>
              
              <div className="md:flex-1">
                <h3 className="text-[1.1rem] font-medium tracking-[-0.01em] text-slate-100 transition-colors duration-500 group-hover:text-white md:text-[1.15rem] lg:text-[1.1rem]">
                  {benefit.title}
                </h3>
                <p className="mt-3.5 text-[0.92rem] leading-[1.8] text-slate-400/70 transition-colors duration-500 group-hover:text-slate-400/90 pr-2 md:mt-2.5 md:pr-0 lg:mt-3.5 lg:pr-2">
                  {benefit.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[0.7rem] font-medium tracking-[0.2em] text-slate-500 uppercase">
          Process Flow
        </p>
        <h2 className="mt-5 text-[2rem] font-medium leading-[1.15] tracking-[-0.02em] text-white sm:text-[2.75rem] sm:leading-[1.1] sm:tracking-[-0.03em]">
          Three steps to secure biometric enrollment.
        </h2>
        <p className="mx-auto mt-6 max-w-[34rem] text-[0.95rem] leading-[1.75] text-slate-400 sm:text-[1.1rem]">
          The verification process is intentionally designed to remain simple, guided, and easy to complete while maintaining strong identity validation standards throughout enrollment.
        </p>
      </div>

      <div className="mx-auto mt-20 max-w-5xl sm:mt-28">
        <div className="relative">
          {/* Horizontal Line for Desktop */}
          <div 
            className="absolute left-[16.66%] right-[16.66%] top-[1.375rem] hidden h-[1px] bg-white/[0.08] lg:block"
            aria-hidden="true" 
          />

          <ol className="relative grid grid-cols-1 gap-12 md:gap-16 lg:grid-cols-3 lg:gap-8">
            {workflowSteps.map((step, index) => (
              <li key={step.title} className="relative group">
                
                {/* Vertical Line for Mobile/Tablet (inside li) */}
                {index < workflowSteps.length - 1 && (
                  <div 
                    className="absolute left-[1.375rem] md:left-[1.625rem] top-11 md:top-12 bottom-[-3rem] md:bottom-[-4rem] w-[1px] bg-white/[0.08] lg:hidden"
                    aria-hidden="true" 
                  />
                )}

                <div className="flex flex-row gap-6 md:gap-10 lg:flex-col lg:items-center lg:text-center lg:gap-0">
                  
                  {/* Step Indicator */}
                  <div className="flex flex-col items-center lg:mb-12 lg:justify-center">
                    <div className="relative z-10 flex h-11 w-11 md:h-13 md:w-13 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#111318] transition-all duration-700 ease-out group-hover:border-white/30 group-hover:bg-[#1a1d24] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] md:h-[3.25rem] md:w-[3.25rem] lg:h-11 lg:w-11">
                      <span className="text-[0.7rem] md:text-[0.75rem] lg:text-[0.7rem] font-medium tracking-[0.05em] text-slate-400 transition-colors duration-500 group-hover:text-slate-100">
                        0{index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex flex-col pb-2 lg:pb-0 lg:items-center md:pt-1 lg:pt-0">
                    <div className="mb-6 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.01] transition-all duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.03] md:h-16 md:w-16 lg:h-14 lg:w-14">
                      <step.Icon className="size-6 text-slate-400 transition-colors duration-500 group-hover:text-slate-100 md:size-7 lg:size-6" strokeWidth={1.5} />
                    </div>
                    
                    <h3 className="text-[1.15rem] font-medium tracking-[-0.01em] text-slate-100 transition-colors duration-500 group-hover:text-white md:text-[1.2rem] lg:text-[1.15rem]">
                      {step.title}
                    </h3>
                    <p className="mt-3.5 max-w-[18rem] md:max-w-[24rem] text-[0.95rem] md:text-[1rem] leading-[1.65] text-slate-400/80 lg:mx-auto lg:max-w-[18rem] lg:text-[0.95rem]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
