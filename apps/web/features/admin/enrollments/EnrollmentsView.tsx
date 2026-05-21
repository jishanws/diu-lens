'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import {
  AdminApiAuthError,
  approveEnrollment,
  fetchEnrollments,
  rejectEnrollment,
} from '@/features/admin/api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { EnrollmentRecord } from '@/features/admin/auth/types';
import { useAdminToast } from '@/features/admin/ui/AdminToastProvider';
import { cn } from '@/lib/utils';

type RejectDialogState = {
  studentId: string;
  fullName: string;
};

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

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

  const loadEnrollments = useCallback(
    async (showLoading: boolean) => {
      if (!token) return;
      if (showLoading) { setIsLoading(true); } else { setIsRefreshing(true); }
      setError(null);
      try {
        const rows = await fetchEnrollments(token);
        setEnrollments(rows.filter((item) => item.status === 'validated'));
      } catch (errorValue) {
        if (handleAuthFailure(errorValue)) return;
        setError(errorValue instanceof Error ? errorValue.message : 'Failed to load enrollments.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, handleAuthFailure]
  );

  useEffect(() => {
    if (!token) return;
    void loadEnrollments(true);
  }, [token, loadEnrollments]);

  const validatedCount = useMemo(() => enrollments.length, [enrollments]);

  const totalPages = Math.max(1, Math.ceil(enrollments.length / itemsPerPage));
  const paginatedEnrollments = useMemo(() => {
    return enrollments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [enrollments, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const runAction = async (
    key: string,
    action: () => Promise<{ success: boolean; message: string }>,
    successTitle: string,
    onSuccess?: () => void
  ): Promise<boolean> => {
    setActionKey(key);
    try {
      const result = await action();
      if (!result.success) {
        showToast({ title: 'Action failed', message: result.message, variant: 'error' });
        return false;
      }
      if (onSuccess) onSuccess();
      showToast({ title: successTitle, message: result.message, variant: 'success' });
      await loadEnrollments(false);
      return true;
    } catch (errorValue) {
      if (handleAuthFailure(errorValue)) return false;
      showToast({
        title: 'Request failed',
        message: errorValue instanceof Error ? errorValue.message : 'Unexpected error occurred.',
        variant: 'error',
      });
      return false;
    } finally {
      setActionKey(null);
    }
  };

  const onApprove = async (studentId: string) => {
    if (!token) return;
    setActionKey(`approve:${studentId}`);
    try {
      const result = await approveEnrollment(token, studentId);
      if (!result.success || !result.approved) {
        showToast({ title: 'Approval failed', message: result.message, variant: 'error' });
        return;
      }
      if (result.processing_passed && result.embeddings_generated_count > 0) {
        showToast({ title: 'Approved and processed', message: `Generated ${result.embeddings_generated_count} embeddings.`, variant: 'success' });
      } else {
        showToast({
          title: 'Approved, but processing failed',
          message: result.processing_error || result.message || 'Approval succeeded but processing failed. Use Process to retry.',
          variant: 'error',
        });
      }
      await loadEnrollments(false);
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

  const onRejectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !rejectDialog) return;

    const targetStudentId = rejectDialog.studentId;
    const isStillReviewable = enrollments.some((item) => item.student_id === targetStudentId);
    if (!isStillReviewable) {
      setRejectDialog(null);
      setRejectReason('');
      setRejectError(null);
      showToast({ title: 'Already updated', message: 'This enrollment is no longer in the review queue. Refreshing list.', variant: 'error' });
      await loadEnrollments(false);
      return;
    }

    const reason = rejectReason.trim();
    if (reason.length < 3) {
      setRejectError('Please enter a rejection reason (at least 3 characters).');
      return;
    }
    setRejectError(null);

    const wasRejected = await runAction(
      `reject:${targetStudentId}`,
      () => rejectEnrollment(token, targetStudentId, reason),
      'Enrollment rejected',
      () => { setEnrollments((current) => current.filter((item) => item.student_id !== targetStudentId)); }
    );

    if (wasRejected) {
      setRejectDialog(null);
      setRejectReason('');
    }
  };

  if (isLoading) {
    return (
      <div className="admin-surface flex items-center gap-2.5 px-6 py-16 text-[0.85rem] text-slate-500">
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400/60" />
        Loading enrollments…
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Metric */}
      <MetricCard title="Validated Enrollments" value={validatedCount} tone="pending" />

      {/* Queue card */}
      <div className="admin-surface relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        <div className="flex flex-col gap-4 border-b border-white/[0.05] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-white">Enrollment Queue</h2>
            <p className="mt-0.5 text-[0.82rem] text-slate-400">
              Review validated submissions and either approve or reject.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn-ghost w-full sm:w-auto"
            onClick={() => loadEnrollments(false)}
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
              <button type="button" className="admin-btn-ghost mt-3" onClick={() => loadEnrollments(true)}>
                Retry
              </button>
            </div>
          ) : null}

          {!error && enrollments.length === 0 ? (
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-8 text-center text-[0.85rem] text-slate-500">
              No validated enrollments found.
            </div>
          ) : null}

          {!error && enrollments.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-2xl border border-white/[0.05] bg-[#040810]/40">
                <table className="min-w-full text-left text-sm border-collapse">
                  <thead className="border-b border-white/[0.04]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Student</th>
                      <th className="px-6 py-4 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Contact</th>
                      <th className="px-6 py-4 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Verification</th>
                      <th className="px-6 py-4 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Updated</th>
                      <th className="px-6 py-4 text-right text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {paginatedEnrollments.map((item) => {
                      const approveKey = `approve:${item.student_id}`;
                      const rejectKey = `reject:${item.student_id}`;
                      const rowBusy = actionKey === approveKey || actionKey === rejectKey;

                      return (
                        <tr key={item.student_id} className="admin-table-row align-middle group">
                          <td className="px-6 py-5">
                            <p className="text-[0.9rem] font-medium text-slate-200">{item.full_name || '-'}</p>
                            <p className="mt-0.5 text-[0.75rem] font-mono tracking-wide text-slate-500">ID: {item.student_id}</p>
                          </td>
                          <td className="px-6 py-5 text-[0.8rem] text-slate-400">
                            <p className="text-slate-300">{item.university_email || '-'}</p>
                            <p className="mt-0.5">{item.phone || '-'}</p>
                          </td>
                          <td className="px-6 py-5 text-[0.8rem]">
                            <div className="flex flex-col items-start gap-1.5">
                              <span className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium",
                                item.verification_completed 
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                                  : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              )}>
                                {item.verification_completed ? 'Completed' : 'Pending'}
                              </span>
                              {typeof item.total_accepted_shots === 'number' && typeof item.total_required_shots === 'number' ? (
                                <p className="text-[0.75rem] text-slate-500">{item.total_accepted_shots}/{item.total_required_shots} shots accepted</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-[0.8rem] text-slate-500">
                            <p className="text-slate-300">{formatDate(item.updated_at || item.created_at)}</p>
                            <p className="mt-0.5 text-[0.7rem]">Created: {formatDate(item.created_at)}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap items-center justify-end gap-2.5 opacity-90 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              className="admin-btn-primary"
                              onClick={() => onApprove(item.student_id)}
                              disabled={rowBusy}
                            >
                              {actionKey === approveKey ? (
                                <div className="size-3.5 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />
                              ) : (
                                <ShieldCheck className="size-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              className="admin-btn-danger"
                              onClick={() => {
                                setRejectError(null);
                                setRejectReason('');
                                setRejectDialog({ studentId: item.student_id, fullName: item.full_name });
                              }}
                              disabled={rowBusy}
                            >
                              <XCircle className="size-3.5" />
                              Reject
                            </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.04] pt-6">
                  <p className="text-[0.8rem] text-slate-500">
                    Showing <span className="font-medium text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-300">{Math.min(currentPage * itemsPerPage, enrollments.length)}</span> of <span className="font-medium text-slate-300">{enrollments.length}</span> entries
                  </p>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/[0.04] bg-[#0a1120]/40 p-1 backdrop-blur-md">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="admin-btn-ghost h-8 rounded-full px-3 text-[0.75rem] disabled:opacity-30"
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
                            'flex size-8 items-center justify-center rounded-full text-[0.75rem] font-medium transition-all',
                            currentPage === page
                              ? 'bg-cyan-500/[0.15] text-cyan-300 shadow-[0_0_12px_-3px_rgba(34,211,238,0.4)] border border-cyan-500/30'
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
                      className="admin-btn-ghost h-8 rounded-full px-3 text-[0.75rem] disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}

          <p className="text-[0.78rem] text-slate-600">
            Reset actions for approved students are available in the approved management page.
          </p>
        </div>
      </div>

      {/* Reject Dialog */}
      {rejectDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
          <div className="admin-surface-elevated relative w-full max-w-lg overflow-hidden p-7">
            <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />
            <h2 className="text-[1rem] font-semibold text-white">Reject Enrollment</h2>
            <p className="mt-1 text-[0.82rem] text-slate-400">
              Provide a reason for rejecting{' '}
              <strong className="text-slate-200">{rejectDialog.fullName || rejectDialog.studentId}</strong>.
            </p>
            <form className="mt-5 space-y-4" onSubmit={onRejectSubmit}>
              <div>
                <label htmlFor="reject-reason" className="mb-1.5 block text-[0.8rem] font-medium text-slate-300">
                  Reason
                </label>
                <input
                  id="reject-reason"
                  className="admin-input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Example: Face verification images are incomplete"
                  required
                />
              </div>

              {rejectError ? (
                <p className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2 text-[0.82rem] text-rose-300">
                  {rejectError}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="admin-btn-ghost"
                  onClick={() => setRejectDialog(null)}
                  disabled={actionKey === `reject:${rejectDialog.studentId}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-danger"
                  disabled={actionKey === `reject:${rejectDialog.studentId}`}
                >
                  {actionKey === `reject:${rejectDialog.studentId}` ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-rose-400/60" />
                      Rejecting…
                    </>
                  ) : (
                    'Confirm Reject'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone = 'default',
}: {
  title: string;
  value: number;
  tone?: 'default' | 'pending' | 'approved' | 'rejected';
}) {
  const valueClass =
    tone === 'pending' ? 'text-amber-300' :
    tone === 'approved' ? 'text-emerald-300' :
    tone === 'rejected' ? 'text-rose-300' :
    'text-white';

  return (
    <div className="admin-surface px-6 py-5">
      <p className="text-[0.78rem] font-medium uppercase tracking-widest text-slate-500">{title}</p>
      <p className={cn('mt-1.5 text-3xl font-semibold tracking-tight', valueClass)}>{value}</p>
    </div>
  );
}
