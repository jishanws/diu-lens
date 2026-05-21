'use client';

import { motion } from 'framer-motion';
import { Clock, Mail, MapPin } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CONTACT_INFO = [
  {
    icon: Mail,
    title: 'Email',
    content: 'support@diulens.app',
  },
  {
    icon: MapPin,
    title: 'Location',
    content: 'Daffodil International University',
  },
  {
    icon: Clock,
    title: 'Response Time',
    content: 'Usually responds within 24 hours',
  },
] as const;

export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <section className="relative pt-44 sm:pt-48 lg:pt-56 pb-24 lg:pb-32 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-cyan-900/10 blur-[140px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 h-[600px] w-[600px] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-6 sm:px-12 lg:px-20">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 xl:gap-32 items-center">
          
          {/* Left Column: Heading & Info */}
          <motion.div 
            className="flex flex-col justify-center space-y-8 lg:space-y-12"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="space-y-6 lg:space-y-8">
              <h2 className="text-[2.25rem] leading-[1.1] font-semibold tracking-tight text-white sm:text-[3rem] lg:text-[3.5rem]">
                Need help with <br className="hidden lg:block" />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">DIU Lens access?</span>
              </h2>
              <p className="max-w-lg text-[1.1rem] leading-relaxed text-slate-400 sm:text-[1.15rem]">
                Our team is here to help you with biometric registration and identity verification support.
              </p>
            </div>

            <div className="flex flex-col gap-8 pt-8 lg:pt-12">
              {CONTACT_INFO.map((info, idx) => (
                <motion.div 
                  key={info.title}
                  className="group flex items-start gap-5"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + idx * 0.15, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors duration-300 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 shadow-[0_0_15px_-3px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.25)]">
                    <info.icon className="size-6 text-cyan-400 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col pt-1.5">
                    <span className="text-[0.85rem] font-medium uppercase tracking-wider text-slate-500">
                      {info.title}
                    </span>
                    <span className="mt-1.5 text-[1.05rem] font-medium text-slate-200">
                      {info.content}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="relative lg:ml-auto w-full max-w-2xl"
          >
            <div className="landing-card-surface relative rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-[#0a1120]/60 p-8 sm:p-10 lg:p-12 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
              {/* Subtle top glow line */}
              <div aria-hidden="true" className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-8">
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-[0.85rem] font-medium tracking-wide text-slate-300">
                      Full Name
                    </label>
                    <Input 
                      id="name" 
                      required 
                      className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-10 sm:h-11 text-[1rem]"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="student-id" className="text-[0.85rem] font-medium tracking-wide text-slate-300">
                      Student ID <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <Input 
                      id="student-id" 
                      className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-10 sm:h-11 text-[1rem]"
                      placeholder="222-15-6001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-[0.85rem] font-medium tracking-wide text-slate-300">
                    Email Address
                  </label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-10 sm:h-11 text-[1rem]"
                    placeholder="student@diu.edu.bd"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="subject" className="text-[0.85rem] font-medium tracking-wide text-slate-300">
                    Subject
                  </label>
                  <Input 
                    id="subject" 
                    required 
                    className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-10 sm:h-11 text-[1rem]"
                    placeholder="How can we help?"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-[0.85rem] font-medium tracking-wide text-slate-300">
                    Message
                  </label>
                  <textarea 
                    id="message" 
                    required 
                    rows={6}
                    className="flex w-full min-w-0 rounded-lg sm:rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 focus:bg-black/30 px-3 py-3 sm:px-4 sm:py-3.5 text-[1rem] text-slate-100 placeholder:text-slate-500 transition-all duration-200 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                    placeholder="Provide details about your inquiry..."
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="mt-2 sm:mt-4 group relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#3b76e3] to-[#255ac2] hover:from-[#4381f0] hover:to-[#2b65d6] text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 h-[3.25rem] sm:h-[3.5rem]"
                >
                  <div aria-hidden="true" className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
                  <span className="relative font-medium tracking-wide text-[1rem]">
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </span>
                </Button>
              </form>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
