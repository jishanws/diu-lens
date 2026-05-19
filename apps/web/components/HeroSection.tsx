import { ArrowDown } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 pt-24 pb-4 text-center sm:pt-32 sm:pb-8 lg:pt-36 lg:pb-10">
      <div className="space-y-3 sm:space-y-4">
        <h1 className="mx-auto max-w-[15ch] text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-white sm:max-w-[16ch] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.05]">
          Smart{' '}
          <span className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Identification
          </span>{' '}
          <br className="hidden sm:block" />
          for DIU Campus
        </h1>

        <p className="mx-auto max-w-[21rem] text-[0.9rem] leading-relaxed text-slate-400 sm:max-w-2xl sm:text-base">
          Secure your campus identity with AI-powered facial verification
          designed for faster access, safer authentication, and trusted
          biometric validation across campus systems.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center sm:mt-8">
        <a
          href="#start-verification"
          className="group text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Scroll to verification"
        >
          <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-1 sm:size-5" />
        </a>
      </div>
    </section>
  );
}
