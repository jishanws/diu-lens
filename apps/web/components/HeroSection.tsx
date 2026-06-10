import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

      <div className="mt-12 flex w-full flex-col items-center justify-center sm:mt-14 sm:w-auto md:mt-16">
        <Button asChild size="hero" className="z-10 w-full max-w-[20rem] sm:w-auto opacity-[0.55] hover:opacity-100 transition-opacity duration-300">
          <Link href="/verify">
            Start Verification
            <ArrowRight className="stroke-[1.5px]" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
