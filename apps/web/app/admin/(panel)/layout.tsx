'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminPanelShell } from '@/features/admin/AdminPanelShell';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAdminAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div
        className="relative grid min-h-screen place-items-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(15,23,42,1), rgba(2,6,23,1))' }}
      >
        <div aria-hidden="true" className="landing-grid-overlay pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="landing-glow-top-left pointer-events-none absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400/60" />
          <p className="text-[0.8rem] text-slate-500">Restoring admin session…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <AdminPanelShell>{children}</AdminPanelShell>;
}
