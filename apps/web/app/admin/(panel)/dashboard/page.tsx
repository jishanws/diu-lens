import Link from 'next/link';
import { ArrowRight, CircleCheckBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminAccessDenied } from '@/features/admin/AdminAccessDenied';
import { dashboardStats, quickActions, recentActivity } from '@/features/admin/mock-data';
import { getMockRoleFromCookies } from '@/features/admin/role';

const statusStyles: Record<string, string> = {
  match_found: 'border-status-healthy/30 bg-status-healthy/20 text-status-healthy',
  review_needed: 'border-status-warning/30 bg-status-warning/20 text-status-warning',
  no_match: 'border-status-danger/30 bg-status-danger/20 text-status-danger',
};

export default async function AdminDashboardPage() {
  const role = await getMockRoleFromCookies();

  if (role !== 'super') {
    return <AdminAccessDenied />;
  }

  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {dashboardStats.map((stat) => (
          <div key={stat.label} className="admin-surface flex flex-col gap-1 sm:gap-1.5 p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors">
            <p className="text-[0.65rem] sm:text-[0.7rem] font-medium uppercase tracking-[0.15em] text-surface-text-muted">
              {stat.label}
            </p>
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-surface-text">
              {stat.value}
            </p>
            <p className="text-[0.65rem] text-surface-text-muted mt-1">
              {stat.hint}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-border bg-card text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Search Activity</CardTitle>
            <CardDescription className="text-muted-foreground">
              Latest actions performed in the identification workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <article
                key={activity.id}
                className="admin-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-foreground">{activity.action}</h3>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusStyles[activity.status]}`}
                  >
                    {activity.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{activity.summary}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {activity.adminName} • {activity.timestamp} • {activity.searchId}
                </p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Jump directly to common workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((item) => (
              <div key={item.title} className="admin-surface p-3">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="mt-3 border-border bg-transparent text-foreground hover:bg-muted"
                >
                  <Link href={item.href}>
                    Open
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ))}

            <div className="rounded-xl border border-status-healthy/20 bg-status-healthy/10 p-3 text-xs text-status-healthy">
              <p className="flex items-center gap-2 font-medium">
                <CircleCheckBig className="size-4" />
                System monitor reports healthy services.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
