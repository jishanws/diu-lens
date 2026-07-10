'use client';

import { motion } from 'framer-motion';
import type { VerificationAngle } from '@/features/registration/verification/types';
import type { PoseValidationState } from '@/features/registration/capture/types';

type CircularProgressGuideProps = {
  activeDirection: VerificationAngle;
  poseState?: PoseValidationState;
  captureCounts: Record<VerificationAngle, number>;
  requiredCount: number;
};

/** Maps each direction to the centre-angle of its arc (SVG 0° = 3 o'clock). */
const DIRECTION_SEGMENT_ANGLES = {
  up: -90,
  right: 0,
  down: 90,
  left: 180,
} as const;

type DirectionalAngle = keyof typeof DIRECTION_SEGMENT_ANGLES;
const DIRECTIONAL_ANGLES = Object.keys(DIRECTION_SEGMENT_ANGLES) as DirectionalAngle[];

/** Sweep of each directional arc in degrees — wide enough to feel deliberate, tight enough to be distinct. */
const ARC_SWEEP_DEG = 70;

export function CircularProgressGuide({
  activeDirection,
  poseState = 'invalid',
  captureCounts,
  requiredCount,
}: CircularProgressGuideProps) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;

  // ── Geometry ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isFrontActive = activeDirection === 'front';
  const trackR  = 148; // quiet background track ring
  const arcR    = 148; // directional arcs sit on the same radius
  const bloomR  = 148;

  const circumference = 2 * Math.PI * arcR;
  const arcLength     = (ARC_SWEEP_DEG / 360) * circumference;
  const gap           = circumference - arcLength;
  const dashArray     = `${arcLength} ${gap}`;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        {/* Soft glow filter for the active arc bloom */}
        <filter id="cpg-bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
        </filter>
        {/* Sharper inner glow so the arc itself glows */}
        <filter id="cpg-glow-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Quiet background track ring ─────────────────────── */}
      <circle
        cx={cx}
        cy={cy}
        r={trackR}
        fill="none"
        stroke="rgba(255,255,255,0.055)"
        strokeWidth="1.5"
      />

      {/* ── Directional arc segments ─────────────────────────── */}
      {DIRECTIONAL_ANGLES.map((dir) => {
        const count      = captureCounts[dir] ?? 0;
        const isComplete = count >= requiredCount;
        const isActive   = activeDirection === dir && !isComplete;

        // Rotation so the arc's midpoint faces the correct cardinal direction
        const rotation = DIRECTION_SEGMENT_ANGLES[dir] - ARC_SWEEP_DEG / 2;

        // ── Color logic ─────────────────────────────────────
        let arcColor  = 'rgba(255,255,255,0.10)'; // idle/upcoming
        let arcWidth  = 3;
        let bloomColor: string | null = null;

        if (isComplete) {
          arcColor = 'rgba(134,239,172,0.75)'; // soft green — completed
          arcWidth = 4;
        } else if (isActive) {
          arcWidth = 6;
          if (poseState === 'valid') {
            arcColor  = '#86efac';
            bloomColor = 'rgba(134,239,172,0.30)';
          } else if (poseState === 'near_valid') {
            arcColor  = '#fbbf24';
            bloomColor = 'rgba(251,191,36,0.26)';
          } else {
            arcColor  = '#7BA8C0';
            bloomColor = 'rgba(100,147,181,0.22)';
          }
        }

        return (
          <g
            key={dir}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {/* ── Bloom layer (behind, blurred) ── */}
            {isActive && bloomColor && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={bloomR}
                fill="none"
                stroke={bloomColor}
                strokeWidth={22}
                strokeDasharray={dashArray}
                strokeDashoffset={0}
                strokeLinecap="round"
                filter="url(#cpg-bloom)"
                animate={{
                  opacity: poseState === 'invalid' ? [0.3, 0.85, 0.3] : [0.7, 1, 0.7],
                }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* ── Main arc stroke ── */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={arcR}
              fill="none"
              stroke={arcColor}
              strokeWidth={arcWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={0}
              strokeLinecap="round"
              filter={isActive ? 'url(#cpg-glow-sm)' : undefined}
              animate={
                isActive
                  ? {
                      opacity:
                        poseState === 'invalid'
                          ? [0.55, 1, 0.55]
                          : 1,
                    }
                  : { opacity: isComplete ? 0.80 : 0.30 }
              }
              transition={
                isActive
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.45, ease: 'easeOut' }
              }
            />
          </g>
        );
      })}
    </svg>
  );
}
