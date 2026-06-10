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
  state: string;
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
    text: 'text-[#8fb4ce]',
    bg: 'bg-[#6493b5]/[0.06]',
    border: 'border-[#6493b5]/[0.12]',
    dot: 'bg-[#6493b5]',
    icon: 'text-[#8fb4ce]',
  },
  nominal: {
    text: 'text-slate-300',
    bg: 'bg-white/[0.03]',
    border: 'border-white/[0.06]',
    dot: 'bg-slate-400',
    icon: 'text-slate-400',
  },
  warning: {
    text: 'text-amber-200',
    bg: 'bg-amber-500/[0.06]',
    border: 'border-amber-400/[0.12]',
    dot: 'bg-amber-400',
    icon: 'text-amber-400',
  },
  critical: {
    text: 'text-rose-200',
    bg: 'bg-rose-500/[0.06]',
    border: 'border-rose-400/[0.12]',
    dot: 'bg-rose-400',
    icon: 'text-rose-400',
  },
  maintenance: {
    text: 'text-slate-400',
    bg: 'bg-white/[0.02]',
    border: 'border-white/[0.05]',
    dot: 'bg-slate-500',
    icon: 'text-slate-400',
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
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.68rem] font-medium tracking-wide', styles.bg, styles.border, styles.text)}>
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

      if (auditResult.status === 'fulfilled') setBackendEvents(auditResult.value.items);
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

  const { globalStatus, globalTone, serviceStatuses } = useMemo<{ globalStatus: string; globalTone: StatusTone; serviceStatuses: ServiceStatus[] }>(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const degraded = new Set(health?.degraded_components ?? []);
    const queueDepthStr = queueDepth > 0 ? String(queueDepth) : '0';
    const activeWorkersStr = activeWorkers > 0 ? String(activeWorkers) : '0';
    
    const recognitionDuration = formatDuration(health?.avg_recognition_duration);
    const processingDuration = formatDuration(health?.avg_processing_duration);

    // API Gateway
    const apiState = apiOnline ? 'Healthy' : 'Critical';
    const apiTone: StatusTone = apiOnline ? 'healthy' : 'critical';
    const apiDetail = apiOnline ? 'Requests can reach the FastAPI service.' : 'Admin client cannot confirm API availability.';

    // Database
    let dbState = 'Healthy';
    let dbTone: StatusTone = 'healthy';
    let dbDetail = 'Database responding to queries and diagnostics.';
    if (apiOnline === false) {
      dbState = 'Offline';
      dbTone = 'critical';
      dbDetail = 'Cannot verify database health because API is unreachable.';
    } else if (degraded.has('postgres')) {
      dbState = 'Critical';
      dbTone = 'critical';
      dbDetail = 'Database connection failed or timeouts occurring.';
    } else if (!health && apiOnline !== null) {
      dbState = 'Unknown';
      dbTone = 'warning';
      dbDetail = 'Health diagnostics not reported.';
    }

    // Queue Processor
    let queueState = 'Healthy';
    let queueTone: StatusTone = 'healthy';
    let queueDetail = processingDuration === 'Not reported' ? 'No completed task duration reported in the current health window.' : `Average processing duration: ${processingDuration}.`;
    
    const redisOffline = degraded.has('redis');
    const workersOffline = degraded.has('celery_workers');
    const queueOffline = redisOffline || workersOffline;
    const queueDelayed = queueDepth > 0 && activeWorkers === 0;

    if (apiOnline === false) {
      queueState = 'Offline';
      queueTone = 'critical';
      queueDetail = 'Cannot reach Queue Processor due to API Gateway failure.';
    } else if (queueOffline) {
      if (isDev) {
        queueState = 'Unavailable';
        queueTone = 'maintenance';
        queueDetail = redisOffline ? 'Redis broker is not configured or unreachable in dev environment.' : 'Celery workers are not running in dev environment.';
      } else {
        queueState = 'Offline';
        queueTone = 'critical';
        queueDetail = redisOffline ? 'Redis broker connection failed.' : 'No Celery workers are active to process tasks.';
      }
    } else if (queueDelayed) {
      queueState = 'Delayed';
      queueTone = 'warning';
      queueDetail = 'Tasks are queued but no workers are processing them.';
    } else if (queueDepth > 0) {
      queueState = 'Processing';
      queueTone = 'nominal';
      queueDetail = `Currently processing ${queueDepthStr} task${queueDepth === 1 ? '' : 's'}.`;
    }

    // Recognition Service
    let recState = 'Healthy';
    let recTone: StatusTone = 'healthy';
    let recDetail = latestRecognition ? latestRecognition.detail : 'No recognition audit record is available in the current stream.';
    if (apiOnline === false) {
      recState = 'Offline';
      recTone = 'critical';
      recDetail = 'Cannot reach recognition endpoints due to API Gateway failure.';
    }

    // Storage
    let storageState = 'Healthy';
    let storageTone: StatusTone = 'healthy';
    let storageDetail = 'Storage availability is inferred from successful enrollment registry and evidence metadata retrieval.';
    if (apiOnline === false) {
      storageState = 'Offline';
      storageTone = 'critical';
      storageDetail = 'Cannot reach storage due to API Gateway failure.';
    } else if (enrollments.length === 0 && apiOnline) {
      storageState = 'Operational';
      storageTone = 'nominal';
    }

    // Admin Session
    let adminState = 'Healthy';
    let adminTone: StatusTone = 'healthy';
    const adminDetail = admin ? 'Console session is authenticated through the admin auth provider.' : 'No active admin session is available.';
    if (!admin) {
      adminState = 'Offline';
      adminTone = 'critical';
    }

    // Global Status Calculation
    const coreCritical = apiState === 'Critical' || dbState === 'Critical' || dbState === 'Offline' || recState === 'Critical' || recState === 'Offline';
    let gStatus = 'Healthy';
    let gTone: StatusTone = 'healthy';
    
    if (apiOnline === null && !health) {
      gStatus = 'Connecting...';
      gTone = 'nominal';
    } else if (coreCritical) {
      gStatus = 'Critical';
      gTone = 'critical';
    } else if (queueState === 'Offline' || queueState === 'Delayed' || queueState === 'Unavailable' || degraded.size > 0) {
      gStatus = 'Degraded';
      gTone = 'warning';
      if (queueState === 'Unavailable' && isDev) {
        gStatus = 'Degraded (Dev)';
      }
    }

    return {
      globalStatus: gStatus,
      globalTone: gTone,
      serviceStatuses: [
        {
          name: 'API Gateway',
          description: 'Admin and biometric API ingress',
          state: apiState,
          primarySignal: apiOnline ? 'Health endpoint returned OK' : 'Health endpoint unreachable',
          secondarySignal: 'Endpoint: /health',
          detail: apiDetail,
          tone: apiTone,
          icon: RadioTower,
        },
        {
          name: 'Database',
          description: 'PostgreSQL operational store',
          state: dbState,
          primarySignal: health && !degraded.has('postgres') ? 'Diagnostics: OK' : 'Diagnostics critical or unavailable',
          secondarySignal: `${enrollments.length} enrollment records loaded`,
          detail: dbDetail,
          tone: dbTone,
          icon: Database,
        },
        {
          name: 'Queue Processor',
          description: 'Celery biometric workload',
          state: queueState,
          primarySignal: queueOffline ? 'Broker / workers unreachable' : `${queueDepthStr} queued task${queueDepth === 1 ? '' : 's'}`,
          secondarySignal: queueOffline ? 'Active workers: 0' : `${activeWorkersStr} active worker${activeWorkers === 1 ? '' : 's'}`,
          detail: queueDetail,
          tone: queueTone,
          icon: Layers,
        },
        {
          name: 'Recognition Service',
          description: 'Face matching and vector search',
          state: recState,
          primarySignal: `Last request: ${latestRecognition ? formatDateTime(latestRecognition.timestamp) : 'Not reported'}`,
          secondarySignal: `Average duration: ${recognitionDuration}`,
          detail: recDetail,
          tone: recTone,
          icon: Cpu,
        },
        {
          name: 'Storage',
          description: 'Enrollment image and evidence archive',
          state: storageState,
          primarySignal: `${enrollments.length} registry row${enrollments.length === 1 ? '' : 's'} available`,
          secondarySignal: `Last enrollment: ${latestEnrollment ? formatDateTime(latestEnrollment.updated_at || latestEnrollment.created_at) : 'Not reported'}`,
          detail: storageDetail,
          tone: storageTone,
          icon: HardDrive,
        },
        {
          name: 'Admin Session',
          description: 'Authenticated operator workspace',
          state: adminState,
          primarySignal: admin?.email ?? 'No active admin identity',
          secondarySignal: admin?.role ? `Role: ${admin.role}` : 'Role not reported',
          detail: adminDetail,
          tone: adminTone,
          icon: ShieldCheck,
        },
      ]
    };
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
      <section className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/20 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-8 items-center justify-center rounded-md border border-[#6493b5]/20 bg-[#6493b5]/10">
            <Activity className="size-4 text-[#8fb4ce]" />
          </div>
          <div>
            <h2 className="text-[1.05rem] font-semibold text-slate-100">System Status</h2>
            <div className="mt-0.5 flex items-center gap-2 text-[0.75rem] text-slate-400">
              <span className={cn('relative flex size-1.5 items-center justify-center')}>
                <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', toneStyles[globalTone].dot)} />
                <span className={cn('relative inline-flex size-1.5 rounded-full', toneStyles[globalTone].dot)} />
              </span>
              <span className={cn('font-medium capitalize', toneStyles[globalTone].text)}>
                {globalStatus}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadStatus(false)}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[0.75rem] font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
        >
          <RefreshCw className={cn('size-3', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </section>

      {loadErrors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-500/[0.06] p-4 text-[0.78rem] text-amber-200">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>{loadErrors.join(' ')}</p>
          </div>
        </div>
      ) : null}

      <section className="mt-6">
        <div className="mb-4">
          <h3 className="text-[0.8rem] font-semibold text-slate-400 uppercase tracking-wider">Primary Infrastructure</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {serviceStatuses.filter(s => ['API Gateway', 'Database', 'Queue Processor'].includes(s.name)).map((service) => {
            const Icon = service.icon;

            return (
              <article key={service.name} className="flex flex-col rounded-[0.85rem] border border-white/[0.04] bg-black/20 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Icon className={cn('size-4.5 text-slate-300')} />
                    <h4 className="text-[0.95rem] font-semibold text-slate-100">{service.name}</h4>
                  </div>
                  <StatusPill tone={service.tone} label={service.state} />
                </div>
                
                <div className="mt-5 flex flex-col gap-3">
                  <div className="flex justify-between items-baseline gap-2 border-b border-white/[0.03] pb-2 text-[0.75rem]">
                    <span className="text-slate-500">Signal</span>
                    <span className="text-slate-200 font-medium text-right">{service.primarySignal}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2 border-b border-white/[0.03] pb-2 text-[0.75rem]">
                    <span className="text-slate-500">Secondary</span>
                    <span className="text-slate-300 text-right">{service.secondarySignal}</span>
                  </div>
                  <div className="pt-1 text-[0.7rem] leading-relaxed text-slate-400">
                    {service.detail}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 mb-4">
          <h3 className="text-[0.8rem] font-semibold text-slate-400 uppercase tracking-wider">Auxiliary Services</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {serviceStatuses.filter(s => !['API Gateway', 'Database', 'Queue Processor'].includes(s.name)).map((service) => {
            const Icon = service.icon;
            const styles = toneStyles[service.tone];

            return (
              <article key={service.name} className="flex items-center gap-4 rounded-lg border border-white/[0.03] bg-black/10 p-4">
                <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md border', styles.bg, styles.border, styles.text)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-[0.85rem] font-medium text-slate-200">{service.name}</h4>
                    <span className={cn('shrink-0 text-[0.7rem] font-medium', styles.text)}>{service.state}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[0.7rem] text-slate-500">{service.primarySignal}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div>
          <div className="mb-4">
            <h3 className="text-[0.8rem] font-semibold text-slate-400 uppercase tracking-wider">System Activity</h3>
          </div>

          {auditEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[0.85rem] border border-white/[0.03] bg-black/10 p-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.05]">
                <Activity className="size-4.5 text-slate-500/70" />
              </div>
              <p className="text-[0.8rem] text-slate-500">No operational events have been reported yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03] overflow-hidden rounded-[0.85rem] border border-white/[0.04] bg-black/20">
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
                  <div key={event.id} className="grid gap-3 p-3.5 transition-colors duration-200 hover:bg-white/[0.02] sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative mt-1 flex size-5 shrink-0 items-center justify-center">
                        <span className={cn('size-1.5 rounded-full', styles.dot)} />
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
                        <p className="mt-0.5 text-[0.74rem] leading-5 text-slate-500">{event.detail}</p>
                      </div>
                    </div>
                    <p className="pl-8 text-[0.7rem] text-slate-500 sm:pl-0 sm:text-right">{formatDateTime(event.timestamp)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-[0.8rem] font-semibold text-slate-400 uppercase tracking-wider">Infrastructure Readings</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {metricModules.map((metric) => {
              const Icon = metric.icon;
              const styles = toneStyles[metric.tone ?? 'nominal'];

              return (
                <article key={metric.label} className="flex items-center gap-3 rounded-lg border border-white/[0.03] bg-black/10 p-3.5 transition-all hover:bg-black/20">
                  <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md border', styles.bg, styles.border, styles.text)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[0.75rem] font-medium text-slate-300">{metric.label}</p>
                      <p className={cn('shrink-0 text-[0.85rem] font-semibold', metric.tone ? styles.text : 'text-slate-100')}>{metric.value}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[0.65rem] text-slate-500">{metric.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-white/[0.03] bg-black/10 p-4">
            <div className="flex items-center gap-2 text-[0.75rem] font-medium text-slate-300">
              <Gauge className="size-3.5 text-[#8fb4ce]" />
              Diagnostics Window
            </div>
            <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-[0.7rem] text-slate-500">
              <p className="flex justify-between">Retry rate: <span className="text-slate-300">{formatRate(health?.retry_rate)}</span></p>
              <p className="flex justify-between">Failure rate: <span className="text-slate-300">{formatRate(health?.failed_task_rate)}</span></p>
              <p className="flex justify-between">Processing: <span className="text-slate-300">{formatDuration(health?.avg_processing_duration)}</span></p>
              <p className="flex justify-between">Recognition: <span className="text-slate-300">{formatDuration(health?.avg_recognition_duration)}</span></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
