'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixed top-6 inset-x-0 z-50 flex w-full justify-center px-4">
      <header className="relative flex h-[3.25rem] w-full max-w-[50rem] items-center justify-between rounded-full border border-white/[0.03] bg-[#0a1120]/30 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_4px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-lg transition-all duration-300">
        
        <div className="flex items-center gap-1.5 sm:gap-2 pl-2">
          <div className="flex size-[1.85rem] sm:size-[2.15rem] items-center justify-center rounded-[0.55rem] sm:rounded-[0.65rem] border border-white/[0.06] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Image
              src="/branding/logo.png"
              alt="DIU Lens logo"
              width={40}
              height={40}
              priority
              className="size-[1.8rem] sm:size-[2.1rem] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            />
          </div>
          <span className="text-[0.85rem] sm:text-[0.95rem] font-medium tracking-wide text-slate-100">
            DIU Lens
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
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
        </nav>

        <div className="flex items-center gap-2 pr-1">
          <Link
            href="#start-verification"
            className="group flex h-[2rem] items-center gap-1.5 rounded-full border border-white/[0.08] bg-gradient-to-b from-[#3b76e3] to-[#255ac2] px-3 text-[0.82rem] font-medium text-white shadow-[0_2px_6px_-2px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:from-[#4381f0] hover:to-[#2b65d6] hover:shadow-[0_4px_10px_-2px_rgba(37,99,235,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            <span className="hidden sm:inline">Start Verification</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="size-[0.85rem] opacity-80 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          
          <button
            type="button"
            className="flex size-[2rem] items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-slate-300 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-[4rem] inset-x-0 flex flex-col gap-1.5 rounded-[32px] border border-white/[0.06] bg-[#04080f]/[0.96] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.3)] [backdrop-filter:blur(48px)_saturate(180%)] md:hidden">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-[0.95rem] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-[0.95rem] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
            >
              How It Works
            </Link>
          </div>
        )}
      </header>
    </div>
  );
}
