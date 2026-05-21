'use client';

import { ReactNode } from 'react';
import { AdminAuthProvider } from '@/features/admin/auth/AdminAuthContext';
import { AdminToastProvider } from '@/features/admin/ui/AdminToastProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <ThemeProvider>
        <AdminToastProvider>{children}</AdminToastProvider>
      </ThemeProvider>
    </AdminAuthProvider>
  );
}
