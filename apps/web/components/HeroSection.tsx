import { ArrowDown } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 pt-36 pb-16 text-center sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-24">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[0.65rem] font-medium tracking-widest text-slate-400 uppercase">
        <span className="relative flex size-1.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40"></span>
          <span className="relative inline-flex size-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
        </span>
        Face ID Verification
      </div>

      <div className="mt-8 space-y-6 sm:mt-10">
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

      <div className="mt-14 flex items-center justify-center">
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
