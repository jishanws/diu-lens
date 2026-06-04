'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Eye } from 'lucide-react';
import {
  AdminApiAuthError,
  approveEnrollment,
  fetchEnrollments,
  rejectEnrollment,
  fetchEnrollmentMetrics,
  EnrollmentsMetricsResponse
} from '@/features/admin/api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { EnrollmentRecord } from '@/features/admin/auth/types';
import { recordOperationEvent } from '@/features/admin/operations';
import { useAdminToast } from '@/features/admin/ui/AdminToastProvider';
import { cn } from '@/lib/utils';
import { EnrollmentDetailsPanel } from './EnrollmentDetailsPanel';

function formatQueueDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} at ${hours}:${minutes}`;
}

function WaitTime({ timestamp }: { timestamp: string | null }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!timestamp) return <span>Waiting: -</span>;

  const ms = Math.max(0, now - new Date(timestamp).getTime());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  let display = '';
  if (days > 0) {
    display = `${days}d ${hours}h`;
  } else if (hours > 0) {
    display = `${hours}h ${minutes}m`;
  } else {
    display = `${minutes}m`;
  }

  return <span>Waiting: {display}</span>;
}

export function EnrollmentsView() {
  const router = useRouter();
  const { token, admin, clearSession } = useAdminAuth();
  const { showToast } = useAdminToast();

  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [metrics, setMetrics] = useState<EnrollmentsMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const handleAuthFailure = useCallback(
    (errorValue: unknown): boolean => {
      if (errorValue instanceof AdminApiAuthError) {
        clearSession();
        showToast({ title: 'Session expired', message: errorValue.message, variant: 'error' });
        router.replace('/admin/login');
        return true;
      }
      return false;
    },
    [clearSession, showToast, router]
  );

  const loadData = useCallback(
    async (showLoading: boolean) => {
      if (!token) return;
      if (showLoading) { setIsLoading(true); } else { setIsRefreshing(true); }
      setError(null);
      try {
        const [rows, metricsData] = await Promise.all([
          fetchEnrollments(token),
          fetchEnrollmentMetrics(token).catch(() => null)
        ]);
        setEnrollments(rows.filter((item) => item.status === 'validated'));
        if (metricsData) {
          setMetrics(metricsData);
        }
      } catch (errorValue) {
        if (handleAuthFailure(errorValue)) return;
        setError(errorValue instanceof Error ? errorValue.message : 'Failed to load data.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, handleAuthFailure]
  );

  useEffect(() => {
    if (!token) return;
    void loadData(true);
  }, [token, loadData]);

  const totalPages = Math.max(1, Math.ceil(enrollments.length / itemsPerPage));
  const paginatedEnrollments = useMemo(() => {
    return enrollments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [enrollments, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const onApprove = async (studentId: string) => {
    if (!token) return;
    setActionKey(`approve:${studentId}`);
    try {
      const result = await approveEnrollment(token, studentId);
      if (!result.success || !result.approved) {
        showToast({ title: 'Approval failed', message: result.message, variant: 'error' });
        return;
      }
      if (result.processing_attempted && !result.processing_error) {
        showToast({ 
          title: 'Enrollment Approved', 
          message: 'Enrollment approved and queued for biometric extraction.', 
          variant: 'success' 
        });
      } else if (result.processing_passed) {
        showToast({ 
          title: 'Approved and processed', 
          message: `Generated ${result.embeddings_generated_count} embeddings.`, 
          variant: 'success' 
        });
      } else if (result.processing_error) {
        showToast({
          title: 'Approved, but processing failed',
          message: result.processing_error,
          variant: 'error',
        });
      } else {
        showToast({
          title: 'Success',
          message: result.message || 'Enrollment approved.',
          variant: 'success',
        });
      }
      recordOperationEvent({
        actionType: 'verification_approved',
        affectedRecord: studentId,
        operatorIdentity: admin?.email || 'Unknown admin',
        result: 'success',
        detail: result.processing_attempted
          ? 'Verification approved by admin; enrollment moved to approved processing queue.'
          : 'Verification approval confirmed by admin workflow.',
      });
      setSelectedStudentId(null);
      await loadData(false);
    } catch (errorValue) {
      if (handleAuthFailure(errorValue)) return;
      showToast({
        title: 'Approval failed',
        message: errorValue instanceof Error ? errorValue.message : 'Unexpected error occurred.',
        variant: 'error',
      });
    } finally {
      setActionKey(null);
    }
  };

  const onReject = async (studentId: string, reason: string) => {
    if (!token) return;
    setActionKey(`reject:${studentId}`);
    try {
      const result = await rejectEnrollment(token, studentId, reason);
      if (!result.success) {
        showToast({ title: 'Reject failed', message: result.message, variant: 'error' });
        return;
      }
      showToast({ title: 'Enrollment rejected', message: result.message, variant: 'success' });
      recordOperationEvent({
        actionType: 'verification_rejected',
        affectedRecord: studentId,
        operatorIdentity: admin?.email || 'Unknown admin',
        result: 'success',
        detail: reason.trim()
          ? `Manual review rejected enrollment: ${reason.trim()}`
          : 'Manual review rejected enrollment.',
      });
      setSelectedStudentId(null);
      await loadData(false);
    } catch (errorValue) {
      if (handleAuthFailure(errorValue)) return;
      showToast({
        title: 'Request failed',
        message: errorValue instanceof Error ? errorValue.message : 'Unexpected error occurred.',
        variant: 'error',
      });
    } finally {
      setActionKey(null);
    }
  };

  const oldestPendingDisplay = useMemo(() => {
    if (!metrics?.oldest_pending_timestamp) return '--';
    const ms = Date.now() - new Date(metrics.oldest_pending_timestamp).getTime();
    if (ms < 0) return 'Just now';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [metrics?.oldest_pending_timestamp]);

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-2.5 px-6 py-16 text-[0.85rem] text-slate-500">
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-[#6493b5]/60" />
        Loading operations data…
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Pending Review" value={metrics?.pending_review ?? 0} tone="pending" />
        <MetricCard title="Approved" value={metrics?.approved_today ?? 0} tone="approved" />
        <MetricCard title="Rejected" value={metrics?.rejected_today ?? 0} tone="rejected" />
        <MetricCard title="Oldest" value={oldestPendingDisplay} tone="default" />
      </div>

      {/* Queue card */}
      <div className="admin-surface relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.03] p-3 sm:px-5 sm:py-4">
          <div className="flex flex-col">
            <h2 className="text-[0.9rem] sm:text-[0.95rem] font-medium text-slate-200">Verification Queue</h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 text-[0.75rem] font-medium text-slate-300 hover:bg-white/[0.04] active:scale-95 transition-all"
            onClick={() => loadData(false)}
            disabled={isRefreshing || actionKey !== null}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing ? 'animate-spin' : '')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="space-y-2.5 sm:space-y-3 p-3 sm:p-5">
          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-[0.85rem] text-rose-300">
              <p>{error}</p>
              <button type="button" className="admin-btn-ghost mt-3" onClick={() => loadData(true)}>
                Retry
              </button>
            </div>
          ) : null}

          {!error && enrollments.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.03] bg-white/[0.01] p-12 text-center text-[0.85rem] text-slate-500">
              No pending enrollments in the queue.
            </div>
          ) : null}

          {!error && enrollments.length > 0 ? (
            <>
              <div className="flex flex-col gap-3">
                {paginatedEnrollments.map((item) => {
                  return (
                    <div key={item.student_id} className="group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[0.85rem] border border-white/[0.03] bg-white/[0.01] p-3.5 sm:p-4 transition-all hover:bg-white/[0.02]">
                      
                      <div className="flex items-start justify-between gap-3 sm:w-[60%]">
                        {/* Identity Block */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[0.85rem] font-medium text-slate-200">{item.full_name || 'Unknown User'}</p>
                            <span className="shrink-0 rounded bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 text-[0.6rem] font-mono text-slate-400">
                              {item.student_id}
                            </span>
                          </div>
                          <p className="truncate text-[0.7rem] text-slate-500">{item.university_email || 'No email provided'}</p>
                        </div>
                        
                        {/* Metadata Grouping for Mobile */}
                        <div className="flex flex-col items-end gap-0.5 text-right sm:hidden shrink-0">
                          <div className="text-[0.65rem] text-slate-400">
                            {formatQueueDate(item.updated_at || item.created_at).split(' at ')[0]}
                          </div>
                          <div className="text-[0.65rem] font-medium text-amber-500/70">
                            <WaitTime timestamp={item.updated_at || item.created_at} />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Metadata */}
                      <div className="hidden sm:flex flex-col gap-0.5 sm:w-[20%]">
                        <div className="text-[0.75rem] text-slate-400">
                          {formatQueueDate(item.updated_at || item.created_at)}
                        </div>
                        <div className="text-[0.7rem] font-medium text-amber-500/70">
                          <WaitTime timestamp={item.updated_at || item.created_at} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-1 sm:mt-0 sm:w-auto shrink-0">
                        <button
                          type="button"
                          className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-[#6493b5]/10 border border-[#6493b5]/20 px-3 py-1.5 text-[0.75rem] font-medium text-[#8ab4d3] hover:bg-[#6493b5]/20 active:scale-95 transition-all"
                          onClick={() => {
                            setSelectedStudentId(item.student_id);
                            recordOperationEvent({
                              actionType: 'manual_review_opened',
                              affectedRecord: item.student_id,
                              operatorIdentity: admin?.email || 'Unknown admin',
                              result: 'recorded',
                              detail: 'Admin opened enrollment evidence for manual review.',
                            });
                          }}
                        >
                          <Eye className="size-3.5" />
                          Review
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.04] pt-6">
                  <p className="text-[0.8rem] text-slate-500">
                    Showing <span className="font-medium text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-300">{Math.min(currentPage * itemsPerPage, enrollments.length)}</span> of <span className="font-medium text-slate-300">{enrollments.length}</span> entries
                  </p>
                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-1.5 rounded-full border border-white/[0.04] bg-[#0b1422]/20 p-1 backdrop-blur-md">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="admin-btn-ghost rounded-full px-4 text-[0.75rem] disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <div className="flex items-center gap-1 px-1 overflow-x-auto admin-workspace-scroll max-w-[150px] sm:max-w-none">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'flex shrink-0 size-9 sm:size-8 items-center justify-center rounded-full text-[0.75rem] font-medium transition-all',
                            currentPage === page
                              ? 'bg-[#6493b5]/[0.15] text-[#6493b5] shadow-[0_0_12px_-3px_rgba(100, 147, 181,0.4)] border border-[#6493b5]/30'
                              : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="admin-btn-ghost rounded-full px-4 text-[0.75rem] disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <EnrollmentDetailsPanel
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onApprove={onApprove}
        onReject={onReject}
        isProcessing={actionKey !== null}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone = 'default',
}: {
  title: string;
  value: number | string;
  tone?: 'default' | 'pending' | 'approved' | 'rejected';
}) {
  const valueClass =
    tone === 'pending' ? 'text-amber-300' :
    tone === 'approved' ? 'text-[#6493b5]' :
    tone === 'rejected' ? 'text-rose-300' :
    'text-white';

  return (
    <div className="admin-surface p-3.5 sm:p-4 flex flex-col gap-1 sm:gap-1.5 rounded-xl border border-white/[0.03] bg-white/[0.01]">
      <p className="text-[0.65rem] sm:text-[0.7rem] font-medium uppercase tracking-[0.15em] text-slate-500">{title}</p>
      <p className={cn('text-xl sm:text-2xl font-semibold tracking-tight', valueClass)}>{value}</p>
    </div>
  );
}
