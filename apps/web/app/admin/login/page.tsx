'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { status, login, isLoggingIn } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextPath = () => {
    if (typeof window === 'undefined') return '/admin/enrollments';
    const next = new URLSearchParams(window.location.search).get('next');
    return next || '/admin/enrollments';
  };

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(getNextPath());
    }
  }, [status, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = await login(email.trim(), password);
    if (!result.success) {
      setError(result.message || 'Invalid email or password.');
      return;
    }
    router.replace(getNextPath());
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06080a] px-4 py-10 selection:bg-[#6493b5]/20">
      
      {/* ── Secure Infrastructure Background ──────────────────────────── */}
      {/* Grid Pattern with tight central mask */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_40%_50%_at_50%_50%,black_10%,transparent_100%)]" 
      />

      {/* Tightly Focused Center Illumination */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.05)_0%,transparent_70%)]" />
      </div>

      {/* Darker Outer Edge Falloff (Controlled Vignette) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_120%_at_50%_50%,transparent_35%,#040608_100%)]" 
      />

      {/* Subtle System Details (Corners) */}
      <div className="pointer-events-none absolute left-6 top-6 sm:left-10 sm:top-10 opacity-30">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      <div className="pointer-events-none absolute right-6 top-6 sm:right-10 sm:top-10 opacity-30 rotate-90">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      <div className="pointer-events-none absolute left-6 bottom-6 sm:left-10 sm:bottom-10 opacity-30 -rotate-90">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      <div className="pointer-events-none absolute right-6 bottom-6 sm:right-10 sm:bottom-10 opacity-30 rotate-180">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      
      {/* ── Main Access Card ────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex w-full max-w-[24rem] sm:max-w-[26rem] flex-col items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Soft contained shadow for the card */}
        <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/80 p-8 sm:p-10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7),_0_0_0_1px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          
          {/* Subtle interior edge highlight */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[1.25rem] border border-white/[0.02]" />

          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <Lock className="size-4 text-[#6493b5]" />
            </div>
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[#6493b5]/80">
              Secure Admin Node
            </p>
            <h1 className="text-[1.4rem] sm:text-[1.5rem] font-medium tracking-tight text-white/95 drop-shadow-sm">
              Authorized Access
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="block text-[0.75rem] font-medium text-slate-400/90">
                Email Address
              </label>
              <div className="relative text-slate-500 transition-colors duration-300 focus-within:text-slate-300">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@diulens.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.05] bg-[#080b0f]/60 py-3 pl-10 pr-4 text-[16px] sm:text-[0.9rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all duration-300 hover:bg-[#080b0f]/80 hover:border-white/[0.08] focus:border-[#6493b5]/30 focus:bg-[#0a0e14]/90 focus:ring-4 focus:ring-[#6493b5]/[0.05] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="block text-[0.75rem] font-medium text-slate-400/90">
                Password
              </label>
              <div className="relative text-slate-500 transition-colors duration-300 focus-within:text-slate-300">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.05] bg-[#080b0f]/60 py-3 pl-10 pr-11 text-[16px] sm:text-[0.9rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all duration-300 hover:bg-[#080b0f]/80 hover:border-white/[0.08] focus:border-[#6493b5]/30 focus:bg-[#0a0e14]/90 focus:ring-4 focus:ring-[#6493b5]/[0.05] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 my-auto inline-flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6493b5]/30"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 flex items-start gap-2 rounded-xl border border-red-500/10 bg-red-500/[0.05] px-3 py-2.5"
              >
                <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-red-500/80" />
                <p className="text-[0.8rem] text-red-200/90 leading-tight">
                  {error}
                </p>
              </motion.div>
            ) : null}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-2 flex w-full h-[2.85rem] items-center justify-center gap-2 rounded-xl border border-[#6493b5]/20 bg-gradient-to-b from-[#6493b5]/90 to-[#4d728e]/90 px-6 text-[0.9rem] font-medium text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:from-[#6493b5] hover:to-[#557b98] hover:shadow-[0_4px_12px_-2px_rgba(100,147,181,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-4 animate-spin opacity-80" />
                  Authenticating…
                </>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <Link 
          href="/" 
          className="mt-6 flex items-center gap-1.5 text-[0.8rem] font-medium text-slate-500/60 transition-colors duration-300 hover:text-slate-400"
        >
          <ArrowLeft className="size-3.5 opacity-80" />
          Back to Homepage
        </Link>
      </motion.div>
    </main>
  );
}

