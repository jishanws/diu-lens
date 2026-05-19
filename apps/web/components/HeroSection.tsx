import { ArrowDown } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 pt-28 pb-6 text-center sm:pt-32 sm:pb-8 lg:pt-36 lg:pb-10">
      <div className="space-y-4">
        <h1 className="mx-auto max-w-[16ch] text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
          Smart{' '}
          <span className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Identification
          </span>{' '}
          <br className="hidden sm:block" />
          for DIU Campus
        </h1>

        <p className="mx-auto max-w-2xl text-[0.95rem] leading-relaxed text-slate-400 sm:text-base">
          Secure your campus identity with AI-powered facial verification
          designed for faster access, safer authentication, and trusted
          biometric validation across campus systems.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center">
        <a
          href="#start-verification"
          className="group text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Scroll to verification"
        >
          <ArrowDown className="size-5 transition-transform duration-300 group-hover:translate-y-1" />
        </a>
      </div>
    </section>
  );
}
