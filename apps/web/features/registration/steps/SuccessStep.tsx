'use client';

import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

type SuccessStepProps = {
  onDone?: () => void;
};

/** Fires a premium, multi-origin confetti burst — runs only once. */
function useConfettiBurst() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    console.log('[enrollment-success] triggering confetti burst');

    const baseOpts: confetti.Options = {
      startVelocity: 30,
      spread: 70,
      ticks: 80,
      zIndex: 9999,
      colors: ['#34d399', '#06b6d4', '#818cf8', '#a78bfa', '#f9a8d4', '#fbbf24'],
      shapes: ['circle', 'square'],
      scalar: 0.9,
      gravity: 0.9,
    };

    // Left origin
    confetti({ ...baseOpts, origin: { x: 0.2, y: 0.55 }, angle: 60, particleCount: 55 });

    // Right origin
    window.setTimeout(() => {
      confetti({ ...baseOpts, origin: { x: 0.8, y: 0.55 }, angle: 120, particleCount: 55 });
    }, 120);

    // Centre top burst
    window.setTimeout(() => {
      confetti({
        ...baseOpts,
        origin: { x: 0.5, y: 0.42 },
        angle: 90,
        particleCount: 40,
        spread: 100,
        startVelocity: 22,
      });
    }, 280);

    return () => {
      // canvas-confetti cleans up its own canvas; nothing to teardown.
    };
  }, []);
}

/** Lightweight ambient floating particles on the card background. */
function useAmbientParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    type P = { x: number; y: number; r: number; vx: number; vy: number; alpha: number; color: string };
    const COLORS = ['#34d399', '#06b6d4', '#818cf8', '#67e8f9', '#a78bfa'];
    const particles: P[] = Array.from({ length: 32 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.0 + Math.random() * 2.0,
      vx: (Math.random() - 0.5) * 0.34,
      vy: -0.14 - Math.random() * 0.28,
      alpha: 0.12 + Math.random() * 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
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

export function SuccessStep({ onDone }: SuccessStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useConfettiBurst();
  useAmbientParticles(canvasRef);

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 via-[#060e1f]/85 to-indigo-950/30 px-6 py-8 text-center shadow-[0_0_80px_-12px_rgba(6,182,212,0.2)] backdrop-blur-md sm:px-8 sm:py-10"
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.44, ease: [0.32, 0.72, 0, 1] }}
    >
      {/* Ambient particles */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Top glow sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-cyan-500/12 to-transparent"
      />
      {/* Bottom glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-indigo-600/8 to-transparent"
      />

      {/* ── Animated check ring ── */}
      <div className="relative mx-auto mb-6 flex size-24 items-center justify-center sm:size-28">
        {/* Outermost slow pulse */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-cyan-400/20"
          animate={{ scale: [1, 1.22, 1], opacity: [0.4, 0.08, 0.4] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Mid ring */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-2 rounded-full border border-cyan-400/18"
          animate={{ scale: [1, 1.14, 1], opacity: [0.35, 0.06, 0.35] }}
          transition={{ duration: 3.2, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Inner ring — rotating shimmer */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-4 rounded-full border border-dashed border-cyan-400/15"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />

        {/* Centre glowing disc */}
        <motion.div
          className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/25 to-indigo-500/20 ring-1 ring-cyan-400/25 sm:size-18"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.52, ease: [0.32, 0.72, 0, 1] }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-cyan-400/15 blur-lg"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
          >
            <CheckCircle2
              className="relative size-8 text-cyan-300 sm:size-9"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Badge */}
      <motion.div
        className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[0.68rem] font-medium tracking-wider text-cyan-300 uppercase"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46, duration: 0.3 }}
      >
        <Sparkles className="size-3" aria-hidden="true" />
        Enrollment Complete
      </motion.div>

      {/* Text block */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.54, duration: 0.34 }}
      >
        <h2 className="text-[1.38rem] font-semibold tracking-tight text-white sm:text-[1.55rem]">
          Congratulations! 🎉
        </h2>
        <p className="mx-auto max-w-[32ch] text-[0.88rem] leading-[1.62] text-slate-300">
          Your Face ID registration has been completed successfully.
        </p>
        <p className="mx-auto max-w-[34ch] text-[0.78rem] leading-[1.55] text-slate-400">
          You are now securely enrolled in DIU Lens and can use all biometric
          verification services.
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        aria-hidden="true"
        className="mx-auto my-6 h-px w-2/3 bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.68, duration: 0.36 }}
      />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.76, duration: 0.3 }}
      >
        <Button
          id="enrollment-success-done"
          type="button"
          onClick={onDone}
          className="landing-button-bg landing-cta w-full gap-2 px-6 text-white"
        >
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}
