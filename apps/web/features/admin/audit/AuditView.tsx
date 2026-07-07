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
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date),
  };
}

function getActionLabel(type: string) {
  const labels: Record<string, string> = {
    admin_login: 'Admin Login',
    admin_logout: 'Admin Logout',
    enrollment_created: 'Enrollment Submitted',
    enrollment_validated: 'Enrollment Validated',
    enrollment_approved: 'Enrollment Approved',
    enrollment_rejected: 'Enrollment Rejected',
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
  return labels[type] ?? type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getActionIcon(event: AdminAuditEvent) {
  if (event.operation_result === 'failed') return <XCircle className="size-3.5 text-status-danger" />;
  if (event.source === 'recognition' || event.action_type.includes('scan')) {
    return <Activity className="size-3.5 text-accent-primary" />;
  }
  if (event.action_type.includes('login') || event.action_type.includes('session')) {
    return <LockKeyhole className="size-3.5 text-surface-text-muted" />;
  }
  if (event.action_type.includes('review') || event.action_type.includes('enrollment')) {
    return <UserCheck className="size-3.5 text-status-warning" />;
  }
  if (event.operation_result === 'success') return <CheckCircle2 className="size-3.5 text-status-healthy" />;
  return <FileText className="size-3.5 text-surface-text-muted" />;
}

function resultText(result: string) {
  if (result === 'success') return 'Success';
  if (result === 'failed') return 'Failed';
  if (result === 'rejected') return 'Rejected';
  if (result === 'review_required' || result === 'warning') return 'Warning';
  return 'Recorded';
}

function resultClass(result: string) {
  if (result === 'success') return 'border-status-healthy/20 bg-status-healthy/10 text-status-healthy';
  if (result === 'failed' || result === 'rejected') return 'border-status-danger/20 bg-status-danger/10 text-status-danger';
  if (result === 'review_required' || result === 'warning') return 'border-status-warning/20 bg-status-warning/10 text-status-warning';
  return 'border-status-neutral/20 bg-status-neutral/10 text-status-neutral';
}

function sourceLabel(source: string) {
  if (source === 'session') return 'Console Session';
  if (source === 'recognition') return 'Recognition';
  if (source === 'enrollment') return 'Enrollment';
  return source;
}

function getOperatorDetails(identity: string, source: string) {
  if (source === 'recognition') return { role: 'System Process', detail: 'Automated Match' };
  if (identity.includes('@')) return { role: 'Admin', detail: identity.split('@')[0] };
  return { role: 'Admin', detail: identity };
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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Initialize limit from localStorage only on the client
  useEffect(() => {
    const saved = localStorage.getItem('audit-page-size');
    if (saved) {
      setLimit(parseInt(saved, 10));
    }
  }, []);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    localStorage.setItem('audit-page-size', newLimit.toString());
  };

  const loadAuditEvents = useCallback(
    async (showLoading: boolean) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      try {
        const response = await fetchAdminAuditEvents(token, page, limit);
        setBackendEvents(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);
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
    [clearSession, router, token, page, limit]
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
      <div className="admin-surface flex items-center gap-2.5 px-6 py-16 text-[0.85rem] text-surface-text-muted">
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-accent-primary" />
        Loading audit trail…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-surface-text">Audit & Activity Log</h2>
          <p className="mt-1.5 text-[0.85rem] text-surface-text-muted">
            Persisted platform events and current console operations.
          </p>
        </div>
      </div>

      <div className="admin-surface flex min-h-[520px] flex-1 flex-col overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/[0.04] bg-[#080b0f]/80 p-4 sm:px-6 sm:py-4">
          <div className="flex-1 w-full xl:max-w-[380px]">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-text-muted" />
              <input
                type="text"
                placeholder="Search record, operator, request, or action..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="admin-input pl-9"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <div className="flex items-center rounded-md border border-white/[0.06] bg-black/20 p-0.5">
              {(['all', 'enrollment', 'recognition', 'session'] as AuditFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={cn(
                    'min-h-8 shrink-0 rounded-[4px] px-3.5 text-[0.72rem] font-medium transition-all duration-200',
                    filter === item
                      ? 'bg-white/[0.08] text-slate-100 shadow-sm border border-white/[0.04]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                  )}
                >
                  {item === 'all' ? 'All Sources' : sourceLabel(item)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="admin-btn-ghost min-h-9 px-3.5 text-[0.75rem] rounded-md border border-transparent hover:border-white/[0.05]"
                disabled={isRefreshing}
                onClick={() => loadAuditEvents(false)}
              >
                <RefreshCw className={cn('size-3.5 mr-2 text-slate-400', isRefreshing && 'animate-spin')} />
                Refresh
              </button>
              <button 
                type="button" 
                className="admin-btn-ghost min-h-9 px-3.5 text-[0.75rem] rounded-md border border-transparent hover:border-white/[0.05]" 
                disabled={filteredEvents.length === 0}
              >
                <ArrowDownToLine className="size-3.5 mr-2 text-slate-400" />
                Export
              </button>
            </div>
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
          <div className="admin-workspace-scroll flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex flex-col divide-y divide-white/[0.03]">
              {filteredEvents.map((event) => {
                const timestamp = formatTimestamp(event.timestamp);
                const operator = getOperatorDetails(event.operator_identity, event.source);
                
                return (
                  <article 
                    key={event.id} 
                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 transition-all duration-200 hover:bg-white/[0.015] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.02),inset_0_-1px_0_rgba(255,255,255,0.02)] gap-4 md:gap-6 lg:gap-8"
                  >
                    {/* LEFT: Event Title & Description */}
                    <div className="flex flex-1 items-start gap-3.5 min-w-0">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] shadow-sm group-hover:bg-white/[0.04] transition-colors">
                        {getActionIcon(event)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] font-semibold tracking-tight text-slate-200 truncate">
                          {getActionLabel(event.action_type)}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-400 line-clamp-2 md:line-clamp-1 lg:line-clamp-2">
                          {event.detail}
                        </p>
                      </div>
                    </div>

                    {/* Desktop/Tablet CENTER & RIGHT */}
                    <div className="hidden md:flex shrink-0 items-center gap-8 lg:gap-16">
                      {/* CENTER: Context */}
                      <div className="flex flex-col gap-1 w-[160px] lg:w-[200px]">
                        <span className="font-mono text-[0.75rem] text-slate-300 truncate">
                          {event.affected_record || 'System Action'}
                        </span>
                        <span className="text-[0.68rem] text-slate-500 whitespace-nowrap">
                          {timestamp.date} • {timestamp.time}
                        </span>
                      </div>

                      {/* RIGHT: Status & Operator */}
                      <div className="flex flex-col items-end gap-1.5 w-[100px] lg:w-[120px]">
                        <span className="text-[0.75rem] font-medium text-slate-300 truncate max-w-full capitalize">
                          {operator.role === 'Admin' ? operator.detail : operator.role}
                        </span>
                        <span className={cn('inline-flex items-center justify-center min-w-[76px] rounded-[4px] border px-2 py-1 text-[0.62rem] font-medium tracking-wide', resultClass(event.operation_result))}>
                          {resultText(event.operation_result)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile: Card Layout Context */}
                    <div className="md:hidden flex flex-col gap-2.5 mt-2 rounded-lg border border-white/[0.03] bg-white/[0.015] p-3.5">
                      <p className="text-[0.75rem] flex items-start justify-between gap-4">
                        <span className="text-slate-500 font-medium text-[0.65rem] uppercase tracking-wider mt-0.5">Record</span>
                        <span className="font-mono text-slate-300 text-right break-all">{event.affected_record || 'System Action'}</span>
                      </p>
                      <p className="text-[0.75rem] flex items-center justify-between gap-4">
                        <span className="text-slate-500 font-medium text-[0.65rem] uppercase tracking-wider">Operator</span>
                        <span className="text-slate-300 truncate capitalize">{operator.role === 'Admin' ? operator.detail : operator.role}</span>
                      </p>
                      <p className="text-[0.75rem] flex items-center justify-between gap-4">
                        <span className="text-slate-500 font-medium text-[0.65rem] uppercase tracking-wider">Time</span>
                        <span className="text-slate-400 whitespace-nowrap">{timestamp.date} • {timestamp.time}</span>
                      </p>
                      <div className="pt-3 mt-1 border-t border-white/[0.04]">
                        <span className={cn('inline-flex items-center justify-center rounded-[4px] border px-2 py-0.5 text-[0.6rem] font-medium tracking-wide', resultClass(event.operation_result))}>
                          {resultText(event.operation_result)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/[0.04] bg-[#080b0f]/60 px-4 py-4 sm:px-6 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
             <div className="text-[0.74rem] text-slate-500 text-center sm:text-left">
               Showing {filteredEvents.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of <strong className="text-slate-300">{total}</strong> logs
             </div>
             <div className="flex items-center gap-2">
               <span className="text-[0.7rem] text-slate-500 uppercase tracking-widest">Rows:</span>
               <select 
                 className="bg-black/40 border border-white/[0.08] rounded-md text-[0.75rem] text-slate-300 py-1.5 px-2 outline-none focus:border-[#6493b5]/50 transition-colors"
                 value={limit}
                 onChange={(e) => handleLimitChange(Number(e.target.value))}
                 disabled={isLoading}
               >
                 <option value={25}>25</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
               </select>
             </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="admin-btn-ghost px-4 py-2 min-h-9 text-[0.75rem] disabled:opacity-40 transition-opacity"
            >
              ← Previous
            </button>
            <span className="text-[0.75rem] text-slate-500 font-medium">
              Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="admin-btn-ghost px-4 py-2 min-h-9 text-[0.75rem] disabled:opacity-40 transition-opacity"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

