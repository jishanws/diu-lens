'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Layers,
  LockKeyhole,
  RadioTower,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  AdminApiAuthError,
  AdminAuditEvent,
  BiometricTaskRecord,
  EnrollmentsMetricsResponse,
  SystemHealthResponse,
  checkApiHealth,
  fetchAdminAuditEvents,
  fetchBiometricTasks,
  fetchEnrollmentMetrics,
  fetchEnrollments,
  fetchSystemHealth,
} from '@/features/admin/api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { EnrollmentRecord } from '@/features/admin/auth/types';
import {
  mergeAuditEvents,
  readSessionOperationalEvents,
  subscribeToOperationEvents,
} from '@/features/admin/operations';
import { cn } from '@/lib/utils';

type StatusTone = 'healthy' | 'nominal' | 'warning' | 'critical' | 'maintenance';

type ServiceStatus = {
  name: string;
  description: string;
  state: 'Operational' | 'Healthy' | 'Delayed' | 'Processing' | 'Maintenance' | 'Offline';
  primarySignal: string;
  secondarySignal: string;
  detail: string;
  tone: StatusTone;
  icon: typeof Server;
};

type MetricModule = {
  label: string;
  value: string;
  detail: string;
  icon: typeof Server;
  tone?: StatusTone;
};

const toneStyles: Record<
  StatusTone,
  {
    text: string;
    bg: string;
    border: string;
    dot: string;
    icon: string;
  }
> = {
  healthy: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/[0.08]',
    border: 'border-emerald-400/[0.16]',
    dot: 'bg-emerald-300',
    icon: 'text-emerald-300',
  },
  nominal: {
    text: 'text-[#8fb4ce]',
    bg: 'bg-[#6493b5]/[0.09]',
    border: 'border-[#6493b5]/[0.18]',
    dot: 'bg-[#6493b5]',
    icon: 'text-[#8fb4ce]',
  },
  warning: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/[0.08]',
    border: 'border-amber-400/[0.16]',
    dot: 'bg-amber-300',
    icon: 'text-amber-300',
  },
  critical: {
    text: 'text-rose-300',
    bg: 'bg-rose-500/[0.08]',
    border: 'border-rose-400/[0.16]',
    dot: 'bg-rose-300',
    icon: 'text-rose-300',
  },
  maintenance: {
    text: 'text-slate-300',
    bg: 'bg-slate-400/[0.07]',
    border: 'border-slate-300/[0.12]',
    dot: 'bg-slate-300',
    icon: 'text-slate-300',
  },
};

function formatDateTime(value: string | null) {
  if (!value) return 'Not reported';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not reported';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not reported';
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

function formatRate(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not reported';
  return `${(value * 100).toFixed(1)}%`;
}

function latestTimestamp(items: Array<string | null | undefined>) {
  return items
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
}

function statusFromHealth(health: SystemHealthResponse | null): StatusTone {
  if (!health) return 'warning';
  if (health.current_status === 'critical') return 'critical';
  if (health.current_status === 'degraded') return 'warning';
  return 'healthy';
}

function actionLabel(type: string) {
  const labels: Record<string, string> = {
    admin_login: 'Admin login',
    admin_logout: 'Admin logout',
    enrollment_created: 'Enrollment submitted',
    enrollment_validated: 'Enrollment submitted',
    enrollment_approved: 'Record moved to approved',
    enrollment_rejected: 'Verification rejected',
    enrollment_reset: 'Record reset',
    processing_completed: 'Face embedding generated',
    processing_failed: 'Embedding processing failed',
    recognition_search_executed: 'Search executed',
    similarity_scan_executed: 'Similarity scan executed',
    similarity_scan_failed: 'Similarity scan failed',
    verification_approved: 'Verification approved',
    verification_rejected: 'Verification rejected',
    manual_review_opened: 'Manual review opened',
    face_embedding_generated: 'Face embedding generated',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
}

function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const styles = toneStyles[tone];
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium', styles.bg, styles.border, styles.text)}>
      <span className={cn('size-1.5 rounded-full', styles.dot, tone === 'healthy' && 'animate-pulse')} />
      {label}
    </span>
  );
}

