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
      <header className="fixed inset-x-0 top-6 z-50 mx-auto hidden w-full px-6 md:flex md:justify-center lg:px-8">
        <div className="flex w-full max-w-[36rem] lg:max-w-[42rem] items-center justify-between rounded-[20px] bg-[#0c121f]/30 px-6 lg:px-8 py-[0.85rem] backdrop-blur-2xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] ring-1 ring-white/[0.02]">
          {/* Logo Area */}
          <Link 
            href="/" 
            className="group flex items-center gap-2.5 opacity-90 outline-none transition-[opacity,transform] duration-300 hover:opacity-100 active:scale-[0.98] md:p-1 lg:p-0"
            aria-label="DIU Lens home"
          >
            <Image
              src="/branding/logo-v2.png"
              alt=""
              width={20}
              height={20}
              priority
              className="object-contain drop-shadow-sm md:w-[1.35rem] md:h-[1.35rem] lg:w-[20px] lg:h-[20px]"
            />
            <span className="mt-[1px] text-[0.95rem] font-medium tracking-[0.02em] text-white/95 drop-shadow-sm md:text-[1rem] lg:text-[0.95rem]">
              DIU Lens
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 lg:gap-8" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[0.85rem] font-medium tracking-[0.01em] text-slate-300/80 outline-none transition-colors duration-300 hover:text-white focus-visible:text-white md:px-2 md:py-1 lg:px-0 lg:py-0 md:text-[0.9rem] lg:text-[0.85rem]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── MOBILE NAVBAR ───────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Cinematic Translucent Navbar Surface (Clean, restrained) */}
        <div 
          className="fixed inset-x-0 top-0 z-40 h-[76px] bg-[#070b14]/35 backdrop-blur-[12px] border-b border-white/[0.02] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)] transition-opacity duration-500" 
          style={{ opacity: mobileMenuOpen ? 0 : 1 }} 
        />
        
        <header className="fixed inset-x-0 top-0 z-50 flex h-[76px] w-full items-center px-5">
          <div className="relative flex w-full items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center gap-2.5 pl-1 outline-none transition-opacity duration-300 hover:opacity-80"
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
              <span className="text-[1rem] font-medium tracking-[0.02em] text-white/95">
                DIU Lens
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative flex h-10 w-10 items-center justify-center outline-none group mr-1"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              <div className="relative flex flex-col justify-center items-end w-6 h-6 opacity-90 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <motion.span 
                  animate={mobileMenuOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -3.5 }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute block h-[1.5px] w-[20px] bg-white origin-center"
                />
                <motion.span 
                  animate={mobileMenuOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 3.5 }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute block h-[1.5px] w-[20px] bg-white origin-center"
                />
              </div>
            </button>
          </div>
        </header>

        {/* Fullscreen Atmospheric Menu Panel (More opaque, less foggy) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-0 z-40 bg-[#070b14]/90 backdrop-blur-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              <nav className="relative flex h-full flex-col justify-center px-10 pb-20" aria-label="Mobile navigation">
                <div className="flex flex-col gap-8">
                  {navItems.map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      transition={{ duration: 0.5, delay: i * 0.06 + 0.1, ease: [0.32, 0.72, 0, 1] }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="group flex items-center gap-5 text-[1.35rem] font-light tracking-[0.02em] text-white/70 outline-none transition-colors duration-400 hover:text-white focus-visible:text-white"
                      >
                        <span className="text-white/30 transition-colors duration-400 group-hover:text-white/50 text-[0.7rem] font-mono tracking-[0.15em]">
                          0{i + 1}
                        </span>
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
