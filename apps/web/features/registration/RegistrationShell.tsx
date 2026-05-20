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
        'landing-card-surface flex w-full flex-col rounded-[1.25rem] border px-5 py-5 shadow-none sm:rounded-[1.3rem] sm:px-[1.375rem] sm:py-[1.4rem]',
        className
      )}
    >
      <CardContent className="space-y-0 p-0">
        <header className="space-y-3 sm:space-y-2.5 pb-5 sm:pb-[1.4rem]">
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
              {/* Connector track — sits between nodes, centered on node row height */}
              {steps.slice(0, -1).map((_, index) => {
                const isFilled = index < normalizedActiveIndex;
                return (
                  <div
                    key={`conn-${index}`}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      // Each column is 1/totalSteps wide. Connector spans from
                      // center of column `index` to center of column `index+1`.
                      left:  `calc(${(index + 0.5) / totalSteps * 100}% + 0.75rem)`,
                      right: `calc(${(totalSteps - index - 1.5) / totalSteps * 100}% + 0.75rem)`,
                      // Vertically centered on the node (node height = 1.5rem, label below)
                      top: '0.75rem',
                      transform: 'translateY(-50%)',
                      height: '1.5px',
                      background: 'rgba(30, 58, 95, 0.65)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="step-connector-fill"
                      style={{
                        transform: isFilled ? 'scaleX(1)' : 'scaleX(0)',
                        opacity:   isFilled ? 1 : 0,
                      }}
                    />
                  </div>
                );
              })}

              {/* Columns: node + label, perfectly aligned */}
              {steps.map((step, index) => {
                const isCompleted = index < normalizedActiveIndex;
                const isActive    = index === normalizedActiveIndex;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center gap-[0.5rem]"
                  >
                    {/* Node */}
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
                            color: 'rgba(96,117,139,0.6)',
                            lineHeight: 1,
                          }}
                        >
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Label — centered under node by column grid */}
                    <span
                      className="step-label"
                      style={{
                        color: isActive
                          ? 'var(--landing-text-primary)'
                          : isCompleted
                            ? 'rgba(147,167,189,0.65)'
                            : 'rgba(96,117,139,0.5)',
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

        <div className="space-y-5 border-t border-white/[0.06] pt-5 sm:space-y-4 sm:pt-[1.35rem]">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
