'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderCheck,
  LogOut,
  ScanFace,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    href: '/admin/enrollments',
    label: 'Enrollments',
    icon: <FolderCheck className="size-[1.1rem]" />,
  },
  {
    href: '/admin/approved',
    label: 'Approved',
    icon: <ShieldCheck className="size-[1.1rem]" />,
  },
  {
    href: '/admin/recognition',
    label: 'Recognition',
    icon: <ScanFace className="size-[1.1rem]" />,
  },
];

const titleMap: Record<string, string> = {
  '/admin/enrollments': 'Enrollment Moderation',
  '/admin/approved': 'Approved Management',
  '/admin/recognition': 'Recognition',
};

const roleLabelMap: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
};

export function AdminPanelShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  const pageTitle = titleMap[pathname] ?? 'Admin Panel';
  const roleLabel = roleLabelMap[admin?.role || ''] ?? 'Admin';
  const isSuperAdmin = admin?.role === 'super_admin';

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <div className="landing-page relative h-screen w-full overflow-hidden bg-[#040810]">
      {/* Background atmosphere exactly matching homepage, but toned down for admin readability */}
      <div aria-hidden="true" className="landing-vignette pointer-events-none absolute inset-0 opacity-80" />
      <div aria-hidden="true" className="landing-glow-top-left pointer-events-none absolute inset-0 opacity-[0.25]" />
      <div aria-hidden="true" className="landing-glow-bottom-right pointer-events-none absolute inset-0 opacity-[0.25]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1720px]">
        
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="hidden w-[17.5rem] shrink-0 flex-col border-r border-white/[0.03] bg-[#03060c]/40 backdrop-blur-2xl lg:flex">
          <div className="flex h-full flex-col p-6">
            
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3.5 px-2 pt-2">
              <div className="flex size-9 items-center justify-center rounded-[0.7rem] border border-white/[0.04] bg-white/[0.01] shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
                <div className="size-[0.4rem] rounded-full bg-cyan-400/80 shadow-[0_0_8px_1px_rgba(34,211,238,0.4)]" />
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.25em] text-slate-500">
                  DIU Lens
                </p>
                <p className="mt-0.5 text-[0.95rem] font-medium tracking-wide text-slate-100">
                  Admin Console
                </p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-2">
              <p className="mb-3 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">
                Menu
              </p>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3.5 rounded-[1.1rem] px-4 py-3.5 text-[0.9rem] font-medium transition-all duration-300',
                      isActive
                        ? 'border border-cyan-500/10 bg-cyan-500/[0.04] text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                        : 'border border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-500/80 shadow-[0_0_10px_1px_rgba(34,211,238,0.3)]" />
                    )}
                    <span className={cn('transition-colors', isActive ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.2)]' : 'text-slate-500 group-hover:text-slate-400')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Admin info */}
            <div className="mt-6 rounded-[1.25rem] border border-white/[0.04] bg-white/[0.01] p-4 transition-colors hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.05] bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <UserCircle2 className="size-4.5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.85rem] font-medium text-slate-200">
                    {admin?.full_name || 'Admin User'}
                  </p>
                </div>
              </div>
              
              <div className="mt-3.5 space-y-1.5 px-0.5">
                <p className="truncate text-[0.7rem] text-slate-500">
                  {admin?.email || '-'}
                </p>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium tracking-wide',
                    isSuperAdmin 
                      ? 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400/80' 
                      : 'border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-400/80'
                  )}>
                    {roleLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex size-7 items-center justify-center rounded-lg text-slate-500/70 transition-all hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogOut className="size-[0.95rem]" />
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="flex h-full flex-1 flex-col overflow-y-auto">
          
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-white/[0.03] bg-[#040810]/60 px-6 py-4 backdrop-blur-2xl sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.24em] text-slate-500">
                  Administration
                </p>
                <h1 className="mt-0.5 text-[1.3rem] font-medium tracking-tight text-slate-100">
                  {pageTitle}
                </h1>
              </div>
            </div>

            {/* Mobile nav strip */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] font-medium transition-colors',
                      isActive
                        ? 'border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300'
                        : 'border-white/[0.04] bg-white/[0.02] text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-6 py-8 sm:px-10 sm:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

