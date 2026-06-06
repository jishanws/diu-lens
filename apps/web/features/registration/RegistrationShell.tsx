'use client';

import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RegistrationStepMeta } from '@/features/registration/types';

type RegistrationShellProps = {
  activeIndex: number;
  steps: RegistrationStepMeta[];
  className?: string;
  children: ReactNode;
};

export function RegistrationShell({
  activeIndex,
  steps,
  className,
  children,
}: RegistrationShellProps) {
  const totalSteps = Math.max(steps.length, 1);
  const normalizedActiveIndex = Math.max(0, Math.min(activeIndex, totalSteps - 1));

  return (
    <Card
      className={cn(
        'landing-card-surface flex w-full flex-col rounded-[1.5rem] px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10',
        className
      )}
    >
      <CardContent className="space-y-0 p-0">
        <header className="space-y-4 sm:space-y-3.5 pb-6 sm:pb-8">
          <div>
            <h2 className="landing-text-primary text-center text-[1.38rem] leading-none font-semibold tracking-[-0.012em] sm:text-[1.58rem] sm:tracking-[-0.015em]">
              Verification Portal
            </h2>
          </div>

          {/* ── Step node timeline ─────────────────────────────── */}
          <nav
            aria-label="Onboarding steps"
            role="progressbar"
            aria-valuenow={normalizedActiveIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          >
            {/*
              Single grid: one column per step.
              Nodes + labels share the same column → perfect vertical alignment.
              Connectors are absolutely positioned between node centers.
            */}
            <div
              className="relative grid items-start"
              style={{ gridTemplateColumns: `repeat(${totalSteps}, 1fr)` }}
            >
              {/* Columns: node + label, perfectly aligned */}
              {steps.map((step, index) => {
                const isCompleted = index < normalizedActiveIndex;
                const isActive    = index === normalizedActiveIndex;
                const isLast      = index === totalSteps - 1;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center gap-[0.6rem]"
                  >
                    {/* Node Container */}
                    <div className="relative flex w-full justify-center">
                      <div
                        className={cn(
                          'step-node relative z-10',
                          isActive      ? 'step-node-active'
                          : isCompleted ? 'step-node-completed'
                          :               'step-node-upcoming'
                        )}
                      >
                        {/* Completed: checkmark */}
                        {isCompleted && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                            <path
                              d="M1 3l2 2 4-4"
                              stroke="rgba(147,197,253,0.9)"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}

                        {/* Active: white center dot */}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            style={{
                              width: '0.3125rem',
                              height: '0.3125rem',
                              borderRadius: '9999px',
                              background: '#fff',
                              opacity: 0.9,
                              flexShrink: 0,
                            }}
                          />
                        )}

                        {/* Upcoming: step number */}
                        {!isCompleted && !isActive && (
                          <span
                            aria-hidden="true"
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 500,
                              color: 'rgba(96,110,128,0.55)',
                              lineHeight: 1,
                            }}
                          >
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Connector track — mathematically centered between nodes */}
                      {!isLast && (
                        <div
                          aria-hidden="true"
                          className="absolute left-[50%] right-[-50%] top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.06] ml-[1rem] mr-[1rem] sm:ml-[1.1rem] sm:mr-[1.1rem]"
                          style={{ height: '1.5px' }}
                        >
                          <div
                            className="step-connector-fill"
                            style={{
                              transform: isCompleted ? 'scaleX(1)' : 'scaleX(0)',
                              opacity:   isCompleted ? 1 : 0,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Label — centered under node by column grid */}
                    <span
                      className="step-label"
                      style={{
                        color: isActive
                          ? 'var(--landing-text-primary)'
                          : isCompleted
                            ? 'rgba(160,175,190,0.65)'
                          : 'rgba(110,120,135,0.5)',
                        opacity: isActive ? 1 : isCompleted ? 0.85 : 0.6,
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </nav>
        </header>

        <div className="space-y-8 border-t border-white/[0.06] pt-8 sm:space-y-8 sm:pt-10">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
