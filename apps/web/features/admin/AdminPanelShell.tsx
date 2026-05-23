'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderCheck,
  LogOut,
  ScanFace,
  ShieldCheck,
  UserCircle2,
  Activity,
  LineChart,
  Settings,
} from 'lucide-react';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'VERIFICATION',
    items: [
      {
        href: '/admin/recognition',
        label: 'Search',
        icon: <ScanFace className="size-[1.1rem]" />,
      },
      {
        href: '/admin/enrollments',
        label: 'Pending Review',
        icon: <FolderCheck className="size-[1.1rem]" />,
      },
      {
        href: '/admin/approved',
        label: 'Approved Records',
        icon: <ShieldCheck className="size-[1.1rem]" />,
      },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      {
        href: '/admin/audit',
        label: 'Audit Logs',
        icon: <Activity className="size-[1.1rem]" />,
      },
      {
        href: '/admin/analytics',
        label: 'Analytics',
        icon: <LineChart className="size-[1.1rem]" />,
      },
      {
        href: '/admin/settings',
        label: 'Settings',
        icon: <Settings className="size-[1.1rem]" />,
      },
    ]
  }
];

const titleMap: Record<string, string> = {
  '/admin/recognition': 'Search',
  '/admin/approved': 'Approved Records',
  '/admin/enrollments': 'Pending Review',
  '/admin/audit': 'Audit Logs',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
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
    <div className="landing-page relative h-screen w-full overflow-hidden bg-[#03060c]">
      {/* Premium minimal background system */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#03060c] to-[#03060c]" />
      
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1800px] gap-6 p-4 sm:p-6 lg:p-8">
        
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="hidden w-[15.5rem] shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-3xl lg:flex">
          <div className="flex h-full flex-col p-5">
            
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3.5 px-3 pt-4">
              <div className="flex size-[2.2rem] shrink-0 items-center justify-center rounded-[0.85rem] border border-white/[0.04] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <Image
                  src="/branding/logo.png"
                  alt="DIU Lens logo"
                  width={36}
                  height={36}
                  priority
                  className="size-[1.7rem] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[0.55rem] font-bold uppercase tracking-[0.35em] text-cyan-400/70">
                  DIU LENS
                </p>
                <p className="mt-[0.1rem] text-[0.85rem] font-medium tracking-[0.02em] text-slate-100">
                  Admin Console
                </p>
                <Link 
                  href="/"
                  className="group/home mt-1 flex items-center gap-1.5 text-[0.62rem] font-medium text-slate-500/60 transition-all hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                >
                  <span className="transition-transform group-hover/home:-translate-x-0.5">←</span>
                  <span className="tracking-wide">Back to Homepage</span>
                </Link>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-6">
              {navSections.map((section) => (
                <div key={section.title} className="flex flex-col gap-1.5">
                  <p className="mb-2 px-4 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[0.85rem] font-medium transition-all duration-300',
                          isActive
                            ? 'bg-white/[0.06] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                            : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                        )}
                      >
                        <span className={cn('transition-colors', isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400')}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Admin Profile Strip */}
            <div className="group mb-2 mt-6 flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.02]">
              {/* Avatar */}
              <div className="flex size-[1.85rem] shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.02]">
                <UserCircle2 className="size-4 text-slate-500/70" />
              </div>
              
              {/* Text Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.1rem]">
                <p className="truncate text-[0.82rem] font-medium text-slate-200">
                  {admin?.full_name || 'Admin User'}
                </p>
                <p className="truncate text-[0.65rem] text-slate-500/80">
                  {admin?.email || '-'}
                </p>
                <div className="mt-0.5">
                  <span className={cn(
                    'inline-block rounded-full border px-1.5 py-[0.1rem] text-[0.55rem] font-medium tracking-wide',
                    isSuperAdmin 
                      ? 'border-cyan-500/10 bg-cyan-500/[0.03] text-cyan-500/70' 
                      : 'border-slate-500/10 bg-slate-500/[0.03] text-slate-500/70'
                  )}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Logout Icon */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-600 opacity-0 transition-all hover:bg-rose-500/[0.08] hover:text-rose-400 group-hover:opacity-100"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
            
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="relative flex h-full flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.03] bg-white/[0.01] backdrop-blur-xl">
          
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex-none border-b border-white/[0.02] bg-black/10 px-8 py-6 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Administration
                </p>
                <h1 className="mt-1 text-[1.35rem] font-medium tracking-tight text-slate-100">
                  {pageTitle}
                </h1>
              </div>
            </div>

            {/* Mobile nav strip */}
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navSections.flatMap(section => section.items).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[0.8rem] font-medium transition-colors',
                      isActive
                        ? 'border-white/[0.08] bg-white/[0.06] text-slate-100'
                        : 'border-transparent bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
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
          <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

