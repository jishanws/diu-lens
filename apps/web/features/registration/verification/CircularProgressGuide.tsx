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
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/** Sweeping comet that traces the active arc segment */
function ActiveComet({ d }: { d: string }) {
  const offset = useMotionValue(0);

  useEffect(() => {
    const controls = animate(offset, 1, {
      duration: 2.4,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'linear',
    });
    return controls.stop;
  }, [offset]);

  return (
    <>
      {/* Wide, translucent trailing tail */}
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(96,165,250,0.22)"
        strokeWidth={10}
        strokeLinecap="round"
        style={{
          pathLength: 0.22,
          pathOffset: offset,
        }}
      />
      {/* Bright comet head with glow */}
      <motion.path
        d={d}
        fill="none"
        stroke="#bfdbfe"
        strokeWidth={9}
        strokeLinecap="round"
        filter="url(#cpg-glow-active)"
        style={{
          pathLength: 0.07,
          pathOffset: offset,
        }}
      />
    </>
  );
}

export function CircularProgressGuide({
  totalSteps,
  currentStepIndex,
}: CircularProgressGuideProps) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const segmentR = 138;
  const orbitR = 153;
  const segmentSpan = 360 / totalSteps;
  const gap = 9;
  const allDone = currentStepIndex >= totalSteps;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        {/* Strong comet glow */}
        <filter id="cpg-glow-active" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Soft glow for completed segments */}
        <filter id="cpg-glow-done" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Extra bloom layer for completed */}
        <filter id="cpg-bloom-done" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Slowly rotating dashed orbit decoration */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`360 ${cx} ${cy}`}
          dur="20s"
          repeatCount="indefinite"
        />
        <circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke="rgba(59,130,246,0.06)"
          strokeWidth="1.5"
          strokeDasharray="3 22"
          strokeLinecap="round"
        />
      </g>

      {/* Static ghost outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={orbitR + 7}
        fill="none"
        stroke="rgba(59,130,246,0.03)"
        strokeWidth="1"
      />

      {/* ── Layer 1: Track arcs (dim base for every segment) ── */}
      {Array.from({ length: totalSteps }).map((_, index) => {
        const startAngle = index * segmentSpan + gap / 2;
        const endAngle = (index + 1) * segmentSpan - gap / 2;
        return (
          <path
            key={`track-${index}`}
            d={describeArc(cx, cy, segmentR, startAngle, endAngle)}
            fill="none"
            stroke="rgba(18,38,68,0.7)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        );
      })}

      {/* ── Layer 2: Completed segments — liquid sweep in ── */}
      {Array.from({ length: totalSteps }).map((_, index) => {
        if (index >= currentStepIndex) return null;
        const startAngle = index * segmentSpan + gap / 2;
        const endAngle = (index + 1) * segmentSpan - gap / 2;
        const d = describeArc(cx, cy, segmentR, startAngle, endAngle);
        return (
          <g key={`done-${index}`}>
            {/* Bloom glow (wide, very soft) */}
            <motion.path
              d={d}
              fill="none"
              stroke="#34d399"
              strokeWidth={14}
              strokeLinecap="round"
              filter="url(#cpg-bloom-done)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.18 }}
              transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
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
              animate={{ pathLength: 1, opacity: 0.88 }}
              transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
            />
          </g>
        );
      })}

      {/* ── Layer 3: Active segment — dim base + sweeping comet ── */}
      {!allDone && (() => {
        const startAngle = currentStepIndex * segmentSpan + gap / 2;
        const endAngle = (currentStepIndex + 1) * segmentSpan - gap / 2;
        const d = describeArc(cx, cy, segmentR, startAngle, endAngle);
        return (
          <g key={`active-${currentStepIndex}`}>
            {/* Dim active arc base */}
            <path
              d={d}
              fill="none"
              stroke="rgba(59,130,246,0.2)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Comet sweep animation */}
            <ActiveComet d={d} />
          </g>
        );
      })()}
    </svg>
  );
}
