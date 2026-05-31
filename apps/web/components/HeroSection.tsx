import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

      <div className="group relative mt-10 flex flex-col items-center justify-center sm:mt-12">
        {/* Subtle environmental glow framing the CTA */}
        <div className="absolute -inset-4 z-0 rounded-full bg-white/[0.01] blur-[20px] transition-all duration-700 group-hover:bg-white/[0.03] group-hover:blur-[24px]" />
        
        <Link
          href="/verify"
          className="relative z-10 flex h-[3.25rem] items-center justify-center gap-2.5 rounded-full border border-white/[0.05] bg-[#111318]/40 px-8 text-[0.9rem] font-medium tracking-wide text-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.04)] backdrop-blur-xl transition-all duration-700 sm:h-[3.5rem] sm:px-10 sm:text-[0.95rem] group-hover:border-white/[0.1] group-hover:bg-white/[0.04] group-hover:text-white group-hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.08)]"
        >
          Begin Secure Verification
          <ArrowRight className="size-[1.1rem] opacity-60 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:opacity-100" />
        </Link>
      </div>
    </section>
  );
}
