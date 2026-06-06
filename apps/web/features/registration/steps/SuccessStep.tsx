'use client';

import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

type SuccessStepProps = {
  studentId?: string;
  studentName?: string;
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
    const COLORS = ['#6493b5', '#7BA8C0', '#D0DEE8'];
    const particles: P[] = Array.from({ length: 15 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.0 + Math.random() * 2.0,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.15 - Math.random() * 0.25,
      alpha: 0.02 + Math.random() * 0.06,
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

export function SuccessStep({ studentId, studentName, onDone }: SuccessStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useConfettiBurst();
  useAmbientParticles(canvasRef);

  return (
    <motion.div
      className="relative overflow-hidden rounded-[1.75rem] border border-[#6493b5]/5 bg-gradient-to-b from-[#0d1728]/40 via-[#0b1422]/50 to-[#0d1728]/40 px-6 pb-10 pt-4 text-center backdrop-blur-md sm:px-8 sm:pb-12 sm:pt-6"
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
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#6493b5]/10 to-transparent"
      />
      {/* Bottom glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#6493b5]/5 to-transparent"
      />

      {/* Unified Typography Hero Block */}
      <motion.div
        className="mt-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {studentName && (
          <div className="text-[1.85rem] font-medium leading-tight tracking-tight text-white sm:text-[2.1rem]">
            {studentName}
          </div>
        )}
        {studentId && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.9rem] font-mono text-slate-400">
            <span>Student ID</span>
            <span className="opacity-40">•</span>
            <span className="tracking-wide">{studentId}</span>
          </div>
        )}
        <h2 className="mt-4 text-[0.7rem] font-medium tracking-widest text-[#6493b5]/80 uppercase">
          Verification Successful
        </h2>
      </motion.div>

      {/* Supporting Description */}
      <motion.p
        className="mx-auto mt-2 max-w-[24ch] text-[0.85rem] leading-relaxed text-slate-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Your identity has been successfully verified and enrolled. You are ready to use campus services.
      </motion.p>



      {/* CTA */}
      <motion.div
        className="mt-6 flex justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Button
          id="enrollment-success-done"
          type="button"
          variant="outline"
          onClick={onDone}
          className="group/button flex w-[200px] items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-[1.3rem] text-[0.9rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:border-white/[0.12] hover:bg-white/[0.05] active:scale-[0.98]"
        >
          <span>Done</span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
