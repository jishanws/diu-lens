'use client';

import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect } from 'react';

type CircularProgressGuideProps = {
  totalSteps: number;
  currentStepIndex: number;
};

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

/**
 * Sweeping comet that continuously traces the active arc.
 * Three stacked motion.paths share the same pathOffset motion value:
 *   tail  — wide, very translucent (trailing glow)
 *   body  — medium, softer
 *   head  — narrow, bright + strong glow filter
 */
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
      {/* Tail — wide translucent */}
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(96,165,250,0.18)"
        strokeWidth={14}
        strokeLinecap="round"
        style={{ pathLength: 0.3, pathOffset }}
      />
      {/* Body — medium */}
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(147,197,253,0.5)"
        strokeWidth={10}
        strokeLinecap="round"
        style={{ pathLength: 0.13, pathOffset }}
      />
      {/* Head — bright, sharp glow */}
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

export function CircularProgressGuide({
  totalSteps,
  currentStepIndex,
}: CircularProgressGuideProps) {
  const size = 320;
  const cx = size / 2; // 160
  const cy = size / 2; // 160

  /*
   * Geometry rationale for -inset-4 (16px extended) container:
   *   mobile  (max-w-[16rem] = 256px): SVG = 288px → camera edge ≈ 142 SVG units
   *   desktop (max-w-[18rem] = 288px): SVG = 320px → camera edge ≈ 144 SVG units
   *   segmentR = 150  → sits  6–8 px outside the camera rim  ✓
   *   orbitR   = 161  → sits 17–19 px outside the camera rim ✓
   */
  const segmentR = 150;
  const orbitR = 161;
  const segmentSpan = 360 / totalSteps;
  const gap = 8; // degrees gap between adjacent segments
  const allDone = currentStepIndex >= totalSteps;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        {/* Bright comet head glow */}
        <filter
          id="cpg-comet-glow"
          x="-70%"
          y="-70%"
          width="240%"
          height="240%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Completed arc — crisp edge glow */}
        <filter
          id="cpg-glow-done"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Completed arc — wide bloom halo (blur only, no source) */}
        <filter
          id="cpg-bloom-done"
          x="-70%"
          y="-70%"
          width="240%"
          height="240%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
        </filter>

        {/* Active arc — breathing bloom (blur only) */}
        <filter
          id="cpg-active-bloom"
          x="-70%"
          y="-70%"
          width="240%"
          height="240%"
        >
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

      {/* ── Layer 1: Track — dim navy base for every segment ──────── */}
      {Array.from({ length: totalSteps }).map((_, i) => {
        const s = i * segmentSpan + gap / 2;
        const e = (i + 1) * segmentSpan - gap / 2;
        return (
          <path
            key={`track-${i}`}
            d={describeArc(cx, cy, segmentR, s, e)}
            fill="none"
            stroke="rgba(12,30,58,0.85)"
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })}

      {/* ── Layer 2: Completed segments — liquid sweep + teal glow ── */}
      {Array.from({ length: totalSteps }).map((_, i) => {
        if (i >= currentStepIndex) return null;
        const s = i * segmentSpan + gap / 2;
        const e = (i + 1) * segmentSpan - gap / 2;
        const d = describeArc(cx, cy, segmentR, s, e);
        return (
          <g key={`done-${i}`}>
            {/* Bloom halo — pure glow, no sharp source */}
            <motion.path
              d={d}
              fill="none"
              stroke="#34d399"
              strokeWidth={18}
              strokeLinecap="round"
              filter="url(#cpg-bloom-done)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.25 }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            />
            {/* Primary filled arc */}
            <motion.path
              d={d}
              fill="none"
              stroke="#34d399"
              strokeWidth={8}
              strokeLinecap="round"
              filter="url(#cpg-glow-done)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.92 }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            />
            {/* Cyan specular highlight on top */}
            <motion.path
              d={d}
              fill="none"
              stroke="#6ee7b7"
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{
                duration: 0.55,
                delay: 0.06,
                ease: [0.32, 0.72, 0, 1],
              }}
            />
          </g>
        );
      })}

      {/* ── Layer 3: Active segment — breathing glow + comet ─────── */}
      {!allDone &&
        (() => {
          const s = currentStepIndex * segmentSpan + gap / 2;
          const e = (currentStepIndex + 1) * segmentSpan - gap / 2;
          const d = describeArc(cx, cy, segmentR, s, e);
          return (
            <g key={`active-${currentStepIndex}`}>
              {/* Breathing bloom pulse */}
              <motion.path
                d={d}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={22}
                strokeLinecap="round"
                filter="url(#cpg-active-bloom)"
                animate={{ opacity: [0.05, 0.25, 0.05] }}
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
                stroke="rgba(59,130,246,0.18)"
                strokeWidth={6}
                strokeLinecap="round"
              />
              {/* Sweeping comet */}
              <ActiveComet d={d} />
            </g>
          );
        })()}
    </svg>
  );
}
