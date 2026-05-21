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
    <div className="landing-page relative h-screen w-full overflow-hidden">
      {/* Background atmosphere exactly matching homepage */}
      <div aria-hidden="true" className="landing-vignette pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="landing-glow-top-left pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="landing-glow-bottom-right pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1720px]">
        
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="hidden w-[17.5rem] shrink-0 flex-col border-r border-white/[0.04] bg-[#040810]/40 backdrop-blur-2xl lg:flex">
          <div className="flex h-full flex-col p-6">
            
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3.5 px-2 pt-2">
              <div className="flex size-9 items-center justify-center rounded-[0.7rem] border border-white/[0.08] bg-white/[0.02] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="size-[0.4rem] rounded-full bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.6)]" />
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
                        ? 'border border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                        : 'border border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_14px_2px_rgba(34,211,238,0.5)]" />
                    )}
                    <span className={cn('transition-colors', isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'text-slate-500 group-hover:text-slate-400')}>
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
            <div className="mt-6 rounded-[1.25rem] border border-white/[0.05] bg-white/[0.01] p-4 transition-colors hover:bg-white/[0.02]">
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <UserCircle2 className="size-5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.88rem] font-medium text-slate-100">
                    {admin?.full_name || 'Admin User'}
                  </p>
                  <p className="truncate text-[0.72rem] text-slate-500">
                    {admin?.email || '-'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-4">
                <span className={cn(
                  'admin-badge',
                  isSuperAdmin ? 'admin-badge-approved' : 'admin-badge-info'
                )}>
                  {roleLabel}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex size-8 items-center justify-center rounded-[0.55rem] text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label="Logout"
                >
                  <LogOut className="size-[1.1rem]" />
                </button>
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
                <h1 className="mt-0.5 text-[1.3rem] font-medium tracking-tight text-white">
                  {pageTitle}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-2 rounded-full border border-white/[0.05] bg-black/20 px-3 py-1.5 text-[0.8rem] font-medium text-slate-300 sm:inline-flex">
                  <UserCircle2 className="size-4 text-slate-500" />
                  {admin?.email || 'admin'}
                </span>
                <span className={cn(
                  'admin-badge',
                  isSuperAdmin ? 'admin-badge-approved' : 'admin-badge-info'
                )}>
                  {roleLabel}
                </span>
                <div className="mx-1 h-5 w-px bg-white/[0.06]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="admin-btn-ghost group text-slate-400 hover:text-slate-200"
                >
                  <LogOut className="size-4 opacity-70 transition-transform group-hover:scale-110" />
                  Logout
                </button>
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

