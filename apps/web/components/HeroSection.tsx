import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full flex-col items-center justify-center px-5 pt-28 pb-10 sm:px-4 sm:pt-36 sm:pb-12 md:pt-40 md:pb-14 lg:pt-44 lg:pb-16">
      
      {/* ── ARCHITECTURAL BLUEPRINT BACKGROUND ───────────────────
          Subtle institutional infrastructure layer.
          Masked heavily in the center to prioritize readability. ── */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true" 
      >
        <div className="animate-blueprint absolute inset-[-2%] bg-[url('/branding/bg.jpeg')] bg-cover bg-[center_top_15%] bg-no-repeat mix-blend-screen saturate-[0.35] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_45%,transparent_40%,black_100%)]" />
        
        {/* Soft radial depth lighting for the blueprint */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(106,154,184,0.03),transparent)] mix-blend-screen" />
        
        {/* Extreme edge fading so it blends seamlessly into the global background */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0e1115] via-[#0e1115]/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0e1115] via-[#0e1115]/60 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0e1115] via-[#0e1115]/60 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0e1115] via-[#0e1115]/60 to-transparent" />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center text-center md:max-w-5xl">
        <h1 className="mx-auto w-full text-[2.75rem] font-medium leading-[1.05] tracking-[-0.03em] text-white sm:text-[3.5rem] sm:leading-[1.08] md:text-[4.25rem] md:leading-[1.04] lg:text-[4.75rem] lg:leading-[1.02] lg:tracking-[-0.04em]">
          Smart{' '}
          <span className="bg-gradient-to-b from-white to-slate-400/80 bg-clip-text text-transparent">
            Identification
          </span>
          <span className="sm:hidden"> </span>
          <br className="hidden sm:block" />
          for DIU Campus
        </h1>

        <p className="mx-auto mt-6 max-w-[21rem] text-[1rem] leading-[1.65] text-slate-400/90 sm:max-w-[36rem] sm:text-[1.05rem] sm:leading-[1.75] md:max-w-[38rem] md:text-[1.125rem] md:leading-[1.8] lg:max-w-[42rem]">
          Secure your campus identity through a modern biometric verification platform built for DIU students. DIU Lens combines intelligent facial authentication with streamlined enrollment to deliver safer access, trusted identity validation, and a more secure digital campus experience.
        </p>
      </div>

      <div className="group relative mt-12 flex w-full flex-col items-center justify-center sm:mt-14 sm:w-auto md:mt-16">
        {/* Soft, restrained environmental diffusion */}
        <div className="absolute -inset-1 z-0 rounded-2xl bg-[#6a9ab8]/10 blur-[8px] transition-all duration-500 ease-out group-hover:bg-[#6a9ab8]/15 group-hover:blur-[12px]" />
        
        <Link
          href="/verify"
          className="relative z-10 flex h-[3.2rem] w-[100%] max-w-[20rem] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#6a9ab8]/[0.85] to-[#5a8aa8]/[0.85] px-6 pb-[1px] text-[1rem] font-medium tracking-[-0.01em] text-white/95 shadow-[0_2px_8px_-2px_rgba(90,138,168,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-white/[0.04] backdrop-blur-xl transition-all duration-500 ease-out sm:h-[2.8rem] sm:w-auto sm:max-w-none sm:gap-1.5 sm:rounded-[12px] sm:px-[1.85rem] sm:text-[0.88rem] md:h-[3.15rem] md:gap-2 md:rounded-[14px] md:px-[2.25rem] md:text-[0.95rem] hover:from-[#6a9ab8]/[0.95] hover:to-[#5a8aa8]/[0.95] hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(90,138,168,0.2),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:ring-white/[0.08]"
        >
          Start Verification
          <ArrowRight className="h-[0.85rem] w-[0.85rem] stroke-[2px] opacity-70 transition-opacity duration-500 ease-out group-hover:opacity-100 md:h-[0.95rem] md:w-[0.95rem]" />
        </Link>
      </div>
    </section>
  );
}
