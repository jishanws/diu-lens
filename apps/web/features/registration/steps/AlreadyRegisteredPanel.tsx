'use client';

import { motion } from 'framer-motion';

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
    const COUNT = 14;

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
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
      className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.02] bg-gradient-to-b from-[#0d1728]/40 via-[#0b1422]/50 to-[#0d1728]/40 px-6 pb-10 pt-4 text-center backdrop-blur-md sm:px-8 sm:pb-12 sm:pt-6"
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
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#6493b5]/10 to-transparent"
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
          id="already-registered-done"
          type="button"
          variant="outline"
          onClick={onDone}
          className="group/button flex w-[200px] items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-[1.3rem] text-[0.9rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:border-white/[0.12] hover:bg-white/[0.05] active:scale-[0.98]"
        >
          <span>Back to Home</span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
