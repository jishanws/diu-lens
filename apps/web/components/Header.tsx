import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Header() {
  return (
    <div className="fixed top-6 inset-x-0 z-50 flex w-full justify-center px-4">
      <header className="grid h-[3.25rem] w-full max-w-[46rem] grid-cols-2 items-center md:grid-cols-[1fr_auto_1fr] rounded-full border border-white/[0.03] bg-[#0a1120]/30 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_4px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-lg transition-all duration-300">

        <div className="flex items-center gap-2 pl-2 justify-self-start">
          <div className="flex size-[2.15rem] items-center justify-center rounded-[0.65rem] border border-white/[0.06] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Image
              src="/branding/logo.png"
              alt="DIU Lens logo"
              width={40}
              height={40}
              priority
              className="size-[2.1rem] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            />
          </div>
          <span className="text-[0.95rem] font-medium tracking-wide text-slate-100">
            DIU Lens
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex justify-self-center">
          <Link
            href="#features"
            className="rounded-full px-4 py-1.5 text-[0.85rem] font-medium text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-100 active:bg-white/[0.04]"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-full px-4 py-1.5 text-[0.85rem] font-medium text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-100 active:bg-white/[0.04]"
          >
            How It Works
          </Link>
          <Link
            href="#contact"
            className="rounded-full px-4 py-1.5 text-[0.85rem] font-medium text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-100 active:bg-white/[0.04]"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center pr-1 justify-self-end">
          <Link
            href="#start-verification"
            className="group flex h-[2rem] items-center gap-1.5 rounded-full border border-white/[0.08] bg-gradient-to-b from-[#3b76e3] to-[#255ac2] px-3 text-[0.82rem] font-medium text-white shadow-[0_2px_6px_-2px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:from-[#4381f0] hover:to-[#2b65d6] hover:shadow-[0_4px_10px_-2px_rgba(37,99,235,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            Start Verification
            <ArrowRight className="size-[0.85rem] opacity-80 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>
    </div>
  );
}
