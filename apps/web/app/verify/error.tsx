'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // We only log the error signature to the console to prevent data leakage.
    // Real applications would use a service like Sentry here.
    console.error('Unhandled runtime error:', error.message);
  }, [error]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#06080a] px-4 py-10 selection:bg-rose-500/20">
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_40%_50%_at_50%_50%,black_10%,transparent_100%)]" 
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.05)_0%,transparent_70%)]" />
      </div>
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_120%_at_50%_50%,transparent_35%,#040608_100%)]" 
      />

      <motion.div
        className="relative z-10 flex w-full max-w-[28rem] flex-col items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/80 p-8 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7),_0_0_0_1px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[1.25rem] border border-white/[0.02]" />

          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-rose-500/10 bg-rose-500/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <AlertCircle className="size-5 text-rose-500/90" />
            </div>
            <h1 className="text-[1.2rem] font-medium tracking-tight text-white/95">
              System Fault Detected
            </h1>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-slate-400">
              A critical process has encountered an unexpected error. The system has safely halted the operation to prevent data corruption.
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-rose-500/10 bg-rose-500/[0.02] p-4">
            <p className="font-mono text-[0.7rem] text-rose-400/80 break-words">
              {error.message || 'Unknown internal fault'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="flex flex-1 h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 text-[0.85rem] font-medium text-slate-200 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <RotateCcw className="size-4" />
              Attempt Recovery
            </button>
            <Link
              href="/"
              className="flex flex-1 h-[2.75rem] items-center justify-center rounded-xl bg-[#6493b5]/10 px-4 text-[0.85rem] font-medium text-[#6493b5] transition-colors hover:bg-[#6493b5]/20"
            >
              Return to Safe Mode
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
