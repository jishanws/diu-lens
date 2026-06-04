'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import {
  AdminApiAuthError,
  fetchEnrollments,
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
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${year} • ${hours}:${minutes}`;
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
        <div className="flex items-center justify-between border-b border-white/[0.03] p-3 sm:px-5 sm:py-4">
          <div className="flex flex-col">
            <h2 className="text-[0.9rem] sm:text-[0.95rem] font-medium text-slate-200">Approved Enrollment Management</h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 text-[0.75rem] font-medium text-slate-300 hover:bg-white/[0.04] active:scale-95 transition-all"
            onClick={() => loadApproved(false)}
            disabled={isRefreshing || actionKey !== null}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing ? 'animate-spin' : '')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="space-y-2.5 sm:space-y-3 p-3 sm:p-5">
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
                const rowBusy = actionKey === resetKey;

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
                        <div className="flex flex-col gap-0">
                          <p className="truncate text-[0.7rem] text-slate-500">{item.university_email || 'No email provided'}</p>
                          {item.phone && (
                            <p className="truncate text-[0.7rem] text-slate-500">{item.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Metadata Grouping for Mobile */}
                      <div className="flex flex-col items-end gap-0.5 text-right sm:hidden shrink-0">
                        <div className="text-[0.65rem] text-slate-400">
                          {formatApprovedOn(item.updated_at || item.created_at).split(' • ')[0]}
                        </div>
                        <div className="text-[0.65rem] font-medium text-slate-500">
                          {getTimeAgo(item.updated_at || item.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Lifecycle Block */}
                    <div className="hidden sm:flex flex-col gap-0.5 sm:w-[20%]">
                      <div className="text-[0.75rem] font-medium text-slate-300">
                        {formatApprovedOn(item.updated_at || item.created_at)}
                      </div>
                      <div className="text-[0.7rem] text-slate-500">
                        {getTimeAgo(item.updated_at || item.created_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-1 sm:mt-0 sm:w-auto shrink-0">
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10 px-3 py-1.5 text-[0.75rem] font-medium text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 active:scale-95 transition-all"
                          onClick={() => setResetDialog({ studentId: item.student_id, fullName: item.full_name })}
                          disabled={rowBusy}
                        >
                          <Undo2 className="size-3.5" />
                          Reset
                        </button>
                      ) : null}
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
          <div className="admin-surface-elevated relative w-full max-w-lg overflow-hidden p-5 sm:p-7">
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
