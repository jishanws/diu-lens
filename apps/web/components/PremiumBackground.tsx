"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { GridPattern } from "./ui/grid-pattern";
import { Spotlight } from "./ui/spotlight";
import { cn } from "@/lib/utils";

export function PremiumBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Extremely subtle parallax for the background layers
  // Grid moves slightly up as you scroll down
  const yGrid = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  // Spotlights move at a different rate for deeper layer separation
  const ySpotlight = useTransform(scrollYProgress, [0, 1], ["0%", "32%"]);

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ── Spotlight Layer ────────────────────────────────────────
          Aceternity Spotlight for ambient lighting shaping the interface.
          Using softened, heavily diffused #6493b5. ────────── */}
      <motion.div style={{ y: ySpotlight }} className="absolute inset-0 z-0">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20 opacity-30 md:opacity-60"
          fill="#6493b5"
        />
        {/* Secondary depth lighting behind features */}
        <Spotlight
          className="top-[40%] right-0 md:right-40 md:top-[50%] opacity-20 md:opacity-40"
          fill="#6493b5"
        />
      </motion.div>

      {/* ── Dynamic Environmental Sweep ────────────────────────────
          Extremely slow, soft scanning movement. Subtle luminance shift
          for a gentle diagnostic motion feeling. ────────────────── */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[300px] w-full bg-gradient-to-b from-transparent via-[#6493b5]/[0.025] to-transparent z-0 blur-3xl"
        animate={{ y: ["-300px", "120vh"] }}
        transition={{ duration: 22, ease: "linear", repeat: Infinity }}
      />

      {/* ── Grid Pattern Layer ─────────────────────────────────────
          Magic UI Grid Pattern to add architectural structure.
          Oversized, low opacity, faded edges using a radial mask. ─ */}
      <motion.div style={{ y: yGrid }} className="absolute inset-0 z-0 opacity-30 md:opacity-55">
        <GridPattern
          width={80}
          height={80}
          x={-1}
          y={-1}
          className={cn(
            "[mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_100%)]",
            "inset-0 h-[150%] w-full skew-y-12 fill-[#6493b5]/[0.06] stroke-[#6493b5]/[0.15] blur-[1px]"
          )}
        />
      </motion.div>
    </div>
  );
}
