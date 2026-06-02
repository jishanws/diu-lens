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
        {/* Soft, restrained environmental diffusion */}
        <div className="absolute -inset-1 z-0 rounded-2xl bg-[#6493b5]/10 blur-[8px] transition-all duration-500 ease-out group-hover:bg-[#6493b5]/15 group-hover:blur-[12px]" />
        
        <Link
          href="/verify"
          className="relative z-10 flex h-[3.2rem] w-[100%] max-w-[20rem] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#6493b5]/[0.85] to-[#527c9a]/[0.85] px-6 pb-[1px] text-[1rem] font-medium tracking-[-0.01em] text-white/95 shadow-[0_2px_8px_-2px_rgba(100,147,181,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-white/[0.04] backdrop-blur-xl transition-all duration-500 ease-out sm:h-[2.8rem] sm:w-auto sm:max-w-none sm:gap-1.5 sm:rounded-[12px] sm:px-[1.85rem] sm:text-[0.88rem] md:h-[3.15rem] md:gap-2 md:rounded-[14px] md:px-[2.25rem] md:text-[0.95rem] hover:from-[#6493b5]/[0.95] hover:to-[#527c9a]/[0.95] hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(100,147,181,0.2),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:ring-white/[0.08]"
        >
          Start Verification
          <ArrowRight className="h-[0.85rem] w-[0.85rem] stroke-[2px] opacity-70 transition-opacity duration-500 ease-out group-hover:opacity-100 md:h-[0.95rem] md:w-[0.95rem]" />
        </Link>
      </div>
    </section>
  );
}
