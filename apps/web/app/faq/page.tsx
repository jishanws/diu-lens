'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, LifeBuoy } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Why do students need DIU Lens?',
    answer:
      'DIU Lens creates a verified biometric identity for each student, strengthening digital authentication across university services. Think of it as your secure campus identity — tied to your face, not just your student ID.',
  },
  {
    question: 'How is biometric data protected?',
    answer:
      'Your biometric data is processed and stored through secure, privacy-first workflows. The platform is built with data integrity and institutional privacy standards at its core.',
  },
  {
    question: 'How long does verification take?',
    answer:
      'Most students complete enrollment in under five minutes. The guided flow is designed to be simple and fast from start to finish.',
  },
  {
    question: 'Do I need to enroll more than once?',
    answer:
      'No. Once your enrollment is approved, you are registered. You may only need to re-enroll if the university requests a future update.',
  },
  {
    question: 'What happens if verification fails?',
    answer:
      'You can simply retry. The system will guide you on improving lighting, positioning, or image clarity to get a clean capture.',
  },
  {
    question: 'Is enrollment required for all students?',
    answer:
      'Enrollment requirements will depend on future university authentication policies as DIU Lens expands across campus systems.',
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

        <main className="flex w-full flex-1 justify-center pt-28 pb-20 sm:pt-40 sm:pb-24 md:pt-44 md:pb-28">
          <div className="flex w-full max-w-2xl flex-col md:max-w-3xl">
            
            {/* ── HEADER SECTION ───────────────────────────── */}
            <header className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[0.75rem] font-medium tracking-wide text-slate-300 backdrop-blur-md">
                <LifeBuoy className="size-3.5 text-blue-400/80" />
                Support & Verification Help
              </div>
              <h1 className="mt-5 text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.75rem]">
                Frequently Asked Questions
              </h1>
              <p className="mt-5 max-w-[32rem] text-[0.95rem] leading-[1.7] text-slate-400 sm:text-[1.05rem]">
                Everything you need to know before completing your enrollment.
              </p>
            </header>

            {/* ── SEARCH INPUT ───────────────────────────── */}
            <div className="relative mt-12 w-full sm:mt-16">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center md:left-6">
                <Search className="size-4.5 text-slate-500 md:size-5" />
              </div>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[16px] border border-white/[0.05] bg-[#16191f]/40 py-3.5 pl-[3.25rem] pr-4 text-[0.95rem] text-slate-200 outline-none ring-1 ring-white/0 transition-all placeholder:text-slate-500 focus:bg-[#16191f]/60 focus:ring-white/[0.08] sm:rounded-[14px] sm:py-3 sm:text-[1rem] md:py-4 md:pl-[3.75rem] md:text-[1.05rem]"
              />
            </div>

            {/* ── FAQ ACCORDIONS ───────────────────────────── */}
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:gap-[1.15rem]">
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
                        className="flex w-full items-center justify-between gap-4 px-6 py-[1.25rem] text-left outline-none sm:px-8 sm:py-[1.4rem] md:px-10 md:py-[1.6rem]"
                        aria-expanded={isOpen}
                      >
                        <span 
                          className={cn(
                            "text-[1rem] font-medium tracking-[-0.01em] transition-colors duration-300 sm:text-[1.1rem]",
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
                            <div className="px-6 pb-[1.6rem] pt-1 text-[0.98rem] leading-[1.7] text-slate-400/90 sm:px-8 sm:text-[0.98rem] md:px-10 md:text-[1.05rem] md:leading-[1.8] md:pb-[2rem]">
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
