'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowDownToLine,
  CheckCircle2,
  FileText,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { AdminApiAuthError, AdminAuditEvent, fetchAdminAuditEvents } from '@/features/admin/api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import {
  mergeAuditEvents,
  readSessionOperationalEvents,
  subscribeToOperationEvents,
} from '@/features/admin/operations';
import { cn } from '@/lib/utils';

type AuditFilter = 'all' | 'enrollment' | 'recognition' | 'session';

function formatTimestamp(value: string | null) {
  if (!value) return { date: 'Not reported', time: '-' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Invalid timestamp', time: '-' };
  return {
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date),
  };
}

function getActionLabel(type: string) {
  const labels: Record<string, string> = {
    admin_login: 'Admin Login',
    admin_logout: 'Admin Logout',
    enrollment_created: 'Enrollment Submitted',
    enrollment_validated: 'Enrollment Submitted',
    enrollment_approved: 'Record Moved to Approved',
    enrollment_rejected: 'Verification Rejected',
    enrollment_reset: 'Record Reset',
    processing_completed: 'Face Embedding Generated',
    processing_failed: 'Embedding Processing Failed',
    recognition_search_executed: 'Search Executed',
    similarity_scan_executed: 'Similarity Scan Executed',
    similarity_scan_failed: 'Similarity Scan Failed',
    verification_approved: 'Verification Approved',
    verification_rejected: 'Verification Rejected',
    manual_review_opened: 'Manual Review Opened',
    record_reset: 'Record Reset',
    face_embedding_generated: 'Face Embedding Generated',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
}

function getActionIcon(event: AdminAuditEvent) {
  if (event.operation_result === 'failed') return <XCircle className="size-3.5 text-rose-300" />;
  if (event.source === 'recognition' || event.action_type.includes('scan')) {
    return <Activity className="size-3.5 text-[#8fb4ce]" />;
  }
  if (event.action_type.includes('login') || event.action_type.includes('session')) {
    return <LockKeyhole className="size-3.5 text-slate-300" />;
  }
  if (event.action_type.includes('review')) return <UserCheck className="size-3.5 text-amber-300" />;
  if (event.operation_result === 'success') return <CheckCircle2 className="size-3.5 text-emerald-300" />;
  return <FileText className="size-3.5 text-slate-400" />;
}

function resultClass(result: string) {
  if (result === 'success') return 'border-emerald-400/15 bg-emerald-500/[0.05] text-emerald-300';
  if (result === 'failed') return 'border-rose-400/15 bg-rose-500/[0.05] text-rose-300';
  if (result === 'review_required') return 'border-amber-400/15 bg-amber-500/[0.05] text-amber-300';
  return 'border-slate-300/10 bg-slate-400/[0.04] text-slate-300';
}

function sourceLabel(source: string) {
  if (source === 'session') return 'Console session';
  if (source === 'recognition') return 'Recognition';
  if (source === 'enrollment') return 'Enrollment';
  return source;
}

export function AuditView() {
  const router = useRouter();
  const { token, clearSession } = useAdminAuth();

  const [backendEvents, setBackendEvents] = useState<AdminAuditEvent[]>([]);
  const [sessionEvents, setSessionEvents] = useState<AdminAuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditEvents = useCallback(
    async (showLoading: boolean) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      try {
        const events = await fetchAdminAuditEvents(token);
        setBackendEvents(events);
        setSessionEvents(readSessionOperationalEvents());
      } catch (errorValue) {
        if (errorValue instanceof AdminApiAuthError) {
          clearSession();
          router.replace('/admin/login?next=%2Fadmin%2Faudit');
          return;
        }
        setError(errorValue instanceof Error ? errorValue.message : 'Unable to load audit logs.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [clearSession, router, token]
  );

  useEffect(() => {
    if (!token) return;
    void loadAuditEvents(true);
  }, [loadAuditEvents, token]);

  useEffect(() => {
    setSessionEvents(readSessionOperationalEvents());
    return subscribeToOperationEvents(() => {
      setSessionEvents(readSessionOperationalEvents());
    });
  }, []);

  const allEvents = useMemo(
    () => mergeAuditEvents(backendEvents, sessionEvents),
    [backendEvents, sessionEvents]
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return allEvents.filter((event) => {
      const matchesFilter = filter === 'all' || event.source === filter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return [
        event.action_type,
        getActionLabel(event.action_type),
        event.affected_record,
        event.operator_identity,
        event.operation_result,
        event.request_id,
        event.correlation_id,
        event.detail,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [allEvents, filter, searchQuery]);

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-2.5 px-6 py-16 text-[0.85rem] text-slate-500">
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-[#6493b5]/60" />
        Loading audit trail…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-slate-100">Audit & Activity Log</h2>
          <p className="mt-1.5 text-[0.85rem] text-slate-400">
            Persisted platform events and current console operations.
          </p>
        </div>
        <button type="button" className="admin-btn-ghost h-10 px-4" disabled={filteredEvents.length === 0}>
          <ArrowDownToLine className="size-4 opacity-70" />
          <span className="hidden sm:inline">Export Current View</span>
        </button>
      </div>

      <div className="admin-surface flex min-h-[520px] flex-1 flex-col overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.04] bg-[#080b0f]/80 p-4 sm:px-6 sm:py-5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-[320px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search record, operator, request, or action..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 w-full rounded-md border border-white/[0.05] bg-black/20 pl-9 pr-4 text-[0.85rem] text-slate-200 placeholder:text-slate-500 focus:border-[#6493b5]/40 focus:outline-none focus:ring-1 focus:ring-[#6493b5]/40"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'enrollment', 'recognition', 'session'] as AuditFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'min-h-9 shrink-0 rounded-md border px-3 text-[0.72rem] font-medium transition-colors',
                  filter === item
                    ? 'border-[#6493b5]/20 bg-[#6493b5]/[0.09] text-[#a9c6d9]'
                    : 'border-white/[0.04] bg-white/[0.02] text-slate-400 hover:text-slate-200'
                )}
              >
                {item === 'all' ? 'All Sources' : sourceLabel(item)}
              </button>
            ))}
            <button
              type="button"
              className="admin-btn-ghost min-h-9 px-3 text-[0.72rem]"
              disabled={isRefreshing}
              onClick={() => loadAuditEvents(false)}
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-[0.85rem] text-rose-300">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {!error && filteredEvents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center text-[0.85rem] text-slate-500">
            No audit events match the current filters.
          </div>
        ) : null}

        {!error && filteredEvents.length > 0 ? (
          <div className="admin-workspace-scroll flex-1 overflow-auto">
            <table className="hidden w-full min-w-[980px] border-collapse text-left md:table">
              <thead className="sticky top-0 z-10 bg-white/[0.015] backdrop-blur-md">
                <tr>
                  <th className="border-b border-white/[0.04] px-6 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-slate-400">Timestamp</th>
                  <th className="border-b border-white/[0.04] px-6 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-slate-400">Action</th>
                  <th className="border-b border-white/[0.04] px-6 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-slate-400">Affected Record</th>
                  <th className="border-b border-white/[0.04] px-6 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-slate-400">Operator</th>
                  <th className="border-b border-white/[0.04] px-6 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-slate-400">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredEvents.map((event) => {
                  const timestamp = formatTimestamp(event.timestamp);
                  return (
                    <tr key={event.id} className="transition-all duration-200 hover:bg-white/[0.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[0.74rem] text-slate-300">{timestamp.date}</span>
                          <span className="font-mono text-[0.68rem] text-slate-500">{timestamp.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.04] bg-[#0c1015]">
                            {getActionIcon(event)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[0.8rem] font-medium capitalize text-slate-200">{getActionLabel(event.action_type)}</p>
                            <p className="mt-1 max-w-md truncate text-[0.68rem] text-slate-500">{event.detail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-[0.78rem] text-slate-300">{event.affected_record || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[0.75rem] font-medium text-slate-300">{event.operator_identity}</span>
                          <span className="text-[0.64rem] uppercase tracking-widest text-slate-600">{sourceLabel(event.source)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex rounded-full border px-2 py-1 text-[0.64rem] font-medium uppercase tracking-wider', resultClass(event.operation_result))}>
                          {event.operation_result.replaceAll('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="divide-y divide-white/[0.025] md:hidden">
              {filteredEvents.map((event) => {
                const timestamp = formatTimestamp(event.timestamp);
                return (
                  <article key={event.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/[0.04] bg-[#0c1015]">
                          {getActionIcon(event)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[0.84rem] font-medium capitalize text-slate-200">{getActionLabel(event.action_type)}</p>
                          <p className="mt-1 text-[0.7rem] leading-5 text-slate-500">{event.detail}</p>
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-full border px-2 py-1 text-[0.6rem] font-medium uppercase tracking-wider', resultClass(event.operation_result))}>
                        {event.operation_result.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-white/[0.03] bg-white/[0.01] p-3">
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-widest text-slate-500">Record</p>
                        <p className="mt-1 font-mono text-[0.74rem] text-slate-300">{event.affected_record || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-widest text-slate-500">Operator</p>
                        <p className="mt-1 truncate text-[0.74rem] text-slate-300">{event.operator_identity}</p>
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-widest text-slate-500">Time</p>
                        <p className="mt-1 font-mono text-[0.7rem] text-slate-400">{timestamp.time}</p>
                      </div>
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-widest text-slate-500">Source</p>
                        <p className="mt-1 text-[0.7rem] text-slate-400">{sourceLabel(event.source)}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="border-t border-white/[0.04] bg-[#080b0f]/60 px-4 py-3 text-[0.74rem] text-slate-500 sm:px-6">
          Showing {filteredEvents.length} of {allEvents.length} available operational events.
        </div>
      </div>
    </div>
  );
}
