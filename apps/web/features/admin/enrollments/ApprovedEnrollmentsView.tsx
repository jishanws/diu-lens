'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import {
  AdminApiAuthError,
  fetchEnrollments,
  processEnrollment,
  resetEnrollment,
} from '@/features/admin/api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { EnrollmentRecord } from '@/features/admin/auth/types';
import { useAdminToast } from '@/features/admin/ui/AdminToastProvider';
import { cn } from '@/lib/utils';

type ResetDialogState = {
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

export function ApprovedEnrollmentsView() {
  const router = useRouter();
  const { token, admin, clearSession } = useAdminAuth();
  const { showToast } = useAdminToast();

  const [rows, setRows] = useState<EnrollmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState<ResetDialogState | null>(null);

  const isSuperAdmin = admin?.role === 'super_admin';

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

  const loadApproved = useCallback(
    async (showLoading: boolean) => {
      if (!token) return;
      if (showLoading) { setIsLoading(true); } else { setIsRefreshing(true); }
      setError(null);
      try {
        const nextRows = await fetchEnrollments(token);
        setRows(nextRows.filter((item) => item.status === 'approved' || item.status === 'processed'));
      } catch (errorValue) {
        if (handleAuthFailure(errorValue)) return;
        setError(errorValue instanceof Error ? errorValue.message : 'Failed to load approved enrollments.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, handleAuthFailure]
  );

  useEffect(() => {
    if (!token) return;
    void loadApproved(true);
  }, [token, loadApproved]);

  const onResetConfirm = async () => {
    if (!token || !resetDialog || !isSuperAdmin) return;
    setActionKey(`reset:${resetDialog.studentId}`);
    try {
      const result = await resetEnrollment(token, resetDialog.studentId);
      if (!result.success) {
        showToast({ title: 'Reset failed', message: result.message, variant: 'error' });
        return;
      }
      showToast({ title: 'Enrollment reset', message: result.message, variant: 'success' });
      await loadApproved(false);
      setResetDialog(null);
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

  const onProcess = async (item: EnrollmentRecord) => {
    if (!token) return;
    const processKey = `process:${item.student_id}`;
    setActionKey(processKey);
    try {
      const result = await processEnrollment(token, item.student_id);
      if (!result.success || !result.processing_passed || result.embeddings_generated_count <= 0) {
        const message = !result.success
          ? result.message
          : result.embeddings_generated_count <= 0
            ? 'Processing finished but no embeddings were generated.'
            : result.message || 'Processing failed.';
        showToast({ title: 'Processing failed', message, variant: 'error' });
        await loadApproved(false);
        return;
      }
      showToast({
        title: 'Embeddings generated',
        message: `Generated ${result.embeddings_generated_count} embeddings for ${item.student_id}.`,
        variant: 'success',
      });
      await loadApproved(false);
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
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400/60" />
        Loading approved enrollments…
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Main card */}
      <div className="admin-surface relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        <div className="flex flex-col gap-4 border-b border-white/[0.05] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-white">Approved Enrollment Management</h2>
            <p className="mt-0.5 text-[0.82rem] text-slate-400">
              Reset is available only here and only for approved students.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn-ghost w-full sm:w-auto"
            onClick={() => loadApproved(false)}
            disabled={isRefreshing || actionKey !== null}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>

        <div className="space-y-4 p-6">
          {!isSuperAdmin ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-[0.85rem] text-rose-300">
              Reset is restricted to super_admin users.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-[0.85rem] text-rose-300">
              <p>{error}</p>
              <button type="button" className="admin-btn-ghost mt-3" onClick={() => loadApproved(true)}>
                Retry
              </button>
            </div>
          ) : null}

          {!error && rows.length === 0 ? (
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-8 text-center text-[0.85rem] text-slate-500">
              No approved or processed enrollments found.
            </div>
          ) : null}

          {!error && rows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/[0.05] bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-medium uppercase tracking-widest text-slate-500">Student</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-medium uppercase tracking-widest text-slate-500">Contact</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-medium uppercase tracking-widest text-slate-500">Updated</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-medium uppercase tracking-widest text-slate-500">Processing</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-medium uppercase tracking-widest text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const resetKey = `reset:${item.student_id}`;
                    const processKey = `process:${item.student_id}`;
                    const rowBusy = actionKey === resetKey || actionKey === processKey;
                    const processingState = item.processing_state;
                    const isProcessed = processingState === 'processed';
                    const isProcessingFailed = processingState === 'processing_failed';
                    const needsProcessing = processingState === 'needs_processing';
                    const canProcess = needsProcessing || isProcessingFailed;

                    return (
                      <tr key={item.student_id} className="admin-table-row border-b border-white/[0.04] align-top last:border-0">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-100">{item.full_name || '-'}</p>
                          <p className="text-[0.75rem] text-slate-500">ID: {item.student_id}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[0.8rem] text-slate-500">
                          <p>{item.university_email || '-'}</p>
                          <p>{item.phone || '-'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[0.8rem] text-slate-500">
                          <p>{formatDate(item.updated_at || item.created_at)}</p>
                          <p>{item.updated_at ? `Created: ${formatDate(item.created_at)}` : ''}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {isProcessed ? (
                            <span className="admin-badge admin-badge-approved">
                              <CheckCircle2 className="size-3" />
                              Processed
                            </span>
                          ) : isProcessingFailed ? (
                            <span className="admin-badge admin-badge-rejected">Processing failed</span>
                          ) : needsProcessing ? (
                            <span className="admin-badge admin-badge-pending">Needs processing</span>
                          ) : (
                            <span className="text-[0.75rem] text-slate-600">Not applicable</span>
                          )}
                          {item.last_processing_message ? (
                            <p className="mt-1.5 max-w-xs text-[0.72rem] text-slate-500">
                              {item.last_processing_message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="admin-btn-primary"
                              onClick={() => onProcess(item)}
                              disabled={rowBusy || !canProcess}
                            >
                              {actionKey === processKey ? (
                                <div className="size-3.5 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
                              ) : null}
                              {isProcessingFailed ? 'Retry Process' : isProcessed ? 'Processed' : 'Process'}
                            </button>

                            {isSuperAdmin ? (
                              <button
                                type="button"
                                className="admin-btn-danger"
                                onClick={() => setResetDialog({ studentId: item.student_id, fullName: item.full_name })}
                                disabled={rowBusy}
                              >
                                <Undo2 className="size-3.5" />
                                Reset
                              </button>
                            ) : (
                              <span className="text-[0.75rem] text-slate-600">Reset not allowed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reset Dialog */}
      {resetDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
          <div className="admin-surface-elevated relative w-full max-w-lg overflow-hidden p-7">
            <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />
            <h2 className="flex items-center gap-2 text-[1rem] font-semibold text-white">
              <ShieldAlert className="size-5 text-rose-400" />
              Confirm Reset Enrollment
            </h2>
            <p className="mt-1 text-[0.82rem] text-slate-400">
              Reset will remove approved operational data for{' '}
              <strong className="text-slate-200">{resetDialog.fullName || resetDialog.studentId}</strong>.
            </p>
            <p className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-3.5 text-[0.82rem] text-rose-300">
              This is destructive. Student will need to register again from scratch.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="admin-btn-ghost"
                onClick={() => setResetDialog(null)}
                disabled={actionKey === `reset:${resetDialog.studentId}`}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={onResetConfirm}
                disabled={actionKey === `reset:${resetDialog.studentId}`}
              >
                {actionKey === `reset:${resetDialog.studentId}` ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-rose-400/60" />
                    Resetting…
                  </>
                ) : (
                  'Confirm Reset'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Suppress unused import warning */}
      {false && <Loader2 />}
    </div>
  );
}
