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
  Server,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { recordOperationEvent } from '@/features/admin/operations';
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
        href: '/admin/system-status',
        label: 'System Status',
        icon: <Server className="size-[1.1rem]" />,
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
  '/admin/system-status': 'System Status',
  '/admin/settings': 'Settings',
};

export function AdminPanelShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Focus management and escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

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
    recordOperationEvent({
      actionType: 'admin_logout',
      operatorIdentity: admin?.email || 'Unknown admin',
      result: 'success',
      detail: 'Admin session terminated from console.',
    });
    logout();
    router.replace('/admin/login');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#050709]">
      
      {/* ── Environmental Atmosphere (Optimized) ─────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:flex items-center justify-center">
        <div className="h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,147,181,0.035)_0%,transparent_60%)] translate-x-[15%]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block bg-[radial-gradient(ellipse_120%_120%_at_50%_50%,transparent_30%,#030406_100%)]" />
      
      {/* Mobile-only fallback ambient light (low GPU cost) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#6493b5]/[0.03] to-transparent md:hidden" />


      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[1800px] md:p-4 lg:p-6 md:pt-[env(safe-area-inset-top)] md:pb-[env(safe-area-inset-bottom)]">
        
        {/* ── Unified Application Container ──────────────────────────────────────── */}
        <div className="flex h-full w-full flex-col md:flex-row overflow-hidden md:rounded-[1.25rem] md:border md:border-white/[0.04] md:bg-[#0a0d12]/60 md:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] md:backdrop-blur-xl lg:backdrop-blur-3xl">
          
          {/* ── Desktop & Tablet Sidebar (Operational Rail) ──────────────────────────────────────── */}
          <aside className="hidden w-[15rem] lg:w-[16rem] shrink-0 flex-col border-r border-white/[0.04] bg-white/[0.005] md:flex">
            <div className="flex h-full flex-col p-4 xl:p-5">
              {/* Brand */}
              <div className="mb-10 flex items-center gap-3 px-2 lg:px-3 pt-3">
                <div className="flex size-[1.8rem] lg:size-[2rem] shrink-0 items-center justify-center rounded-[0.6rem] bg-white/[0.02] border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <Image src="/branding/logo-v2.png" alt="DIU Lens" width={32} height={32} priority className="size-[1.1rem] lg:size-[1.2rem] object-contain opacity-90" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[0.55rem] font-bold uppercase tracking-[0.35em] text-[#6493b5]/80">DIU LENS</p>
                  <p className="mt-[0.1rem] text-[0.75rem] lg:text-[0.8rem] font-medium tracking-[0.02em] text-slate-200/90">Admin Console</p>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex flex-col gap-8 lg:gap-10">
                {navSections.map((section) => (
                  <div key={section.title} className="flex flex-col gap-2">
                    <p className="mb-2 lg:mb-3 px-4 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-slate-500/60">{section.title}</p>
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'group relative flex items-center gap-3.5 rounded-r-full px-4 py-2.5 text-[0.8rem] lg:text-[0.85rem] font-medium transition-all duration-300 min-h-[44px] -ml-4 pl-8 border border-transparent',
                            isActive 
                              ? 'bg-gradient-to-r from-[#6493b5]/[0.15] to-transparent text-slate-100 shadow-[inset_3px_0_0_#6493b5] border-y-[#6493b5]/10 border-r-[#6493b5]/10' 
                              : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                          )}
                        >
                          <span className={cn('transition-all shrink-0 flex items-center justify-center', isActive ? 'text-[#6493b5] drop-shadow-[0_0_12px_rgba(100,147,181,0.6)]' : 'text-slate-500/70 group-hover:text-slate-400 group-hover:scale-105')}>
                            {item.icon}
                          </span>
                          <span className="truncate pt-[0.05rem]">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="flex-1" />

              {/* Admin Profile Strip */}
              <div className="group mb-1 mt-4 lg:mt-6 flex items-center gap-2.5 lg:gap-3 rounded-xl p-2 lg:p-2.5 transition-colors hover:bg-white/[0.02]">
                <div className="flex size-[1.8rem] lg:size-[2rem] shrink-0 items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <UserCircle2 className="size-[1rem] lg:size-[1.1rem] text-slate-500/70" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.1rem]">
                  <p className="truncate text-[0.75rem] lg:text-[0.8rem] font-medium text-slate-200/90">{admin?.full_name || 'Admin User'}</p>
                  <p className="truncate text-[0.62rem] text-slate-500/70 font-medium">{admin?.email || '-'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex size-7 lg:size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition-all hover:bg-rose-500/[0.08] hover:text-rose-400 hover:border hover:border-rose-500/10 group-hover:opacity-100"
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
            <header className="sticky top-0 z-30 flex-none border-b border-white/[0.04] bg-[#0a0d12]/95 md:bg-[#0a0d12]/90 px-3 py-2 sm:px-5 md:px-6 md:py-4 lg:px-8 lg:py-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Button - Sleek & Premium */}
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.04] text-slate-300 active:scale-95 transition-all shadow-sm"
                    aria-label="Open menu"
                  >
                    <Menu className="size-4" strokeWidth={2.5} />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="md:hidden flex size-7 items-center justify-center rounded-[0.4rem] bg-white/[0.02] border border-white/[0.04]">
                      <Image src="/branding/logo-v2.png" alt="DIU Lens" width={24} height={24} priority className="size-4 object-contain opacity-90" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="hidden md:block text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#6493b5]/60 mb-0.5">Workspace</p>
                      <h1 className="text-[1.05rem] md:text-[1.15rem] lg:text-[1.25rem] font-semibold tracking-tight text-white md:text-slate-100">{pageTitle}</h1>
                    </div>
                  </div>
                </div>
                {/* Mobile Profile Trigger */}
                <button type="button" className="md:hidden flex items-center gap-2 rounded-full border border-white/[0.04] bg-[#0c1015] p-1 pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] active:scale-95 transition-transform">
                  <span className="text-[0.65rem] font-medium text-slate-400">{admin?.full_name?.split(' ')[0] || 'Admin'}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.03]">
                    <UserCircle2 className="size-4 text-[#6493b5]" />
                  </div>
                </button>
              </div>
            </header>

            {/* Content (with custom scrollbar styles applied globally) */}
            <main className="admin-workspace-scroll relative flex-1 overflow-y-auto bg-transparent p-3 sm:p-5 md:p-6 lg:p-8">
              <div className="mx-auto max-w-6xl min-h-full">
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              drag="x"
              dragConstraints={{ left: -280, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -100 || velocity.x < -500) {
                  setIsMobileMenuOpen(false);
                }
              }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#0a0d12] border-r border-white/[0.04] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4 min-h-[60px] bg-[#0a0d12]">
                <div className="flex items-center gap-3">
                  <div className="flex size-[1.8rem] items-center justify-center rounded-[0.6rem] bg-white/[0.02] border border-white/[0.04]">
                    <Image src="/branding/logo-v2.png" alt="DIU Lens" width={24} height={24} className="object-contain opacity-90 size-[1.1rem]" />
                  </div>
                  <span className="text-[0.75rem] font-bold tracking-widest text-[#6493b5]/90">DIU LENS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.04] text-slate-400 active:scale-95"
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 admin-workspace-scroll">
                <nav className="flex flex-col gap-8">
                  {navSections.map((section) => (
                    <div key={section.title} className="flex flex-col gap-2">
                      <p className="mb-1 px-3 text-[0.6rem] font-bold uppercase tracking-[0.25em] text-slate-500/60">{section.title}</p>
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              'flex min-h-[44px] items-center gap-3.5 rounded-xl px-3 text-[0.85rem] font-medium transition-colors active:scale-[0.98] border border-transparent',
                              isActive 
                                ? 'bg-[#6493b5]/10 text-[#a9c6d9] border-[#6493b5]/20' 
                                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                            )}
                          >
                            <span className={cn('shrink-0 flex items-center justify-center', isActive ? 'text-[#6493b5]' : 'text-slate-500/70')}>{item.icon}</span>
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="border-t border-white/[0.04] p-4 bg-[#0a0d12]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/[0.01] px-3 text-[0.85rem] font-medium text-rose-400 active:bg-rose-500/10 border border-white/[0.04] transition-colors"
                >
                  <LogOut className="size-4" />
                  Logout Session
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
