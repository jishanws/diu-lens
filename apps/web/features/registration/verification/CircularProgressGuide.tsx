type CircularProgressGuideProps = {
  totalSteps: number;
  currentStepIndex: number;
};

type SegmentState = 'completed' | 'current' | 'upcoming';

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

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        {/* Strong glow for active segment */}
        <filter id="cpg-glow-active" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Subtle glow for completed segments */}
        <filter id="cpg-glow-done" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Static ultra-thin outer ghost ring */}
      <circle
        cx={cx}
        cy={cy}
        r={orbitR + 7}
        fill="none"
        stroke="rgba(59,130,246,0.04)"
        strokeWidth="1"
      />

      {/* Slowly rotating dashed orbit ring */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`360 ${cx} ${cy}`}
          dur="18s"
          repeatCount="indefinite"
        />
        <circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke="rgba(59,130,246,0.07)"
          strokeWidth="1.5"
          strokeDasharray="3 20"
          strokeLinecap="round"
        />
      </g>

      {/* Main segment arcs */}
      {Array.from({ length: totalSteps }).map((_, index) => {
        const startAngle = index * segmentSpan + gap / 2;
        const endAngle = (index + 1) * segmentSpan - gap / 2;

        const state: SegmentState =
          index < currentStepIndex
            ? 'completed'
            : index === currentStepIndex
              ? 'current'
              : 'upcoming';

        return (
          <path
            key={index}
            d={describeArc(cx, cy, segmentR, startAngle, endAngle)}
            fill="none"
            stroke={
              state === 'current'
                ? '#60a5fa'
                : state === 'completed'
                  ? '#3b82f6'
                  : 'rgba(30,58,95,0.5)'
            }
            strokeWidth={
              state === 'current' ? 9 : state === 'completed' ? 7 : 5
            }
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              opacity:
                state === 'current' ? 1 : state === 'completed' ? 0.8 : 0.4,
              filter:
                state === 'current'
                  ? 'url(#cpg-glow-active)'
                  : state === 'completed'
                    ? 'url(#cpg-glow-done)'
                    : undefined,
            }}
          />
        );
      })}
    </svg>
  );
}
