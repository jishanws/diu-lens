import { Check } from 'lucide-react';

import {
  captureAngles,
  getRequiredFramesForAngle,
} from '@/features/registration/capture/constants';
import type { CapturedShotsByAngle } from '@/features/registration/capture/types';
import type { VerificationAngle } from '@/features/registration/verification/types';
import { cn } from '@/lib/utils';

const angleLabel: Record<VerificationAngle, string> = {
  front: 'Look Straight',
  left: 'Turn Head Left',
  right: 'Turn Head Right',
  up: 'Lift Chin Slightly',
  down: 'Lower Chin Slightly',
  natural_front: 'Natural',
};

type CaptureProgressProps = {
  capturedShots: CapturedShotsByAngle;
  currentAngle: VerificationAngle;
  capturedCount: number;
};

export function CaptureProgress({
  capturedShots,
  currentAngle,
  capturedCount,
}: CaptureProgressProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold tracking-[0.03em] text-slate-600 uppercase max-[639px]:text-slate-500">
        <span>Capture Steps</span>
        <span>{capturedCount} / {captureAngles.length}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {captureAngles.map((angle) => {
          const frameCount = capturedShots[angle].length;
          const requiredFrames = getRequiredFramesForAngle(angle);
          const completed = frameCount >= requiredFrames;
          const active = !completed && angle === currentAngle;

          return (
            <div
              key={angle}
              className={cn(
                'flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors',
                completed
                  ? 'border-[#6493b5]/30 bg-[#6493b5]/10 text-[#6493b5] max-[639px]:border-[#6493b5]/20 max-[639px]:bg-[#6493b5]/10 max-[639px]:text-[#6493b5]'
                  : active
                    ? 'border-[#6493b5]/50 bg-[#6493b5]/5 text-[#6493b5] max-[639px]:border-[#6493b5]/30 max-[639px]:bg-[#6493b5]/5 max-[639px]:text-[#6493b5]'
                    : 'border-white/10 bg-white/5 text-slate-400 max-[639px]:border-white/10 max-[639px]:bg-white/5 max-[639px]:text-slate-500'
              )}
            >
              {completed ? <Check className="mr-1 size-3.5" /> : null}
              <span>{angleLabel[angle]} {frameCount}/{requiredFrames}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
