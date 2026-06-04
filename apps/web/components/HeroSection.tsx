import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-5 pt-28 pb-10 text-center sm:px-4 sm:pt-36 sm:pb-12 md:max-w-5xl md:pt-40 md:pb-14 lg:pt-44 lg:pb-16">
      <div className="flex flex-col items-center justify-center">
        <h1 className="mx-auto w-full text-[2.4rem] font-medium leading-[1.1] tracking-[-0.03em] text-white sm:text-[3.5rem] sm:leading-[1.08] md:text-[4.25rem] md:leading-[1.04] lg:text-[4.75rem] lg:leading-[1.02] lg:tracking-[-0.04em]">
          Smart{' '}
          <span className="bg-gradient-to-b from-white to-slate-400/80 bg-clip-text text-transparent">
            Identification
          </span>
          <span className="sm:hidden"> </span>
          <br className="hidden sm:block" />
          for DIU Campus
        </h1>

        <p className="mx-auto mt-5 max-w-[20rem] text-[0.95rem] leading-[1.7] text-slate-400/90 sm:mt-6 sm:max-w-[36rem] sm:text-[1.05rem] sm:leading-[1.75] md:max-w-[38rem] md:text-[1.125rem] md:leading-[1.8] lg:max-w-[42rem]">
          A biometric identity platform built for DIU students. Enroll once with facial recognition and establish a verified digital identity across campus services.
        </p>
      </div>

      <div className="group relative mt-12 flex w-full flex-col items-center justify-center sm:mt-14 sm:w-auto md:mt-16">
        {/* Extremely subtle ambient reflection */}
        <div className="absolute inset-0 z-0 rounded-[16px] bg-[#6493b5]/[0.03] blur-[6px] transition-[background-color,filter] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-[#6493b5]/[0.05] group-hover:blur-[8px] sm:rounded-[12px] md:rounded-[14px]" />
        
        <Link
          href="/verify"
          className="relative z-10 flex h-[3.2rem] w-full max-w-[20rem] items-center justify-center gap-[0.45rem] rounded-[16px] bg-[#08111f]/10 bg-gradient-to-b from-[#6493b5]/[0.22] to-[#6493b5]/[0.08] px-6 text-[1rem] font-medium tracking-normal text-white/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_2px_6px_-1px_rgba(0,0,0,0.3)] ring-1 ring-[#6493b5]/[0.15] ring-inset backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:h-[2.8rem] sm:w-auto sm:max-w-none sm:gap-[0.5rem] sm:rounded-[12px] sm:px-[1.85rem] sm:text-[0.88rem] md:h-[3.15rem] md:gap-[0.55rem] md:rounded-[14px] md:px-[2.25rem] md:text-[0.95rem] hover:-translate-y-[1px] hover:bg-[#08111f]/20 hover:from-[#6493b5]/[0.28] hover:to-[#6493b5]/[0.12] hover:text-white hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_12px_-2px_rgba(0,0,0,0.4)] hover:ring-[#6493b5]/[0.25]"
        >
          Start Verification
          <ArrowRight className="h-[0.85rem] w-[0.85rem] stroke-[1.5px] opacity-60 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100 md:h-[0.9rem] md:w-[0.9rem]" />
        </Link>
      </div>
    </section>
  );
}
