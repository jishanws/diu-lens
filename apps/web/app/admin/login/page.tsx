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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06080a] px-4 py-10 selection:bg-[#6493b5]/20">
      
      {/* ── Secure Infrastructure Background ──────────────────────────── */}
      {/* Grid Pattern with tight central mask */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_20%,transparent_100%)]" 
      />

      {/* Subtle Layered Radial Glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-80">
        <div className="absolute h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.08)_0%,transparent_70%)] blur-[40px]" />
        <div className="absolute h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.04)_0%,transparent_100%)] blur-[80px]" />
      </div>

      {/* Darker Outer Edge Falloff (Controlled Vignette) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_120%_at_50%_50%,transparent_35%,#040608_100%)]" 
      />


      {/* ── Main Access Card ────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex w-full max-w-[24rem] sm:max-w-[26rem] flex-col items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Refined Access Card */}
        <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-[1.25rem] border border-white/[0.06] bg-[#0a0e14]/90 p-7 sm:p-9 shadow-[0_20px_40px_-12px_rgba(0,0,0,1),0_0_20px_rgba(100,147,181,0.03)] backdrop-blur-2xl">
          
          {/* Subtle interior edge highlight */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[1.25rem] border border-white/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]" />

          {/* Header */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <Lock className="size-[1.125rem] text-[#6493b5]" />
            </div>
            <p className="mb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[#6493b5]">
              Secure Admin Node
            </p>
            <h1 className="text-2xl font-medium tracking-tight text-white/90 drop-shadow-sm">
              Authorized Access
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="admin-email" className="block text-[0.75rem] font-medium text-slate-400/90 pl-1">
                Email Address
              </label>
              <div className="relative text-slate-500 transition-colors duration-300 focus-within:text-slate-300">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 transition-colors" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@diulens.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-[16px] sm:text-[0.9rem] text-slate-200 placeholder:text-slate-500/70 outline-none transition-all duration-300 hover:bg-black/30 hover:border-white/[0.12] focus:border-[#6493b5]/50 focus:bg-[#0a0e14]/90 focus:ring-[3px] focus:ring-[#6493b5]/20 focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-[0.75rem] font-medium text-slate-400/90 pl-1">
                Password
              </label>
              <div className="relative text-slate-500 transition-colors duration-300 focus-within:text-slate-300">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 transition-colors" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-black/20 pl-10 pr-11 text-[16px] sm:text-[0.9rem] text-slate-200 placeholder:text-slate-500/70 outline-none transition-all duration-300 hover:bg-black/30 hover:border-white/[0.12] focus:border-[#6493b5]/50 focus:bg-[#0a0e14]/90 focus:ring-[3px] focus:ring-[#6493b5]/20 focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-1.5 my-auto inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6493b5]/50"
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
              className="mt-2 flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-[#6493b5]/40 bg-gradient-to-b from-[#6493b5]/90 to-[#4a6f8a]/90 px-6 text-[0.9rem] font-medium text-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 hover:border-[#6493b5]/60 hover:from-[#6493b5] hover:to-[#527a97] hover:text-white hover:shadow-[0_4px_12px_-2px_rgba(100,147,181,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
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
          className="mt-8 flex items-center gap-1.5 text-[0.8rem] font-medium text-slate-400 transition-all duration-300 hover:text-slate-200 hover:-translate-x-0.5"
        >
          <ArrowLeft className="size-3.5 opacity-80" />
          Back to Homepage
        </Link>
      </motion.div>
    </main>
  );
}

