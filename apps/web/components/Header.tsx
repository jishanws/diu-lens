'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/contact', label: 'Contact' },
] as const;

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize to desktop to prevent state inconsistencies
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* ── DESKTOP NAVBAR ──────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-6 z-50 mx-auto hidden w-full px-6 md:flex md:justify-center">
        <div className="flex w-full max-w-[38rem] items-center justify-between rounded-[20px] bg-[#0c121f]/30 px-7 py-3 backdrop-blur-2xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] ring-1 ring-white/[0.02]">
          {/* Logo Area */}
          <Link 
            href="/" 
            className="group flex items-center gap-2.5 opacity-90 outline-none transition-[opacity,transform] duration-300 hover:opacity-100 active:scale-[0.98]"
            aria-label="DIU Lens home"
          >
            <Image
              src="/branding/logo-v2.png"
              alt=""
              width={20}
              height={20}
              priority
              className="object-contain drop-shadow-sm"
            />
            <span className="text-[14px] font-semibold tracking-wide text-zinc-50 drop-shadow-sm">
              DIU Lens
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-7" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13.5px] font-medium text-zinc-300 outline-none transition-colors duration-300 hover:text-zinc-50 focus-visible:text-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── MOBILE NAVBAR ───────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-4 z-50 px-4 md:hidden">
        <div className="mx-auto flex w-full max-w-[38rem] items-center justify-between rounded-[20px] bg-[#0c121f]/35 px-5 py-2.5 backdrop-blur-2xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] ring-1 ring-white/[0.02]">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 opacity-95 outline-none transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/branding/logo-v2.png"
              alt=""
              width={20}
              height={20}
              priority
              className="object-contain drop-shadow-sm"
            />
            <span className="text-[14px] font-semibold tracking-wide text-zinc-50 drop-shadow-sm">
              DIU Lens
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.02] text-zinc-200 outline-none transition-colors duration-300 hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <motion.div 
              animate={{ rotate: mobileMenuOpen ? 90 : 0 }} 
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </motion.div>
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-x-4 top-[calc(100%+0.5rem)] flex flex-col gap-1 rounded-[20px] bg-[#0c121f]/85 p-3.5 backdrop-blur-3xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.02)] ring-1 ring-white/[0.02]"
              aria-label="Mobile navigation"
            >
              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 + 0.1, ease: [0.32, 0.72, 0, 1] }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-[14px] px-5 py-3.5 text-[14.5px] font-medium text-zinc-300 outline-none transition-colors duration-300 hover:bg-white/[0.04] hover:text-zinc-50 focus-visible:bg-white/[0.04] focus-visible:text-zinc-50"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
