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
        <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-[#6493b5]/60" />
        Loading approved enrollments…
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Main card */}
      <div className="admin-surface relative overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/[0.03] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-white">Approved Enrollment Management</h2>
            <p className="mt-0.5 text-[0.82rem] text-slate-400">
              Reset is available only here and only for approved students.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn-ghost w-full sm:w-auto min-h-[44px]"
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
            <div className="rounded-2xl border border-white/[0.03] bg-white/[0.01] p-12 text-center text-[0.85rem] text-slate-500">
              No approved or processed enrollments found.
            </div>
          ) : null}

          {!error && rows.length > 0 ? (
            <div className="flex flex-col gap-3">
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
                      {item.phone && <p className="text-[0.75rem] text-slate-500 hidden sm:block">{item.phone}</p>}
                    </div>

                    {/* Processing Summary */}
                    <div className="flex flex-col gap-2.5 sm:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide",
                          isProcessed
                            ? "border-[#6493b5]/10 bg-[#6493b5]/[0.05] text-[#6493b5]"
                            : isProcessingFailed
                            ? "border-rose-500/10 bg-rose-500/[0.05] text-rose-400"
                            : needsProcessing
                            ? "border-amber-500/10 bg-amber-500/[0.05] text-amber-400"
                            : "border-slate-500/10 bg-slate-500/[0.05] text-slate-400"
                        )}>
                          {isProcessed && <CheckCircle2 className="size-3" />}
                          {isProcessingFailed && <ShieldAlert className="size-3" />}
                          {needsProcessing && <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />}
                          {isProcessed ? 'Processed' : isProcessingFailed ? 'Processing Failed' : needsProcessing ? 'Needs Processing' : 'Not Applicable'}
                        </span>
                      </div>
                      {item.last_processing_message ? (
                        <p className="max-w-xs text-[0.72rem] text-slate-500">{item.last_processing_message}</p>
                      ) : null}
                      <p className="text-[0.7rem] text-slate-500">Updated: {formatDate(item.updated_at || item.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          className="admin-btn-ghost hover:text-rose-300 min-h-[44px] flex-1 sm:flex-none justify-center"
                          onClick={() => setResetDialog({ studentId: item.student_id, fullName: item.full_name })}
                          disabled={rowBusy}
                        >
                          <Undo2 className="size-3.5" />
                          Reset
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="admin-btn-primary min-h-[44px] flex-[2] sm:flex-none justify-center"
                        onClick={() => onProcess(item)}
                        disabled={rowBusy || !canProcess}
                      >
                        {actionKey === processKey ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                        {isProcessingFailed ? 'Retry Process' : isProcessed ? 'Processed' : 'Process'}
                      </button>
                    </div>
                  </div>
                );
              })}
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
                className="admin-btn-ghost min-h-[44px]"
                onClick={() => setResetDialog(null)}
                disabled={actionKey === `reset:${resetDialog.studentId}`}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-danger min-h-[44px]"
                onClick={onResetConfirm}
                disabled={actionKey === `reset:${resetDialog.studentId}`}
              >
                {actionKey === `reset:${resetDialog.studentId}` ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
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
