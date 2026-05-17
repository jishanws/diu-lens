import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({
  className,
  type = 'text',
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      suppressHydrationWarning
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-white/10 bg-[#0b1220] px-2.5 py-1 text-base transition-all duration-200 ease-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-500 text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/80 disabled:opacity-50 aria-invalid:border-destructive/50 aria-invalid:ring-2 aria-invalid:ring-destructive/40 md:text-sm',
        className
      )}
      {...props}
    />
  );
}

export { Input };
