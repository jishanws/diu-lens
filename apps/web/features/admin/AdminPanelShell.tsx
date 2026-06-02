'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderCheck,
  LogOut,
  ScanFace,
  ShieldCheck,
  UserCircle2,
  Activity,
  LineChart,
  Settings,
  Menu,
  X,
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

export function AdminPanelShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobileMenuOpen) {
      setTimeout(() => setIsMobileMenuOpen(false), 0);
    }
  }, [pathname, isMobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const pageTitle = titleMap[pathname] ?? 'Admin Panel';

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#050709]">
      
      {/* ── Environmental Atmosphere ──────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.035)_0%,transparent_60%)] translate-x-[15%]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_120%_at_50%_50%,transparent_30%,#030406_100%)]" />

      {/* Subtle Infrastructure Details (Corners) */}
      <div className="pointer-events-none absolute left-6 top-6 opacity-[0.15] hidden lg:block">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      <div className="pointer-events-none absolute right-6 top-6 opacity-[0.15] hidden lg:block rotate-90">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      <div className="pointer-events-none absolute left-6 bottom-6 opacity-[0.15] hidden lg:block -rotate-90">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>
      <div className="pointer-events-none absolute right-6 bottom-6 opacity-[0.15] hidden lg:block rotate-180">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H8V1H1V8H0V0Z" fill="#6493b5" />
          <path d="M3 3H4V4H3V3Z" fill="#6493b5" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1800px] lg:p-4 xl:p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        
        {/* ── Unified Application Container ──────────────────────────────────────── */}
        <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden lg:rounded-[1.25rem] lg:border lg:border-white/[0.04] lg:bg-[#0a0d12]/60 lg:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] lg:backdrop-blur-3xl">
          
          {/* ── Desktop Sidebar (Operational Rail) ──────────────────────────────────────── */}
          <aside className="hidden w-[16rem] shrink-0 flex-col border-r border-white/[0.04] bg-white/[0.005] lg:flex">
            <div className="flex h-full flex-col p-4 xl:p-5">
              {/* Brand */}
              <div className="mb-10 flex items-center gap-3.5 px-3 pt-3">
                <div className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.6rem] bg-white/[0.02] border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <Image src="/branding/logo-v2.png" alt="DIU Lens" width={32} height={32} priority className="size-[1.2rem] object-contain opacity-90" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[0.55rem] font-bold uppercase tracking-[0.35em] text-[#6493b5]/80">DIU LENS</p>
                  <p className="mt-[0.1rem] text-[0.8rem] font-medium tracking-[0.02em] text-slate-200/90">Admin Console</p>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex flex-col gap-8">
                {navSections.map((section) => (
                  <div key={section.title} className="flex flex-col gap-1.5">
                    <p className="mb-2 px-4 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500/70">{section.title}</p>
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'group relative flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-[0.82rem] font-medium transition-all duration-300 min-h-[40px]',
                            isActive 
                              ? 'bg-gradient-to-r from-[#6493b5]/[0.08] to-transparent text-slate-100 shadow-[inset_2px_0_0_#6493b5]' 
                              : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'
                          )}
                        >
                          <span className={cn('transition-colors', isActive ? 'text-[#6493b5]' : 'text-slate-500/80 group-hover:text-slate-400')}>
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="flex-1" />

              {/* Admin Profile Strip */}
              <div className="group mb-1 mt-6 flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.02]">
                <div className="flex size-[2rem] shrink-0 items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <UserCircle2 className="size-[1.1rem] text-slate-500/70" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.1rem]">
                  <p className="truncate text-[0.8rem] font-medium text-slate-200/90">{admin?.full_name || 'Admin User'}</p>
                  <p className="truncate text-[0.62rem] text-slate-500/70 font-medium">{admin?.email || '-'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition-all hover:bg-rose-500/[0.08] hover:text-rose-400 hover:border hover:border-rose-500/10 group-hover:opacity-100"
                  aria-label="Logout"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            </div>
          </aside>

          {/* ── Main column ──────────────────────────────────────────── */}
          <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-transparent">
            
            {/* Topbar */}
            <header className="sticky top-0 z-30 flex-none border-b border-white/[0.04] bg-[#0a0d12]/80 px-4 py-4 lg:px-8 lg:py-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Button */}
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-lg bg-white/[0.02] text-slate-300 lg:hidden border border-white/[0.05] active:bg-white/[0.05]"
                    aria-label="Open menu"
                  >
                    <Menu className="size-5" />
                  </button>
                  <div>
                    <p className="hidden lg:block text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#6493b5]/60 mb-0.5">Workspace</p>
                    <h1 className="text-[1.15rem] lg:text-[1.25rem] font-medium tracking-tight text-slate-100">{pageTitle}</h1>
                  </div>
                </div>
              </div>
            </header>

            {/* Content (with custom scrollbar styles applied globally) */}
            <main className="admin-workspace-scroll relative flex-1 overflow-y-auto bg-transparent px-4 py-6 lg:px-8 lg:py-8">
              <div className="mx-auto max-w-6xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* ── Mobile Sidebar Drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#0a0d12] border-r border-white/[0.04] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4 min-h-[60px]">
                <div className="flex items-center gap-3">
                  <div className="flex size-[1.8rem] items-center justify-center rounded-[0.6rem] bg-white/[0.02] border border-white/[0.04]">
                    <Image src="/branding/logo-v2.png" alt="DIU Lens" width={24} height={24} className="object-contain opacity-90 size-[1.1rem]" />
                  </div>
                  <span className="text-[0.75rem] font-bold tracking-widest text-[#6493b5]/90">DIU LENS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-[40px] w-[40px] items-center justify-center rounded-lg text-slate-400 active:bg-white/[0.05]"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6">
                <nav className="flex flex-col gap-8">
                  {navSections.map((section) => (
                    <div key={section.title} className="flex flex-col gap-1.5">
                      <p className="mb-2 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500/70">{section.title}</p>
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex min-h-[44px] items-center gap-3.5 rounded-lg px-3 text-[0.85rem] font-medium transition-colors active:scale-[0.98]',
                              isActive 
                                ? 'bg-gradient-to-r from-[#6493b5]/[0.08] to-transparent text-slate-100 shadow-[inset_2px_0_0_#6493b5]' 
                                : 'text-slate-300 active:bg-white/[0.05]'
                            )}
                          >
                            <span className={cn(isActive ? 'text-[#6493b5]' : 'text-slate-500/80')}>{item.icon}</span>
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="border-t border-white/[0.04] p-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-[0.85rem] font-medium text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 border border-rose-500/10"
                >
                  <LogOut className="size-4" />
                  Logout Admin
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
