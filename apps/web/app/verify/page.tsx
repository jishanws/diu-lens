import { Header } from '@/components/Header';
import { VerifyPageClient } from './VerifyPageClient';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Identity Verification | DIU Lens',
  description: 'Complete your secure biometric identity verification for the DIU Campus.',
};

export default function VerifyPage() {
  return (
    <div className="landing-page relative min-h-screen overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════
          CINEMATIC ENVIRONMENT 
          ═══════════════════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="bg-environment bg-env-breathe pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="bg-hero-atmos pointer-events-none absolute inset-0 opacity-80"
      />
      <div
        aria-hidden="true"
        className="bg-signature-wrap pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="bg-signature-form" />
      </div>
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="bg-depth-recession pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="landing-vignette pointer-events-none absolute inset-0"
      />

      {/* ── PAGE CONTENT ───────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-5 pb-6 pt-4 sm:px-6 sm:pb-7 sm:pt-5 lg:px-10 lg:pb-8 lg:pt-6 xl:px-12">
        <Header />
        
        <main className="flex flex-1 items-center justify-center pt-16 sm:pt-20 lg:pt-0">
          <VerifyPageClient />
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
