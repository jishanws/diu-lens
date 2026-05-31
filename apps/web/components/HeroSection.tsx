import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-5 pt-28 pb-10 text-center sm:px-4 sm:pt-36 sm:pb-12 lg:pt-40 lg:pb-16">
      <div className="flex flex-col items-center justify-center">
        <h1 className="mx-auto max-w-[14ch] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.03em] text-white sm:max-w-[16ch] sm:text-6xl sm:leading-[1.08] lg:text-[4.75rem] lg:leading-[1.02] lg:tracking-[-0.04em]">
          Smart{' '}
          <br className="block sm:hidden" />
          <span className="bg-gradient-to-b from-white to-slate-400/80 bg-clip-text text-transparent">
            Identification
          </span>{' '}
          <br />
          for DIU Campus
        </h1>

        <p className="mx-auto mt-6 max-w-[21rem] text-[1rem] leading-[1.65] text-slate-400/90 sm:max-w-[36rem] sm:text-[1.05rem] sm:leading-[1.75]">
          Secure your campus identity through a modern biometric verification platform built for DIU students. DIU Lens combines intelligent facial authentication with streamlined enrollment to deliver safer access, trusted identity validation, and a more secure digital campus experience.
        </p>
      </div>

      <div className="group relative mt-12 flex w-full flex-col items-center justify-center sm:mt-14 sm:w-auto">
        {/* Soft, restrained environmental diffusion */}
        <div className="absolute -inset-1 z-0 rounded-2xl bg-[#6a9ab8]/10 blur-[8px] transition-all duration-500 ease-out group-hover:bg-[#6a9ab8]/15 group-hover:blur-[12px]" />
        
        <Link
          href="/verify"
          className="relative z-10 flex h-[3.2rem] w-[100%] max-w-[20rem] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#6a9ab8]/[0.85] to-[#5a8aa8]/[0.85] px-6 pb-[1px] text-[1rem] font-medium tracking-[-0.01em] text-white/95 shadow-[0_2px_8px_-2px_rgba(90,138,168,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-white/[0.04] backdrop-blur-xl transition-all duration-500 ease-out sm:h-[2.8rem] sm:w-auto sm:max-w-none sm:gap-1.5 sm:rounded-[12px] sm:px-[1.85rem] sm:text-[0.88rem] hover:from-[#6a9ab8]/[0.95] hover:to-[#5a8aa8]/[0.95] hover:text-white hover:shadow-[0_4px_12px_-4px_rgba(90,138,168,0.2),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:ring-white/[0.08]"
        >
          Start Verification
          <ArrowRight className="h-[0.85rem] w-[0.85rem] stroke-[2px] opacity-70 transition-opacity duration-500 ease-out group-hover:opacity-100" />
        </Link>
      </div>
    </section>
  );
}
