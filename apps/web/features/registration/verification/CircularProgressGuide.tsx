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

const ANGLES_ORDER: VerificationAngle[] = ['up', 'right', 'down', 'left', 'front'];

export function CircularProgressGuide({
  activeDirection,
  poseState = 'invalid',
  captureCounts,
  requiredCount,
}: CircularProgressGuideProps) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;

  const segmentR = 150;
  const orbitR = 161;

  // 5 segments = 360 / 5 = 72 degrees each
  // We'll leave a small gap between them, e.g., 4 degrees
  const segmentAngle = 72;
  const gapAngle = 4;
  const drawAngle = segmentAngle - gapAngle;
  
  // Circumference
  const circumference = 2 * Math.PI * segmentR;
  // Arc length for one segment
  const segmentLength = (drawAngle / 360) * circumference;
  // Stroke dasharray pattern: [segmentLength, circumference - segmentLength]
  const dashArray = `${segmentLength} ${circumference - segmentLength}`;

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

      {/* Render 5 segments */}
      <g style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}>
        {ANGLES_ORDER.map((angle, index) => {
          const count = captureCounts[angle] ?? 0;
          const isComplete = count >= requiredCount;
          const isActive = activeDirection === angle && !isComplete;
          const startAngle = index * segmentAngle + gapAngle / 2;

          let strokeColor = 'rgba(160, 185, 210, 0.15)'; // base muted blue/gray
          let strokeWidth = 5;
          let bloom = 'transparent';

          if (isComplete) {
            strokeColor = '#86efac'; // green
            strokeWidth = 6;
          } else if (isActive) {
            strokeWidth = 8;
            if (count > 0) {
              // partially brighter
              strokeColor = '#a0c3d7'; // brighter blue
              bloom = 'rgba(160, 195, 215, 0.25)';
            } else {
              // base active blue
              strokeColor = '#7BA8C0';
              bloom = 'rgba(123, 168, 192, 0.22)';
            }
            
            // if pose is valid and it's active, maybe glow green briefly?
            if (poseState === 'valid') {
              strokeColor = '#86efac';
              bloom = 'rgba(134, 239, 172, 0.3)';
            } else if (poseState === 'near_valid') {
              strokeColor = '#fbbf24';
              bloom = 'rgba(251, 191, 36, 0.26)';
            }
          }

          return (
            <g key={angle} style={{ transformOrigin: 'center', transform: `rotate(${startAngle}deg)` }}>
              {/* Base Segment */}
              <circle
                cx={cx}
                cy={cy}
                r={segmentR}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={0}
                strokeLinecap="round"
                style={{ transition: 'all 0.5s ease-out' }}
              />
              
              {/* Active Bloom */}
              {isActive && (
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={segmentR}
                  fill="none"
                  stroke={bloom}
                  strokeWidth={18}
                  strokeDasharray={dashArray}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  filter="url(#cpg-active-bloom)"
                  animate={{ opacity: poseState === 'invalid' ? [0.35, 0.9, 0.35] : 1 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
