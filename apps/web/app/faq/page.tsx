'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, LifeBuoy } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Why should I register in DIU Lens?',
    answer:
      'Verify your identity once and access campus services seamlessly. DIU Lens removes the need for repeated manual verifications across different university platforms by anchoring your student record to a secure biometric profile.',
  },
  {
    question: 'Is my facial data secure?',
    answer:
      'Yes. Your biometric data is instantly converted into a secure mathematical representation (vector embedding). We do not store raw images in our operational database, and all processing is encrypted end-to-end within DIU’s private infrastructure.',
  },
  {
    question: 'How long does registration take?',
    answer: 
      'The entire onboarding process takes less than 2 minutes. You simply validate your Student ID, confirm your basic details, and perform a quick guided face scan.',
  },
  {
    question: 'Do I need to register multiple times?',
    answer: 
      'No. Registration is a one-time process. Once enrolled, your biometric profile serves as a permanent authentication layer for supported campus services.',
  },
  {
    question: 'What if my face is not recognized?',
    answer: 
      'You can safely retry the verification. The system is designed to handle variations in lighting and minor appearance changes. If you encounter persistent issues, you can update your biometric enrollment via the student portal.',
  },
  {
    question: 'Is this required for all DIU students?',
    answer:
      'DIU Lens is being rolled out as the standard, trusted identification layer across campus. While currently in phased adoption, it will eventually support all major authentication touchpoints.',
  },
];

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="landing-page relative min-h-screen overflow-hidden bg-[#0a0c10]">
      {/* ═══════════════════════════════════════════════════════════
          CINEMATIC ENVIRONMENT 
          ═══════════════════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="bg-environment bg-env-breathe pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="bg-hero-atmos pointer-events-none absolute inset-0 opacity-[0.85]"
      />
      <div
        aria-hidden="true"
        className="bg-signature-wrap pointer-events-none absolute inset-0 overflow-hidden opacity-30"
      >
        <div className="bg-signature-form" />
      </div>
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 mix-blend-overlay"
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

        <main className="flex w-full flex-1 justify-center pt-24 sm:pt-32 pb-16">
          <div className="flex w-full max-w-2xl flex-col">
            
            {/* ── HEADER SECTION ───────────────────────────── */}
            <header className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[0.75rem] font-medium tracking-wide text-slate-300 backdrop-blur-md">
                <LifeBuoy className="size-3.5 text-blue-400/80" />
                Support & Verification Help
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                How can we help?
              </h1>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-slate-400 sm:text-base">
                Everything you need to know about the DIU Lens biometric ecosystem, privacy guarantees, and enrollment procedures.
              </p>
            </header>

            {/* ── SEARCH INPUT ───────────────────────────── */}
            <div className="relative mt-10 w-full sm:mt-12">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                <Search className="size-4.5 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search support topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] py-4 pl-12 pr-6 text-[0.95rem] text-slate-200 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_8px_20px_-8px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 focus:border-white/[0.12] focus:bg-white/[0.04] focus:outline-none focus:ring-4 focus:ring-white/[0.02]"
              />
            </div>

            {/* ── FAQ ACCORDIONS ───────────────────────────── */}
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:gap-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-[1.25rem] border transition-all duration-500",
                        isOpen 
                          ? "border-white/[0.08] bg-white/[0.03] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]" 
                          : "border-white/[0.03] bg-white/[0.01] hover:border-white/[0.06] hover:bg-white/[0.02]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(index)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left outline-none sm:px-7 sm:py-6"
                        aria-expanded={isOpen}
                      >
                        <span 
                          className={cn(
                            "text-[0.95rem] font-medium transition-colors duration-300 sm:text-[1.05rem]",
                            isOpen ? "text-white" : "text-slate-200 group-hover:text-white"
                          )}
                        >
                          {faq.question}
                        </span>
                        <div 
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
                            isOpen ? "bg-white/[0.08]" : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                              isOpen ? "rotate-180 text-white" : "text-slate-400"
                            )}
                          />
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                          >
                            <div className="px-5 pb-6 pt-1 text-[0.88rem] leading-relaxed text-slate-400 sm:px-7 sm:pb-7 sm:text-[0.92rem]">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.02]">
                    <Search className="size-5 text-slate-500" />
                  </div>
                  <p className="mt-4 text-[0.95rem] text-slate-400">
                    No support topics found matching &quot;{searchQuery}&quot;
                  </p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-[0.85rem] text-blue-400 hover:text-blue-300"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
