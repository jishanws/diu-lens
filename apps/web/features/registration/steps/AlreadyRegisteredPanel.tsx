'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

type AlreadyRegisteredPanelProps = {
  studentId?: string;
  studentName?: string;
  onDone?: () => void;
};

/** Minimal floating particle drawn on a canvas overlay. */
function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    type Particle = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
    };

    const COLORS = ['#34d399', '#06b6d4', '#818cf8', '#a78bfa', '#67e8f9'];
    const COUNT = 28;

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.2 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.38,
      vy: -0.18 - Math.random() * 0.32,
      alpha: 0.15 + Math.random() * 0.55,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // wrap around
        if (p.y < -p.r) p.y = H + p.r;
        if (p.x < -p.r) p.x = W + p.r;
        if (p.x > W + p.r) p.x = -p.r;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [canvasRef]);
}

export function AlreadyRegisteredPanel({
  studentId,
  studentName,
  onDone,
}: AlreadyRegisteredPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useParticles(canvasRef);

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 via-[#0a1628]/80 to-cyan-950/30 px-6 py-8 text-center shadow-[0_0_60px_-10px_rgba(52,211,153,0.18)] backdrop-blur-md sm:px-8 sm:py-10"
      initial={{ opacity: 0, scale: 0.93, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Top ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-500/10 to-transparent"
      />

      {/* Animated check ring */}
      <div className="relative mx-auto mb-6 flex size-20 items-center justify-center sm:size-24">
        {/* Pulsing outer ring */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-emerald-400/30"
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Second ring */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-2 rounded-full border border-emerald-400/20"
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 2.8, delay: 0.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Solid centre */}
        <motion.div
          className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 ring-1 ring-emerald-400/30 sm:size-16"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.18, duration: 0.48, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Glow blob */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          >
            <CheckCircle2 className="relative size-7 text-emerald-300 sm:size-8" strokeWidth={1.8} />
          </motion.div>
        </motion.div>
      </div>

      {/* Sparkles badge */}
      <motion.div
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-medium tracking-wider text-emerald-300 uppercase"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.32 }}
      >
        <Sparkles className="size-3" aria-hidden="true" />
        Already Enrolled
      </motion.div>

      {/* Text */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.34 }}
      >
        <h2 className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.5rem]">
          Congratulations{studentName ? ',' : '!'}
          {studentName && (
            <motion.span
              className="mt-1 block bg-gradient-to-r from-emerald-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.4 }}
            >
              {studentName}!
            </motion.span>
          )}
          {!studentName && ' 🎉'}
        </h2>
        <p className="mx-auto max-w-[30ch] text-[0.88rem] leading-[1.6] text-slate-300">
          Your Face ID registration is already completed.
          {studentId && (
            <span className="mt-2 block font-mono text-[0.85rem] tracking-wide text-emerald-400/80">
              Student ID: {studentId}
            </span>
          )}
        </p>
        <p className="mx-auto max-w-[32ch] text-[0.78rem] leading-[1.55] text-slate-400">
          Your biometric identity has been securely enrolled in DIU Lens.
          You can now use all verification services.
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        aria-hidden="true"
        className="mx-auto my-6 h-px w-2/3 bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.62, duration: 0.36 }}
      />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.3 }}
      >
        <Button
          id="already-registered-done"
          type="button"
          onClick={onDone}
          className="landing-button-bg landing-cta w-full gap-2 px-6 text-white"
        >
          Back to Home
        </Button>
      </motion.div>
    </motion.div>
  );
}
