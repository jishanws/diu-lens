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
    <main className="landing-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Exact Homepage Background System */}
      <div aria-hidden="true" className="landing-vignette pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="landing-grid-overlay pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="landing-glow-top-left pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="landing-glow-bottom-right pointer-events-none absolute inset-0" />

      <motion.div
        className="relative z-10 flex w-full max-w-[26rem] flex-col items-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[#16191f]/65 p-10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-12">
          {/* Subtle Top Glow */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.35em] text-slate-500">
              DIU Lens
            </p>
            <h1 className="text-[1.55rem] font-medium tracking-tight text-white">
              Secure Admin Access
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="admin-email" className="ml-1 block text-[0.8rem] font-medium text-slate-400">
                Email Address
              </label>
              <div className="relative text-slate-500 focus-within:text-white transition-colors duration-300">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-colors" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@diulens.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-[#0b1422]/40 py-4 pl-12 pr-4 text-[16px] sm:text-[0.95rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all focus:border-white/20 focus:bg-[#0b1422]/60 focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="admin-password" className="ml-1 block text-[0.8rem] font-medium text-slate-400">
                Password
              </label>
              <div className="relative text-slate-500 focus-within:text-white transition-colors duration-300">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-colors" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-[#0b1422]/40 py-4 pl-12 pr-12 text-[16px] sm:text-[0.95rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all focus:border-white/20 focus:bg-[#0b1422]/60 focus:ring-1 focus:ring-white/20"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3.5 my-auto inline-flex size-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-[1.1rem]" /> : <Eye className="size-[1.1rem]" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-3.5 text-[0.85rem] text-rose-300"
              >
                {error}
              </motion.div>
            ) : null}

            {/* Submit Button - Exact Homepage CTA Match (Scaled up for form) */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-4 flex w-full h-[3.25rem] items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-gradient-to-b from-[#6493b5] to-[#527c9a] px-6 text-[0.95rem] font-medium text-white shadow-[0_2px_6px_-2px_rgba(100,147,181,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:from-[#75a4c6] hover:to-[#6493b5] hover:shadow-[0_4px_10px_-2px_rgba(100,147,181,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin opacity-80" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Back to Homepage */}
        <Link 
          href="/" 
          className="mt-8 flex items-center gap-2 text-[0.85rem] font-medium text-slate-500 transition-all hover:text-slate-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
        >
          <ArrowLeft className="size-4 opacity-80" />
          Back to Homepage
        </Link>
      </motion.div>
    </main>
  );
}
