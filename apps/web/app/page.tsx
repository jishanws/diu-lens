import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HomeOnboardingSection } from '@/components/HomeOnboardingSection';

export default function Home() {
  return (
    <div className="landing-page relative min-h-screen overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════
          CINEMATIC ENVIRONMENT — 6 Atmospheric Layers
          ═══════════════════════════════════════════════════════════

          The page exists INSIDE an environment, not ON a surface.

          1. Environmental Lighting   — shaped vertical composition
          2. Hero Atmosphere          — focal warmth behind hero zone
          3. Atmospheric Signature    — organic biometric current
          4. Film Grain               — matte tactile richness
          5. Depth Recession          — lower-page darkness falloff
          6. Cinematic Vignette       — edge framing
      */}

      {/* ── L0: INFRASTRUCTURE ARTWORK ───────────────────────────
          Subtle background image of the university infrastructure.
          Masked at the center to keep text readable and calm. ──── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/branding/bg.jpeg')] bg-cover bg-center bg-no-repeat opacity-[0.14] blur-[2px] saturate-[0.6] [mask-image:radial-gradient(ellipse_at_center,transparent_25%,black_85%)]"
      />

      {/* ── L1: ENVIRONMENTAL LIGHTING ─────────────────────────────
          Multi-gradient shaped composition. Creates vertical lighting
          hierarchy: atmospheric glow above, warmth at hero zone,
          darkness below. The page has spatial zones, not flat tone. ─ */}
      <div
        aria-hidden="true"
        className="bg-environment bg-env-breathe pointer-events-none absolute inset-0"
      />

      {/* ── L2: HERO ATMOSPHERE ────────────────────────────────────
          Wide, low, centered luminance pocket at the hero zone.
          This is what makes the hero text feel anchored in a lit
          environment instead of floating in void. ──────────────── */}
      <div
        aria-hidden="true"
        className="bg-hero-atmos pointer-events-none absolute inset-0"
      />

      {/* ── L3: ATMOSPHERIC SIGNATURE ──────────────────────────────
          The emotional identity layer. An organic, amorphous form
          composed of overlapping gradients, then dissolved through
          heavy CSS blur (100px+). Very slow drift animation.

          After blur, this reads as flowing atmospheric luminance —
          like thermal currents or aurora beneath cloud cover.
          Never geometric. Never detectable as a shape.

          Disabled on mobile for GPU performance. ────────────────── */}
      <div
        aria-hidden="true"
        className="bg-signature-wrap pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="bg-signature-form" />
      </div>

      {/* ── L4: FILM GRAIN ─────────────────────────────────────────
          SVG feTurbulence, ~2% opacity, mix-blend-mode: overlay.
          The single most impactful "premium feel" layer.
          Prevents digital flatness across all dark surfaces. ────── */}
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0"
      />

      {/* ── L5: DEPTH RECESSION ────────────────────────────────────
          Linear darkness that increases toward the bottom of the
          page. Creates the spatial feeling that the content exists
          in a lit upper zone receding into distant depth below. ─── */}
      <div
        aria-hidden="true"
        className="bg-depth-recession pointer-events-none absolute inset-0"
      />

      {/* ── L6: CINEMATIC VIGNETTE ─────────────────────────────────
          Radial edge darkening. Bottom-heavier to reinforce depth
          recession. Frames the content zone. Subconscious. ──────── */}
      <div
        aria-hidden="true"
        className="landing-vignette pointer-events-none absolute inset-0"
      />

      {/* ── PAGE CONTENT ───────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-5 pb-6 pt-4 sm:px-6 sm:pb-7 sm:pt-5 lg:px-10 lg:pb-8 lg:pt-6 xl:px-12">
        <Header />
        <main className="flex-1">
          <HomeOnboardingSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
