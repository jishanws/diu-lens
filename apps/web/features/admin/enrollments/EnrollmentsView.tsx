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
import { useAdminToast } from '@/features/admin/ui/AdminToastProvider';
import { cn } from '@/lib/utils';
import { EnrollmentDetailsPanel } from './EnrollmentDetailsPanel';

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function EnrollmentsView() {
  const router = useRouter();
  const { token, clearSession } = useAdminAuth();
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

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-2.5 px-6 py-16 text-[0.85rem] text-slate-500">
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-[#8BB8D0]/60" />
        Loading operations data…
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Pending Review" value={metrics?.pending_review ?? 0} tone="pending" />
        <MetricCard title="Approved Today" value={metrics?.approved_today ?? 0} tone="approved" />
        <MetricCard title="Rejected Today" value={metrics?.rejected_today ?? 0} tone="rejected" />
        <MetricCard title="Avg Confidence" value={`${(metrics?.avg_recognition_confidence ?? 0).toFixed(1)}%`} tone="default" />
      </div>

      {/* Queue card */}
      <div className="admin-surface relative overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/[0.03] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-white">Verification Queue</h2>
            <p className="mt-0.5 text-[0.82rem] text-slate-400">
              Inspect biometric data before final approval.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn-ghost w-full sm:w-auto min-h-[44px]"
            onClick={() => loadData(false)}
            disabled={isRefreshing || actionKey !== null}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>

        <div className="space-y-4 p-6">
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
                    <div key={item.student_id} className="group relative flex flex-col gap-5 rounded-[1.25rem] border border-white/[0.03] bg-white/[0.01] p-5 transition-all hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
                      
                      {/* Identity Block */}
                      <div className="flex flex-col gap-1.5 sm:w-1/3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-[0.95rem] font-semibold tracking-tight text-slate-100">{item.full_name || 'Unknown User'}</p>
                          <span className="rounded-full border border-white/[0.05] bg-white/[0.03] px-2 py-0.5 text-[0.65rem] font-mono tracking-wide text-slate-400">
                            {item.student_id}
                          </span>
                        </div>
                        <p className="text-[0.8rem] text-slate-400 hidden sm:block">{item.university_email || 'No email provided'}</p>
                      </div>

                      {/* Verification Summary */}
                      <div className="flex flex-col gap-2.5 sm:w-1/3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide",
                            item.verification_completed 
                              ? "border-[#8BB8D0]/10 bg-[#8BB8D0]/[0.05] text-[#8BB8D0]" 
                              : "border-amber-500/10 bg-amber-500/[0.05] text-amber-400"
                          )}>
                            <span className={cn("size-1.5 rounded-full", item.verification_completed ? "bg-[#8BB8D0]" : "bg-amber-400 animate-pulse")} />
                            {item.verification_completed ? 'Ready for Review' : 'Incomplete'}
                          </span>
                        </div>
                        <p className="text-[0.7rem] text-slate-500">Submitted: {formatDate(item.updated_at || item.created_at)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
                        <button
                          type="button"
                          className="admin-btn-primary min-h-[44px] w-full sm:w-auto justify-center"
                          onClick={() => setSelectedStudentId(item.student_id)}
                        >
                          <Eye className="size-3.5" />
                          View Details
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
                  <div className="flex items-center gap-1.5 rounded-full border border-white/[0.04] bg-[#111318]/20 p-1 backdrop-blur-md">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="admin-btn-ghost h-11 rounded-full px-4 text-[0.75rem] disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'flex size-11 sm:size-8 items-center justify-center rounded-full text-[0.75rem] font-medium transition-all',
                            currentPage === page
                              ? 'bg-[#8BB8D0]/[0.15] text-[#8BB8D0] shadow-[0_0_12px_-3px_rgba(139,184,208,0.4)] border border-[#8BB8D0]/30'
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
                      className="admin-btn-ghost h-11 rounded-full px-4 text-[0.75rem] disabled:opacity-30"
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
    tone === 'approved' ? 'text-[#8BB8D0]' :
    tone === 'rejected' ? 'text-rose-300' :
    'text-white';

  return (
    <div className="admin-surface px-6 py-5 border border-slate-800">
      <p className="text-[0.78rem] font-medium uppercase tracking-widest text-slate-500">{title}</p>
      <p className={cn('mt-1.5 text-3xl font-semibold tracking-tight', valueClass)}>{value}</p>
    </div>
  );
}
