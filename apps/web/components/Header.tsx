import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function Header() {
  return (
    <header className="relative flex items-center justify-between py-0.5 md:py-0.5 lg:py-1">
      <div className="flex items-center gap-2.5 sm:gap-3.5 lg:gap-4">
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[0.85rem] border border-white/10 bg-white/6 shadow-[0_12px_24px_-18px_rgba(59,130,246,0.6)] ring-1 ring-blue-500/20 backdrop-blur-sm sm:h-10 sm:w-10 sm:rounded-[0.95rem] lg:h-12 lg:w-12 lg:rounded-[1rem]">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_28%_22%,rgba(96,165,250,0.3),transparent_62%)]"
          />
          <Image
            src="/branding/logo.png"
            alt="DIU Lens logo"
            width={48}
            height={48}
            priority
            className="relative h-[1.875rem] w-[1.875rem] drop-shadow-[0_8px_14px_rgba(15,23,42,0.45)] sm:h-8 sm:w-8 lg:h-10 lg:w-10"
          />
        </span>
        <p className="landing-text-primary text-[1.24rem] leading-none font-semibold tracking-[-0.016em] md:text-[1.28rem] lg:text-[1.8rem]">
          DIU Lens
        </p>
      </div>

      <div className="flex items-center gap-2.5 md:gap-3 lg:gap-[1.125rem]">
        <ThemeToggle />
      </div>
    </header>
  );
}
