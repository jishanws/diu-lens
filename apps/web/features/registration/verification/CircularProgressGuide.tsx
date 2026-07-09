'use client';

import { motion } from 'framer-motion';
import type { VerificationAngle } from '@/features/registration/verification/types';
import type { PoseValidationState } from '@/features/registration/capture/types';

export type DirectionCompletionMap = Partial<Record<string, boolean>>;

type CircularProgressGuideProps = {
  completedDirections: DirectionCompletionMap;
  activeDirection: VerificationAngle;
  poseState?: PoseValidationState;
};

export function CircularProgressGuide({
  poseState = 'invalid',
}: CircularProgressGuideProps) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;

  const segmentR = 150;
  const orbitR = 161;

  const activeStroke =
    poseState === 'valid'
      ? '#86efac' // green
      : poseState === 'near_valid'
        ? '#fbbf24' // yellow
        : '#7BA8C0'; // blue

  const activeBloom =
    poseState === 'valid'
      ? 'rgba(134, 239, 172, 0.3)'
      : poseState === 'near_valid'
        ? 'rgba(251, 191, 36, 0.26)'
        : 'rgba(123, 168, 192, 0.22)';

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
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
          stroke="rgba(160, 185, 210, 0.09)"
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
        stroke="rgba(160, 185, 210, 0.03)"
        strokeWidth="1"
      />

      {/* Base ring (always visible, faint) */}
      <circle
        cx={cx}
        cy={cy}
        r={segmentR}
        fill="none"
        stroke="rgba(160, 185, 210, 0.08)"
        strokeWidth={5}
      />

      {/* Bloom pulse ring (wide and blurred) */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={segmentR}
        fill="none"
        stroke={activeBloom}
        strokeWidth={18}
        filter="url(#cpg-active-bloom)"
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Core ring (sharp) */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={segmentR}
        fill="none"
        stroke={activeStroke}
        strokeWidth={8}
        strokeLinecap="round"
        animate={{
          opacity: poseState === 'invalid' ? [0.55, 0.85, 0.55] : 1,
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}
