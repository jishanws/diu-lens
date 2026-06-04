import { GridPattern } from "./ui/grid-pattern";
import { Spotlight } from "./ui/spotlight";
import { cn } from "@/lib/utils";

export function PremiumBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ── Spotlight Layer ────────────────────────────────────────
          Aceternity Spotlight for ambient lighting shaping the interface.
          Using softened, heavily diffused #6493b5. ────────── */}
      <div className="absolute inset-0 z-0">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20 opacity-20 md:opacity-45"
          fill="#6493b5"
        />
        {/* Secondary depth lighting behind features */}
        <Spotlight
          className="top-[40%] right-0 md:right-40 md:top-[50%] opacity-10 md:opacity-30"
          fill="#6493b5"
        />
      </div>

      {/* ── Dynamic Environmental Sweep ────────────────────────────
          Extremely slow, soft scanning movement. Subtle luminance shift
          for a gentle diagnostic motion feeling.
          Now CSS-driven for zero JS overhead. ─── */}
      <div
        className="absolute inset-x-0 top-0 h-[300px] w-full bg-gradient-to-b from-transparent via-[#6493b5]/[0.025] to-transparent z-0 animate-env-sweep"
        aria-hidden="true"
      />

      {/* ── Grid Pattern Layer ─────────────────────────────────────
          Magic UI Grid Pattern to add architectural structure.
          Oversized, low opacity, faded edges using a radial mask. ─ */}
      <div className="absolute inset-0 z-0 opacity-25 md:opacity-45">
        <GridPattern
          width={80}
          height={80}
          x={-1}
          y={-1}
          className={cn(
            "[mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_100%)]",
            "inset-0 h-[150%] w-full skew-y-12 fill-[#6493b5]/[0.05] stroke-[#6493b5]/[0.10]"
          )}
        />
      </div>
    </div>
  );
}
