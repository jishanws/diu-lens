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
    <div className="landing-page relative h-[100dvh] w-full overflow-hidden bg-[#111318]">
      {/* Premium minimal background system */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/10 via-[#111318] to-[#111318] hidden lg:block" />
      
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1800px] lg:gap-6 lg:p-6 xl:p-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        
        {/* ── Desktop Sidebar ──────────────────────────────────────── */}
        <aside className="hidden w-[15.5rem] shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-3xl lg:flex">
          <div className="flex h-full flex-col p-5">
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3.5 px-3 pt-4">
              <div className="flex size-[2.2rem] shrink-0 items-center justify-center rounded-[0.85rem] border border-white/[0.04] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <Image src="/branding/logo.png" alt="DIU Lens" width={36} height={36} priority className="size-[1.7rem] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[0.55rem] font-bold uppercase tracking-[0.35em] text-[#8BB8D0]/70">DIU LENS</p>
                <p className="mt-[0.1rem] text-[0.85rem] font-medium tracking-[0.02em] text-slate-100">Admin Console</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-6">
              {navSections.map((section) => (
                <div key={section.title} className="flex flex-col gap-1.5">
                  <p className="mb-2 px-4 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">{section.title}</p>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[0.85rem] font-medium transition-all duration-300 min-h-[44px]',
                          isActive ? 'bg-white/[0.06] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                        )}
                      >
                        <span className={cn('transition-colors', isActive ? 'text-[#8BB8D0]' : 'text-slate-500 group-hover:text-slate-400')}>{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="flex-1" />

            {/* Admin Profile Strip */}
            <div className="group mb-2 mt-6 flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.02]">
              <div className="flex size-[1.85rem] shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.02]">
                <UserCircle2 className="size-4 text-slate-500/70" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.1rem]">
                <p className="truncate text-[0.82rem] font-medium text-slate-200">{admin?.full_name || 'Admin User'}</p>
                <p className="truncate text-[0.65rem] text-slate-500/80">{admin?.email || '-'}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 opacity-0 transition-all hover:bg-rose-500/[0.08] hover:text-rose-400 group-hover:opacity-100 min-h-[44px] min-w-[44px]"
                aria-label="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="relative flex h-full flex-1 flex-col overflow-hidden lg:rounded-[1.75rem] lg:border border-white/[0.03] bg-black lg:bg-white/[0.01] lg:backdrop-blur-xl">
          
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex-none border-b border-white/[0.04] bg-black/80 lg:bg-black/10 px-4 py-4 lg:px-8 lg:py-6 backdrop-blur-md lg:backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/[0.03] text-slate-300 lg:hidden border border-white/[0.05] active:bg-white/[0.05]"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </button>
                <div>
                  <p className="hidden lg:block text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-500">Administration</p>
                  <h1 className="text-[1.15rem] lg:text-[1.35rem] font-medium tracking-tight text-slate-100">{pageTitle}</h1>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="relative flex-1 overflow-y-auto bg-[#111318] px-4 py-6 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
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
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#111318] border-r border-white/[0.04] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4 min-h-[60px]">
                <div className="flex items-center gap-3">
                  <div className="flex size-[1.8rem] items-center justify-center rounded-[0.6rem] bg-white/[0.05]">
                    <Image src="/branding/logo.png" alt="DIU Lens" width={24} height={24} />
                  </div>
                  <span className="text-[0.8rem] font-bold tracking-widest text-[#8BB8D0]">DIU LENS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-slate-400 active:bg-white/[0.05]"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-6">
                <nav className="flex flex-col gap-6">
                  {navSections.map((section) => (
                    <div key={section.title} className="flex flex-col gap-1">
                      <p className="mb-2 px-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">{section.title}</p>
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex min-h-[44px] items-center gap-3.5 rounded-xl px-3 text-[0.9rem] font-medium transition-colors active:scale-[0.98]',
                              isActive ? 'bg-[#8BB8D0]/10 text-[#8BB8D0]' : 'text-slate-300 active:bg-white/[0.05]'
                            )}
                          >
                            <span className={cn(isActive ? 'text-[#8BB8D0]' : 'text-slate-500')}>{item.icon}</span>
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
                  className="flex w-full min-h-[48px] items-center justify-center gap-3 rounded-xl px-3 text-[0.9rem] font-medium text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 border border-rose-500/10"
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
