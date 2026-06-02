'use client';

import { motion } from 'framer-motion';
import { Clock, Mail, MapPin, Send } from 'lucide-react';
import { useState } from 'react';

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email',
    value: 'support@diulens.app',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Daffodil International University',
  },
  {
    icon: Clock,
    label: 'Response Time',
    value: 'Usually within 24 hours',
  },
] as const;

const FADE_UP = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
};

export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSubmitted(false), 4000);
    }, 1400);
  };

  return (
    <>
      {/* ── Hero header ─────────────────────────────────────── */}
      <motion.section
        className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 pt-24 pb-4 text-center sm:pt-32 sm:pb-8 md:pt-36 md:pb-12 lg:pt-36 lg:pb-10"
        initial="hidden"
        animate="show"
      >
        <motion.p
          variants={FADE_UP}
          custom={0}
          className="mb-3 text-[0.65rem] font-medium tracking-widest text-slate-500 uppercase sm:mb-4 md:text-[0.7rem]"
        >
          Support &amp; Contact
        </motion.p>

        <motion.h1
          variants={FADE_UP}
          custom={1}
          className="mx-auto max-w-[15ch] text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-white sm:max-w-[18ch] sm:text-5xl md:max-w-none md:text-[3.5rem] md:leading-[1.08] lg:text-[4rem] lg:leading-[1.05]"
        >
          Need help with{' '}
          <span className="bg-gradient-to-b from-slate-200 to-[#6493b5] bg-clip-text text-transparent">
            Support
          </span>
        </motion.h1>

        <motion.p
          variants={FADE_UP}
          custom={2}
          className="mx-auto mt-4 max-w-[22rem] text-[0.9rem] leading-relaxed text-slate-400 sm:max-w-xl sm:text-base sm:mt-5 md:max-w-2xl md:text-[1.05rem] md:leading-[1.75]"
        >
          Reach out for help with enrollment, identity verification, or anything else related to your campus access.
        </motion.p>
      </motion.section>

      {/* ── Two-column body ─────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-20 md:max-w-4xl lg:max-w-5xl lg:pt-14 lg:pb-24">

        <div className="grid items-start gap-10 md:grid-cols-[1fr_1.1fr] md:gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">

          {/* Left: contact info */}
          <motion.div
            className="flex flex-col gap-6 md:sticky md:top-28 lg:top-32"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.div variants={FADE_UP} custom={0} className="space-y-2">
              <p className="text-[0.65rem] font-medium tracking-widest text-slate-500 uppercase md:text-[0.7rem]">
                Contact Info
              </p>
              <h2 className="text-[1.4rem] font-semibold leading-snug tracking-tight text-white sm:text-[1.6rem] md:text-[1.75rem]">
                We&rsquo;re here to help.
              </h2>
              <p className="text-[0.9rem] leading-relaxed text-slate-400 md:text-[0.95rem] md:leading-[1.65]">
                Whether it is a registration issue or an access question, our team is ready to help.
              </p>
            </motion.div>

            <div className="flex flex-col gap-5">
              {CONTACT_INFO.map((item, i) => (
                <motion.div
                  key={item.label}
                  variants={FADE_UP}
                  custom={i + 1}
                  className="group flex items-start gap-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] shadow-[0_0_12px_-4px_rgba(100,147,181,0.1)] transition-all duration-300 group-hover:border-[#6493b5]/25 group-hover:bg-[#6493b5]/[0.06] group-hover:shadow-[0_0_16px_-4px_rgba(100,147,181,0.2)]">
                    <item.icon
                      className="size-[1.05rem] text-[#6493b5]/80 transition-colors duration-300 group-hover:text-[#75a4c6]"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[0.72rem] font-medium uppercase tracking-wider text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[0.9rem] font-medium text-slate-200">
                      {item.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: contact form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="landing-card-surface relative overflow-hidden rounded-[1.75rem] border p-6 sm:p-8 md:p-8 lg:p-9">
              {/* top glow line */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#6493b5]/15 to-transparent"
                style={{
                  maskImage:
                    'radial-gradient(ellipse at center, black 0%, transparent 80%)',
                }}
              />

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-[#6493b5]/10 blur-xl" />
                    <div className="flex size-14 items-center justify-center rounded-full border border-[#6493b5]/25 bg-[#6493b5]/8 shadow-[0_0_20px_-6px_rgba(100,147,181,0.25)]">
                      <Send className="size-6 text-[#6493b5]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-[1.1rem] font-semibold text-white">
                    Message Sent
                  </p>
                  <p className="max-w-xs text-[0.88rem] text-slate-400">
                    We&rsquo;ve received your message and will respond within 24
                    hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Row 1: Name + Student ID */}
                  <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-name"
                        className="block text-[0.82rem] font-medium text-slate-300"
                      >
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Jane Doe"
                        className="landing-form-input w-full placeholder:text-white/30 placeholder:font-light"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-student-id"
                        className="block text-[0.82rem] font-medium text-slate-300"
                      >
                        Student ID{' '}
                        <span className="font-normal text-slate-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        id="contact-student-id"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        placeholder="222-15-6001"
                        className="landing-form-input w-full placeholder:text-white/30 placeholder:font-light"
                      />
                    </div>
                  </div>

                  {/* Row 2: Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="block text-[0.82rem] font-medium text-slate-300"
                    >
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="student@diu.edu.bd"
                      className="landing-form-input w-full placeholder:text-white/30 placeholder:font-light"
                    />
                  </div>

                  {/* Row 3: Subject */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-subject"
                      className="block text-[0.82rem] font-medium text-slate-300"
                    >
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      autoComplete="off"
                      placeholder="How can we help?"
                      className="landing-form-input w-full placeholder:text-white/30 placeholder:font-light"
                    />
                  </div>

                  {/* Row 4: Message */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-message"
                      className="block text-[0.82rem] font-medium text-slate-300"
                    >
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      placeholder="Tell us what you need help with…"
                      className="landing-form-input w-full resize-none py-3 leading-relaxed"
                      style={{ height: 'auto' }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="landing-cta group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden bg-gradient-to-b from-[#6493b5] to-[#527c9a] text-white shadow-[0_4px_14px_-4px_rgba(100,147,181,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-[#75a4c6] hover:to-[#6493b5] hover:shadow-[0_6px_18px_-4px_rgba(100,147,181,0.35)] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      <Send className="relative size-[0.9rem] opacity-80" />
                      <span className="relative">
                        {isSubmitting ? 'Sending…' : 'Send Message'}
                      </span>
                    </span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>

        </div>
      </section>
    </>
  );
}
