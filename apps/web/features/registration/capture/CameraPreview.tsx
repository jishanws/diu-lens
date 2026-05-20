import { cn } from '@/lib/utils';

type CameraPreviewProps = {
  videoRef: (node: HTMLVideoElement | null) => void;
  streamActive: boolean;
  fallbackMessage?: string;
  className?: string;
};

export function CameraPreview({
  videoRef,
  streamActive,
  fallbackMessage,
  className,
}: CameraPreviewProps) {
  return (
    <div className={cn('relative w-full overflow-hidden bg-slate-950', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover [transform:scaleX(-1)]"
        aria-label="Live camera preview"
      />

      {/* Radial inner vignette — darker edges, brighter center */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 36%, rgba(1,5,15,0.55) 88%)',
        }}
      />

      {/* Permission / no-stream fallback overlay */}
      {!streamActive && fallbackMessage ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#01040c]/92 px-6 text-center text-[0.82rem] font-medium leading-relaxed text-slate-300">
          {fallbackMessage}
        </div>
      ) : null}
    </div>
  );
}
