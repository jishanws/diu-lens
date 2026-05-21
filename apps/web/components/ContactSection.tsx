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
    <section className="relative py-28 sm:py-36 lg:py-40 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-cyan-900/10 blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 h-[400px] w-[400px] rounded-full bg-blue-900/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          
          {/* Left Column: Heading & Info */}
          <motion.div 
            className="flex flex-col justify-center space-y-8"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="space-y-4">
              <h2 className="text-[2rem] leading-tight font-semibold tracking-tight text-white sm:text-[2.5rem]">
                Need help with <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">DIU Lens access?</span>
              </h2>
              <p className="max-w-md text-[1.05rem] leading-relaxed text-slate-400">
                Our team is here to help you with biometric registration and identity verification support.
              </p>
            </div>

            <div className="flex flex-col gap-5 pt-4">
              {CONTACT_INFO.map((info, idx) => (
                <motion.div 
                  key={info.title}
                  className="group flex items-start gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors duration-300 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 shadow-[0_0_15px_-3px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.25)]">
                    <info.icon className="size-5 text-cyan-400 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-[0.8rem] font-medium uppercase tracking-wider text-slate-500">
                      {info.title}
                    </span>
                    <span className="mt-1 text-[0.95rem] font-medium text-slate-200">
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
            transition={{ duration: 0.6, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
            className="relative lg:ml-auto w-full max-w-lg"
          >
            <div className="landing-card-surface relative rounded-[2rem] border border-white/10 bg-[#0a1120]/60 p-6 sm:p-8 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
              {/* Subtle top glow line */}
              <div aria-hidden="true" className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 sm:gap-5">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-[0.82rem] font-medium text-slate-300">
                      Full Name
                    </label>
                    <Input 
                      id="name" 
                      required 
                      className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="student-id" className="text-[0.82rem] font-medium text-slate-300">
                      Student ID <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <Input 
                      id="student-id" 
                      className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                      placeholder="222-15-6001"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[0.82rem] font-medium text-slate-300">
                    Email Address
                  </label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    placeholder="student@diu.edu.bd"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-[0.82rem] font-medium text-slate-300">
                    Subject
                  </label>
                  <Input 
                    id="subject" 
                    required 
                    className="bg-black/20 hover:bg-black/30 focus:bg-black/30 border-white/5 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    placeholder="How can we help?"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-[0.82rem] font-medium text-slate-300">
                    Message
                  </label>
                  <textarea 
                    id="message" 
                    required 
                    rows={4}
                    className="flex w-full min-w-0 rounded-lg border border-white/5 bg-black/20 hover:bg-black/30 focus:bg-black/30 px-3 py-2.5 text-[0.95rem] sm:text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                    placeholder="Provide details about your inquiry..."
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="mt-2 group relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#3b76e3] to-[#255ac2] hover:from-[#4381f0] hover:to-[#2b65d6] text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 h-[2.8rem]"
                >
                  <div aria-hidden="true" className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
                  <span className="relative font-medium tracking-wide">
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
