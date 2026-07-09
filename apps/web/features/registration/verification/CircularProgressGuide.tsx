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
  const radius = 150;
  const stroke =
    poseState === 'valid'
      ? '#86efac'
      : poseState === 'near_valid'
        ? '#fbbf24'
        : '#7BA8C0';
  const glow =
    poseState === 'valid'
      ? 'rgba(134, 239, 172, 0.28)'
      : poseState === 'near_valid'
        ? 'rgba(251, 191, 36, 0.22)'
        : 'rgba(123, 168, 192, 0.18)';

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="cpg-simple-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(160, 185, 210, 0.08)"
        strokeWidth={5}
      />
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={glow}
        strokeWidth={18}
        filter="url(#cpg-simple-glow)"
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={stroke}
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
