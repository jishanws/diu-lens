import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminAccessDenied() {
  return (
    <section className="admin-surface mx-auto grid max-w-2xl gap-5 p-8 text-center">
      <span className="mx-auto rounded-full border border-status-warning/40 bg-status-warning/10 p-3 text-status-warning">
        <ShieldAlert className="size-7" />
      </span>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Super Admin Access Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is available in demo mode for Super Admin only.
        </p>
      </div>
      <div className="flex justify-center gap-3">
        <Button asChild variant="outline" className="border-surface-border bg-transparent text-surface-text hover:bg-white/[0.02]">
          <Link href="/admin/search">Go to Search</Link>
        </Button>
        <Button asChild className="admin-btn-primary">
          <Link href="/admin/login">Switch Role</Link>
        </Button>
      </div>
    </section>
  );
}