export function SystemStatusView() {
  const router = useRouter();
  const { token, admin, clearSession } = useAdminAuth();

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [metrics, setMetrics] = useState<EnrollmentsMetricsResponse | null>(null);
  const [tasks, setTasks] = useState<BiometricTaskRecord[]>([]);
  const [backendEvents, setBackendEvents] = useState<AdminAuditEvent[]>([]);
  const [sessionEvents, setSessionEvents] = useState<AdminAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const loadStatus = useCallback(
    async (showLoading: boolean) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);
      setLoadErrors([]);

      const [apiResult, healthResult, enrollmentResult, metricsResult, tasksResult, auditResult] =
        await Promise.allSettled([
          checkApiHealth(),
          fetchSystemHealth(token),
          fetchEnrollments(token),
          fetchEnrollmentMetrics(token),
          fetchBiometricTasks(token, 20),
          fetchAdminAuditEvents(token, 40),
        ]);

      if (apiResult.status === 'fulfilled') setApiOnline(apiResult.value);
      else setApiOnline(false);

      const nextErrors: string[] = [];
      const results = [healthResult, enrollmentResult, metricsResult, tasksResult, auditResult];
      if (results.some((result) => result.status === 'rejected' && result.reason instanceof AdminApiAuthError)) {
        clearSession();
        router.replace('/admin/login?next=%2Fadmin%2Fsystem-status');
        return;
      }

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      else {
        setHealth(null);
        nextErrors.push('System health diagnostics unavailable.');
      }

      if (enrollmentResult.status === 'fulfilled') setEnrollments(enrollmentResult.value);
      else nextErrors.push('Enrollment registry snapshot unavailable.');

      if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value);
      else nextErrors.push('Enrollment metrics unavailable.');

      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value);
      else nextErrors.push('Biometric task queue unavailable.');

      if (auditResult.status === 'fulfilled') setBackendEvents(auditResult.value);
      else nextErrors.push('Audit event stream unavailable.');

      setSessionEvents(readSessionOperationalEvents());
      setLoadErrors(nextErrors);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [clearSession, router, token]
  );

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line
    void loadStatus(true);
  }, [loadStatus, token]);

  useEffect(() => {
    // eslint-disable-next-line
    setSessionEvents(readSessionOperationalEvents());
    return subscribeToOperationEvents(() => setSessionEvents(readSessionOperationalEvents()));
  }, []);

  const auditEvents = useMemo(
    () => mergeAuditEvents(backendEvents, sessionEvents),
    [backendEvents, sessionEvents]
  );

  const latestEnrollment = useMemo(() => {
    return enrollments.find((item) => item.updated_at || item.created_at) ?? null;
  }, [enrollments]);

  const latestRecognition = useMemo(() => {
    return auditEvents.find((event) => event.source === 'recognition' || event.action_type.includes('scan')) ?? null;
  }, [auditEvents]);

  const latestTask = tasks[0] ?? null;
  const queueDepth = health?.queue_depth ?? tasks.filter((task) => task.status === 'queued').length;
  const activeWorkers = health?.active_workers ?? 0;
  const recentFailedTasks = tasks.filter((task) => task.status === 'failed').length;
  const lastSyncMs = latestTimestamp([
    latestEnrollment?.updated_at,
    latestEnrollment?.created_at,
    latestTask?.completed_at,
    latestTask?.created_at,
    auditEvents[0]?.timestamp,
  ]);

  const serviceStatuses = useMemo<ServiceStatus[]>(() => {
    const healthTone = statusFromHealth(health);
    const degraded = new Set(health?.degraded_components ?? []);
    const queueOffline = degraded.has('redis') || degraded.has('celery_workers');
    const queueDelayed = queueDepth > 0 && activeWorkers === 0;
    const recognitionDuration = formatDuration(health?.avg_recognition_duration);
    const processingDuration = formatDuration(health?.avg_processing_duration);

    return [
      {
        name: 'API Gateway',
        description: 'Admin and biometric API ingress',
        state: apiOnline ? 'Operational' : 'Offline',
        primarySignal: apiOnline ? 'Health endpoint returned OK' : 'Health endpoint unreachable',
        secondarySignal: 'Endpoint: /health',
        detail: apiOnline ? 'Requests can reach the FastAPI service.' : 'Admin client cannot confirm API availability.',
        tone: apiOnline ? 'healthy' : 'critical',
        icon: RadioTower,
      },
      {
        name: 'Database',
        description: 'PostgreSQL operational store',
        state: health && !degraded.has('postgres') ? 'Healthy' : health ? 'Offline' : 'Maintenance',
        primarySignal: health ? `Diagnostics state: ${health.current_status}` : 'Diagnostics not reported',
        secondarySignal: `${enrollments.length} enrollment records loaded`,
        detail: degraded.has('postgres') ? 'Database listed as degraded by health diagnostics.' : 'Registry queries completed from admin endpoints.',
        tone: degraded.has('postgres') ? 'critical' : health ? healthTone : 'maintenance',
        icon: Database,
      },
      {
        name: 'Queue Processor',
        description: 'Celery biometric workload',
        state: queueOffline ? 'Offline' : queueDelayed ? 'Delayed' : queueDepth > 0 ? 'Processing' : 'Healthy',
        primarySignal: `${queueDepth} queued task${queueDepth === 1 ? '' : 's'}`,
        secondarySignal: `${activeWorkers} active worker${activeWorkers === 1 ? '' : 's'}`,
        detail: processingDuration === 'Not reported' ? 'No completed task duration reported in the current health window.' : `Average processing duration: ${processingDuration}.`,
        tone: queueOffline ? 'critical' : queueDelayed ? 'warning' : queueDepth > 0 ? 'nominal' : 'healthy',
        icon: Layers,
      },
      {
        name: 'Recognition Service',
        description: 'Face matching and vector search',
        state: apiOnline ? 'Operational' : 'Offline',
        primarySignal: `Last request: ${latestRecognition ? formatDateTime(latestRecognition.timestamp) : 'Not reported'}`,
        secondarySignal: `Average duration: ${recognitionDuration}`,
        detail: latestRecognition ? latestRecognition.detail : 'No recognition audit record is available in the current stream.',
        tone: apiOnline ? 'nominal' : 'critical',
        icon: Cpu,
      },
      {
        name: 'Storage',
        description: 'Enrollment image and evidence archive',
        state: enrollments.length > 0 || apiOnline ? 'Operational' : 'Maintenance',
        primarySignal: `${enrollments.length} registry row${enrollments.length === 1 ? '' : 's'} available`,
        secondarySignal: `Last enrollment: ${latestEnrollment ? formatDateTime(latestEnrollment.updated_at || latestEnrollment.created_at) : 'Not reported'}`,
        detail: 'Storage availability is inferred from successful enrollment registry and evidence metadata retrieval.',
        tone: enrollments.length > 0 || apiOnline ? 'healthy' : 'maintenance',
        icon: HardDrive,
      },
      {
        name: 'Admin Session',
        description: 'Authenticated operator workspace',
        state: admin ? 'Operational' : 'Offline',
        primarySignal: admin?.email ?? 'No active admin identity',
        secondarySignal: admin?.role ? `Role: ${admin.role}` : 'Role not reported',
        detail: admin ? 'Console session is authenticated through the admin auth provider.' : 'No active admin session is available.',
        tone: admin ? 'healthy' : 'critical',
        icon: ShieldCheck,
      },
    ];
  }, [activeWorkers, admin, apiOnline, enrollments.length, health, latestEnrollment, latestRecognition, queueDepth]);

  const metricModules = useMemo<MetricModule[]>(() => [
    {
      label: 'Pending Reviews',
      value: String(metrics?.pending_review ?? enrollments.filter((item) => item.status === 'validated').length),
      detail: 'Validated enrollments awaiting admin action',
      icon: Users,
      tone: queueDepth > 0 ? 'warning' : 'nominal',
    },
    {
      label: 'Approved Today',
      value: String(metrics?.approved_today ?? 0),
      detail: 'Counted from persisted approval audit events',
      icon: CheckCircle2,
      tone: 'healthy',
    },
    {
      label: 'Rejected Today',
      value: String(metrics?.rejected_today ?? 0),
      detail: 'Counted from persisted rejection audit events',
      icon: XCircle,
      tone: metrics?.rejected_today ? 'warning' : 'maintenance',
    },
    {
      label: 'Recognition Queue Depth',
      value: String(queueDepth),
      detail: 'Queued biometric processing tasks',
      icon: Layers,
      tone: queueDepth > 0 ? 'warning' : 'healthy',
    },
    {
      label: 'Last Synchronization',
      value: lastSyncMs ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSyncMs)) : 'None',
      detail: lastSyncMs ? formatDateTime(new Date(lastSyncMs).toISOString()) : 'No backend event reported yet',
      icon: Clock,
    },
    {
      label: 'Failed Tasks',
      value: String(recentFailedTasks),
      detail: 'Recent task records returned by backend',
      icon: ShieldAlert,
      tone: recentFailedTasks > 0 ? 'critical' : 'healthy',
    },
  ], [enrollments, lastSyncMs, metrics, queueDepth, recentFailedTasks]);

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-2.5 px-6 py-16 text-[0.85rem] text-slate-500">
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-[#6493b5]/60" />
        Loading system status…
      </div>
    );
  }

  return (
    <div className="min-h-full pb-2 text-slate-100">
      <section className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.04] bg-[#0b0f14]/80 p-4 sm:p-6 md:p-7 shadow-[0_14px_42px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(100,147,181,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(100,147,181,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#6493b5]/15 bg-[#6493b5]/[0.07] px-3 py-1.5 text-[0.72rem] font-medium text-[#9bbbd2]">
              <Activity className="size-3.5" />
              Live operational workspace
            </div>
            <h2 className="text-[1.35rem] font-semibold text-slate-50 sm:text-[1.55rem]">System Status</h2>
            <p className="mt-2 max-w-xl text-[0.86rem] leading-6 text-slate-400">
              Current platform state derived from API health, backend diagnostics, enrollment registry, task queue, and audit records.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-lg border border-white/[0.05] bg-black/15 px-3 py-2">
              <p className="text-[0.65rem] text-slate-500">Control State</p>
              <p className={cn('mt-1 text-[0.8rem] font-medium', toneStyles[statusFromHealth(health)].text)}>
                {health?.current_status ?? (apiOnline ? 'partial' : 'offline')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadStatus(false)}
              disabled={isRefreshing}
              className="rounded-lg border border-white/[0.05] bg-black/15 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
            >
              <p className="text-[0.65rem] text-slate-500">Refresh</p>
              <p className="mt-1 flex items-center gap-2 text-[0.8rem] font-medium text-[#9bbbd2]">
                <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
                Pull state
              </p>
            </button>
          </div>
        </div>
      </section>

      {loadErrors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-500/[0.06] p-4 text-[0.78rem] text-amber-200">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>{loadErrors.join(' ')}</p>
          </div>
        </div>
      ) : null}

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[0.95rem] font-semibold text-slate-100">System Health</h3>
            <p className="mt-1 text-[0.75rem] text-slate-500">Signals reported by active backend endpoints and current admin state.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[0.7rem] text-slate-400 sm:flex">
            <span className={cn('size-1.5 rounded-full', apiOnline ? 'bg-emerald-300' : 'bg-rose-300')} />
            API {apiOnline ? 'reachable' : 'unreachable'}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {serviceStatuses.map((service) => {
            const Icon = service.icon;
            const styles = toneStyles[service.tone];

            return (
              <article key={service.name} className="rounded-[1rem] border border-white/[0.04] bg-[#0c1015]/78 p-4 sm:p-5 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:bg-[#0c1015]/90">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg border', styles.bg, styles.border)}>
                      <Icon className={cn('size-4.5', styles.icon)} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[0.88rem] font-semibold text-slate-100">{service.name}</h4>
                      <p className="mt-1 text-[0.72rem] leading-5 text-slate-500">{service.description}</p>
                    </div>
                  </div>
                  <StatusPill tone={service.tone} label={service.state} />
                </div>

                <div className="mt-5 grid gap-2">
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                    <p className="text-[0.62rem] text-slate-500">Primary signal</p>
                    <p className="mt-1 text-[0.78rem] font-medium text-slate-200">{service.primarySignal}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                      <p className="text-[0.62rem] text-slate-500">Secondary</p>
                      <p className="mt-1 truncate text-[0.76rem] font-medium text-slate-300">{service.secondarySignal}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                      <p className="text-[0.62rem] text-slate-500">Detail</p>
                      <p className={cn('mt-1 truncate text-[0.76rem] font-medium', styles.text)}>{service.detail}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/78 p-4 shadow-[0_14px_38px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-6">
          <div className="mb-4">
            <h3 className="text-[0.95rem] font-semibold text-slate-100">System Activity</h3>
            <p className="mt-1 text-[0.75rem] text-slate-500">Recent backend audit rows and actions from this console session.</p>
          </div>

          {auditEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[0.85rem] border border-white/[0.04] bg-white/[0.01] p-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.05]">
                <Activity className="size-4.5 text-slate-500/70" />
              </div>
              <p className="text-[0.8rem] text-slate-500">No operational events have been reported yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] overflow-hidden rounded-[1rem] border border-white/[0.04] bg-black/[0.12]">
              {auditEvents.slice(0, 8).map((event) => {
                const tone: StatusTone =
                  event.operation_result === 'failed'
                    ? 'critical'
                    : event.operation_result === 'review_required'
                    ? 'warning'
                    : event.source === 'session'
                    ? 'nominal'
                    : 'healthy';
                const styles = toneStyles[tone];

                return (
                  <div key={event.id} className="grid gap-3 p-3.5 transition-colors duration-200 hover:bg-white/[0.018] sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative mt-1 flex size-6 shrink-0 items-center justify-center">
                        <span className={cn('absolute size-2 rounded-full', styles.dot)} />
                        <span className={cn('size-5 rounded-full border', styles.border, styles.bg)} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-[0.82rem] font-medium capitalize text-slate-200">{actionLabel(event.action_type)}</p>
                          {event.affected_record ? (
                            <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-1.5 py-0.5 text-[0.63rem] font-medium text-slate-500">
                              {event.affected_record}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[0.74rem] leading-5 text-slate-500">{event.detail}</p>
                      </div>
                    </div>
                    <p className="pl-9 text-[0.7rem] text-slate-500 sm:pl-0 sm:text-right">{formatDateTime(event.timestamp)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/78 p-4 shadow-[0_14px_38px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-6">
          <div className="mb-4">
            <h3 className="text-[0.95rem] font-semibold text-slate-100">Infrastructure Readings</h3>
            <p className="mt-1 text-[0.75rem] text-slate-500">Small counters from backend state, not business analytics.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {metricModules.map((metric) => {
              const Icon = metric.icon;
              const styles = toneStyles[metric.tone ?? 'nominal'];

              return (
                <article key={metric.label} className="flex items-center gap-3 rounded-[1rem] border border-white/[0.04] bg-black/[0.12] p-4 transition-all hover:bg-black/[0.2]">
                  <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg border', styles.bg, styles.border)}>
                    <Icon className={cn('size-4', styles.icon)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[0.76rem] font-medium text-slate-300">{metric.label}</p>
                      <p className={cn('shrink-0 text-[0.95rem] font-semibold', metric.tone ? styles.text : 'text-slate-100')}>{metric.value}</p>
                    </div>
                    <p className="mt-1 truncate text-[0.68rem] text-slate-500">{metric.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 rounded-[1rem] border border-white/[0.04] bg-black/[0.12] p-4">
            <div className="flex items-center gap-2 text-[0.76rem] font-medium text-slate-300">
              <Gauge className="size-4 text-[#8fb4ce]" />
              Diagnostics Window
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[0.68rem] text-slate-500">
              <p>Retry rate: <span className="text-slate-300">{formatRate(health?.retry_rate)}</span></p>
              <p>Failure rate: <span className="text-slate-300">{formatRate(health?.failed_task_rate)}</span></p>
              <p>Processing: <span className="text-slate-300">{formatDuration(health?.avg_processing_duration)}</span></p>
              <p>Recognition: <span className="text-slate-300">{formatDuration(health?.avg_recognition_duration)}</span></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
