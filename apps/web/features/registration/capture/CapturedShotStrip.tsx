/* eslint-disable @next/next/no-img-element */
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import {
  captureAngles,
  getRequiredFramesForAngle,
} from '@/features/registration/capture/constants';
import type { CapturedShotsByAngle } from '@/features/registration/capture/types';
import type { VerificationAngle } from '@/features/registration/verification/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const angleLabel: Record<VerificationAngle, string> = {
  front: 'Look Straight',
  left: 'Turn Left',
  right: 'Turn Right',
  up: 'Look Up',
  down: 'Look Down',
  natural_front: 'Natural',
};

const angleOrder: VerificationAngle[] = captureAngles;

type CapturedShotStripProps = {
  capturedShots: CapturedShotsByAngle;
  currentAngle: VerificationAngle;
  onRetake: (angle: VerificationAngle) => void;
  onFocus: (angle: VerificationAngle) => void;
};

export function CapturedShotStrip({
  capturedShots,
  currentAngle,
  onRetake,
  onFocus,
}: CapturedShotStripProps) {
  const [failedPreviewKeys, setFailedPreviewKeys] = useState<Set<string>>(
    () => new Set()
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.03em] text-slate-600 uppercase max-[639px]:text-slate-500">
        Captured Shots
      </p>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${angleOrder.length}, minmax(0, 1fr))` }}>
        {angleOrder.map((angle) => {
          const shots = capturedShots[angle];
          const shot = shots[shots.length - 1];
          const requiredFrames = getRequiredFramesForAngle(angle);
          const completed = shots.length >= requiredFrames;
          const active = currentAngle === angle;
          const previewKey = shot ? `${angle}:${shot.capturedAt}` : angle;
          const previewFailed = failedPreviewKeys.has(previewKey);

          return (
            <div
              key={angle}
              className={cn(
                'rounded-3xl border p-1.5 transition-colors',
                shot
                  ? 'border-white/10 bg-white/5 max-[639px]:border-white/10 max-[639px]:bg-white/5'
                  : active
                    ? 'border-[#6493b5]/30 bg-[#6493b5]/5 max-[639px]:border-[#6493b5]/20 max-[639px]:bg-[#6493b5]/5'
                    : 'border-white/5 bg-transparent max-[639px]:border-white/5 max-[639px]:bg-transparent'
              )}
            >
              <button
                type="button"
                onClick={() => onFocus(angle)}
                className="w-full text-left"
              >
                <div className="mb-1 text-[10px] font-semibold tracking-[0.02em] text-slate-600 uppercase max-[639px]:text-slate-500">
                  {angleLabel[angle]} {shots.length}/{requiredFrames}
                </div>

                <div className="relative aspect-square overflow-hidden rounded-full border-2 border-slate-200 bg-slate-900/90 max-[639px]:border-white/10 max-[639px]:bg-black/40">
                  {shot && !previewFailed ? (
                    // Blob URLs are more reliable in mobile Safari with a plain img.
                    // next/image can show a native "Load failed" state for blob: sources.
                    <img
                      src={shot.previewUrl}
                      alt={`${angleLabel[angle]} capture preview`}
                      className="h-full w-full object-cover"
                      onError={() => {
                        if (process.env.NODE_ENV !== 'production') {
                          console.warn('[capture-preview] preview failed', {
                            angle,
                            previewUrl: shot.previewUrl,
                            capturedAt: shot.capturedAt,
                          });
                        }
                        setFailedPreviewKeys((current) => {
                          const next = new Set(current);
                          next.add(previewKey);
                          return next;
                        });
                      }}
                    />
                  ) : shot && previewFailed ? (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[9px] font-medium leading-tight text-amber-200">
                      Preview could not load. Retake this sample.
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-300 max-[639px]:text-slate-500">
                      Pending
                    </div>
                  )}
                </div>
              </button>

              {completed ? (
                <p className="mt-1 text-[10px] font-semibold text-[#6493b5]">
                  Ready
                </p>
              ) : null}

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onRetake(angle)}
                disabled={!shots.length}
                className="mt-1.5 h-7 w-full px-2 text-[10px] text-slate-600 hover:bg-slate-100 max-[639px]:text-slate-400 max-[639px]:hover:bg-white/5"
              >
                <RefreshCw className="size-3" />
                Retake
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
