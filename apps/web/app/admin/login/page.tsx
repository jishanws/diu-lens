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
    if (next && next.startsWith('/admin/') && !next.includes('://')) {
      return next;
    }
    return '/admin/enrollments';
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
    <main className="landing-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 selection:bg-primary/20">
      
      {/* ── Secure Infrastructure Background ──────────────────────────── */}
      {/* Grid Pattern with tight central mask */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.004)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.004)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_20%,transparent_100%)]" 
      />

      {/* Subtle Layered Radial Glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.85]">
        <div className="absolute h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.05)_0%,transparent_70%)] blur-[60px]" />
        <div className="absolute h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.02)_0%,transparent_100%)] blur-[100px]" />
      </div>

      {/* Darker Outer Edge Falloff (Controlled Vignette) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_120%_at_50%_50%,transparent_35%,#040608_100%)]" 
      />


      {/* ── Main Access Card ────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex w-full max-w-[25rem] sm:max-w-[28rem] flex-col items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Refined Access Card */}
        <div className="relative w-full overflow-hidden rounded-[1.25rem] border border-white/[0.045] bg-[#0d1728]/80 backdrop-blur-xl p-9 sm:p-11 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.035)]">
          
          {/* Subtle interior edge highlight */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[1.25rem] border border-white/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]" />

          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-slate-100">
              Admin Console
            </h1>
            <p className="mt-2 text-[0.82rem] text-slate-400">
              Authorized personnel only
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Input */}
            <div className="relative text-slate-500/70 transition-colors duration-300 focus-within:text-slate-300">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 transition-colors" />
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@diulens.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/[0.06] bg-[#08111f]/60 pl-10 pr-4 text-[0.875rem] text-slate-200 placeholder-slate-500/70 outline-none transition-all duration-200 focus:border-slate-500/40 focus:bg-[#08111f]/90 focus:ring-2 focus:ring-slate-500/10"
              />
            </div>

            {/* Password Input */}
            <div className="relative text-slate-500/70 transition-colors duration-300 focus-within:text-slate-300">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 transition-colors" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/[0.06] bg-[#08111f]/60 pl-10 pr-11 text-[0.875rem] text-slate-200 placeholder-slate-500/70 outline-none transition-all duration-200 focus:border-slate-500/40 focus:bg-[#08111f]/90 focus:ring-2 focus:ring-slate-500/10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto inline-flex size-8 items-center justify-center rounded-lg text-slate-500/80 transition-colors hover:bg-white/5 hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
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
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 font-semibold text-slate-900 transition-all duration-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-4 animate-spin text-slate-900" />
                  Signing In…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-5 flex w-full justify-center">
          <Link 
            href="/" 
            className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-400"
          >
            <ArrowLeft className="size-3" />
            Back to Homepage
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

