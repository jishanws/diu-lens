'use client';

import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect } from 'react';
import type { VerificationAngle } from '@/features/registration/verification/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DirectionCompletionMap = Partial<Record<string, boolean>>;

type CircularProgressGuideProps = {
  /** Which directional angles have been successfully captured */
  completedDirections: DirectionCompletionMap;
  /** The angle currently being captured */
  activeDirection: VerificationAngle;
};

// ── Fixed arc positions — anatomy of the face ─────────────────────────────────
// 0° = top, 90° = right, 180° = bottom, 270° = left (clockwise).
// Each arc is 80°, gaps are 10°. Total = 4×80 + 4×10 = 360°.

const DIRECTION_ARCS = [
  { key: 'up',    startDeg: -40, endDeg:  40 },   // top arc
  { key: 'right', startDeg:  50, endDeg: 130 },   // right arc
  { key: 'down',  startDeg: 140, endDeg: 220 },   // bottom arc
  { key: 'left',  startDeg: 230, endDeg: 310 },   // left arc
] as const;

const DIRECTIONAL_KEYS = DIRECTION_ARCS.map((a) => a.key);

// ── Geometry helpers ──────────────────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const s = polarToCartesian(cx, cy, r, endAngle);
  const e = polarToCartesian(cx, cy, r, startAngle);
  const la = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${la} 0 ${e.x} ${e.y}`;
}

// ── ActiveComet — sweeping light trace on the currently active arc ─────────────

function ActiveComet({ d }: { d: string }) {
  const pathOffset = useMotionValue(0);

  useEffect(() => {
    const ctrl = animate(pathOffset, 1, {
      duration: 1.8,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'linear',
    });
    return ctrl.stop;
  }, [pathOffset]);

  return (
    <>
      {/* Tail — wide, very translucent trailing glow */}
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(96,165,250,0.18)"
        strokeWidth={14}
        strokeLinecap="round"
        style={{ pathLength: 0.3, pathOffset }}
      />
      {/* Body — medium brightness */}
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(147,197,253,0.5)"
        strokeWidth={10}
        strokeLinecap="round"
        style={{ pathLength: 0.13, pathOffset }}
      />
      {/* Head — sharp, bright with strong glow filter */}
      <motion.path
        d={d}
        fill="none"
        stroke="#dbeafe"
        strokeWidth={9}
        strokeLinecap="round"
        filter="url(#cpg-comet-glow)"
        style={{ pathLength: 0.05, pathOffset }}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CircularProgressGuide({
  completedDirections,
  activeDirection,
}: CircularProgressGuideProps) {
  const size = 320;
  const cx = size / 2; // 160
  const cy = size / 2; // 160

  /*
   * Geometry: container is -inset-4 (16px extended beyond camera on each side).
   *   mobile  max-w-[16rem]=256px → SVG=288px, camera edge ≈ 142 SVG units
   *   desktop max-w-[18rem]=288px → SVG=320px, camera edge ≈ 144 SVG units
   *   segmentR=150  →  6–8 px OUTSIDE the camera rim  ✓
   *   orbitR  =161  → 17–19 px outside the camera rim ✓
   */
  const segmentR = 150;
  const orbitR = 161;

  const isDirectional = DIRECTIONAL_KEYS.includes(activeDirection as never);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        {/* Bright comet head glow */}
        <filter id="cpg-comet-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Completed arc — crisp edge glow */}
        <filter id="cpg-glow-done" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Completed arc — wide ambient bloom (blur only, no source) */}
        <filter id="cpg-bloom-done" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
        </filter>
        {/* Active arc — breathing bloom */}
        <filter id="cpg-active-bloom" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>

      {/* Counter-rotating dashed orbit decoration */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`-360 ${cx} ${cy}`}
          dur="22s"
          repeatCount="indefinite"
        />
        <circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke="rgba(59,130,246,0.07)"
          strokeWidth="1.5"
          strokeDasharray="4 22"
          strokeLinecap="round"
        />
      </g>

      {/* Static outermost ghost ring */}
      <circle
        cx={cx}
        cy={cy}
        r={orbitR + 6}
        fill="none"
        stroke="rgba(59,130,246,0.025)"
        strokeWidth="1"
      />

      {/* Full-ring gentle pulse when active angle is non-directional (front / natural_front) */}
      {!isDirectional && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={segmentR}
          fill="none"
          stroke="rgba(59,130,246,0.15)"
          strokeWidth={6}
          filter="url(#cpg-active-bloom)"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Render each directional arc independently ───────────────────── */}
      {DIRECTION_ARCS.map(({ key, startDeg, endDeg }) => {
        const d = describeArc(cx, cy, segmentR, startDeg, endDeg);
        const isCompleted = !!completedDirections[key];
        const isActive = isDirectional && activeDirection === key && !isCompleted;

        return (
          <g key={key}>
            {/* Track arc — dim navy base, always visible */}
            <path
              d={d}
              fill="none"
              stroke="rgba(12,30,58,0.85)"
              strokeWidth={5}
              strokeLinecap="round"
            />

            {/* ── COMPLETED: teal sweep fills in on mount ── */}
            {isCompleted && (
              <g>
                {/* Wide bloom halo (pure blur, no sharp source) */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={18}
                  strokeLinecap="round"
                  filter="url(#cpg-bloom-done)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                />
                {/* Primary teal arc */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={8}
                  strokeLinecap="round"
                  filter="url(#cpg-glow-done)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.92 }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                />
                {/* Cyan specular highlight on top edge */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#6ee7b7"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.06,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                />
              </g>
            )}

            {/* ── ACTIVE: breathing bloom + dim base + sweeping comet ── */}
            {isActive && (
              <g key={`active-${key}`}>
                {/* Breathing bloom pulse */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={22}
                  strokeLinecap="round"
                  filter="url(#cpg-active-bloom)"
                  animate={{ opacity: [0.05, 0.28, 0.05] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* Dim arc base */}
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(59,130,246,0.2)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                {/* Comet sweep */}
                <ActiveComet d={d} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
