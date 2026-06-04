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
import { recordOperationEvent } from '@/features/admin/operations';
import { useAdminToast } from '@/features/admin/ui/AdminToastProvider';
import { cn } from '@/lib/utils';

type ResetDialogState = {
  studentId: string;
  fullName: string;
};

function formatApprovedOn(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} • ${hours}:${minutes}`;
}

function getTimeAgo(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'Approved today';
  if (days === 1) return 'Approved 1 day ago';
  return `Approved ${days} days ago`;
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
      recordOperationEvent({
        actionType: 'record_reset',
        affectedRecord: resetDialog.studentId,
        operatorIdentity: admin?.email || 'Unknown admin',
        result: 'success',
        detail: 'Approved record reset by authorized super admin.',
      });
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
      recordOperationEvent({
        actionType: 'face_embedding_generated',
        affectedRecord: item.student_id,
        operatorIdentity: admin?.email || 'Unknown admin',
        result: 'success',
        detail: `Biometric processing generated ${result.embeddings_generated_count} embeddings.`,
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
                  <div key={item.student_id} className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.03] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
                    
                    {/* Identity Block */}
                    <div className="flex flex-col gap-1 sm:w-2/5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="text-[1rem] font-bold tracking-tight text-slate-100">{item.full_name || 'Unknown User'}</p>
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-[0.65rem] font-mono tracking-widest text-slate-400">
                          {item.student_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-[0.8rem] text-slate-400 hidden sm:block">{item.university_email || 'No email provided'}</p>
                        {item.phone && (
                          <>
                            <span className="hidden sm:block text-slate-700 text-[0.6rem]">•</span>
                            <p className="text-[0.8rem] text-slate-400 hidden sm:block">{item.phone}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Operational Information */}
                    <div className="flex flex-col gap-0.5 sm:w-1/3">
                      <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 font-medium mb-0.5">Approved On</div>
                      <div className="text-[0.85rem] font-medium text-slate-200">
                        {formatApprovedOn(item.updated_at || item.created_at)}
                      </div>
                      <div className="text-[0.7rem] text-slate-300 mt-0.5">
                        {getTimeAgo(item.updated_at || item.created_at)}
                      </div>
                    </div>

                    {/* Actions & Status Badge */}
                    <div className="flex shrink-0 flex-col items-end justify-center gap-3 sm:w-1/4">
                      {/* Badge */}
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-semibold tracking-wider uppercase shadow-sm",
                        item.has_active_embeddings
                          ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400"
                          : isProcessed
                          ? "border-[#6493b5]/20 bg-[#6493b5]/[0.08] text-[#6493b5]"
                          : isProcessingFailed
                          ? "border-rose-500/20 bg-rose-500/[0.08] text-rose-400"
                          : needsProcessing
                          ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-400"
                          : "border-slate-500/20 bg-slate-500/[0.08] text-slate-400"
                      )}>
                        {(item.has_active_embeddings || isProcessed) && <CheckCircle2 className="size-3.5 opacity-80" />}
                        {isProcessingFailed && <ShieldAlert className="size-3.5 opacity-80" />}
                        {needsProcessing && <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />}
                        {item.has_active_embeddings ? 'Active' : isProcessed ? 'Processed' : isProcessingFailed ? 'Failed' : needsProcessing ? 'Needs Sync' : 'Approved'}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 mt-0.5">
                        {isSuperAdmin ? (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-[0.7rem] font-medium text-slate-500 hover:text-rose-400 transition-colors"
                            onClick={() => setResetDialog({ studentId: item.student_id, fullName: item.full_name })}
                            disabled={rowBusy}
                          >
                            <Undo2 className="size-3" />
                            Reset
                          </button>
                        ) : null}
                        {canProcess && (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-[0.7rem] font-medium text-[#6493b5] hover:text-[#83b0cd] transition-colors"
                            onClick={() => onProcess(item)}
                            disabled={rowBusy}
                          >
                            {actionKey === processKey ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RefreshCw className="size-3" />
                            )}
                            {isProcessingFailed ? 'Retry' : 'Process'}
                          </button>
                        )}
                      </div>
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
