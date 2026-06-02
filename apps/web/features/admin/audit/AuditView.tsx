'use client';

import { Activity, ArrowDownToLine, Search, ShieldAlert, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type AuditEvent = {
  id: string;
  timestamp: string;
  actionType: 'VERIFICATION_APPROVED' | 'VERIFICATION_REJECTED' | 'BIOMETRIC_SCAN' | 'SYSTEM_CONFIG_CHANGED' | 'ADMIN_LOGIN';
  studentId?: string;
  actor: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  ipAddress: string;
};

const MOCK_AUDIT_LOGS: AuditEvent[] = [
  { id: 'EVT-9381', timestamp: '2026-06-02T10:14:22Z', actionType: 'VERIFICATION_APPROVED', studentId: '211-15-1422', actor: 'admin@diu.edu.bd', status: 'SUCCESS', ipAddress: '192.168.1.45' },
  { id: 'EVT-9380', timestamp: '2026-06-02T10:11:05Z', actionType: 'BIOMETRIC_SCAN', studentId: '211-15-1422', actor: 'SYSTEM', status: 'SUCCESS', ipAddress: 'Internal' },
  { id: 'EVT-9379', timestamp: '2026-06-02T09:45:11Z', actionType: 'VERIFICATION_REJECTED', studentId: '193-15-1102', actor: 'sysadmin@diu.edu.bd', status: 'SUCCESS', ipAddress: '10.0.0.12' },
  { id: 'EVT-9378', timestamp: '2026-06-02T09:42:15Z', actionType: 'BIOMETRIC_SCAN', studentId: '193-15-1102', actor: 'SYSTEM', status: 'FAILURE', ipAddress: 'Internal' },
  { id: 'EVT-9377', timestamp: '2026-06-02T08:30:00Z', actionType: 'SYSTEM_CONFIG_CHANGED', actor: 'sysadmin@diu.edu.bd', status: 'SUCCESS', ipAddress: '10.0.0.12' },
  { id: 'EVT-9376', timestamp: '2026-06-02T08:15:22Z', actionType: 'ADMIN_LOGIN', actor: 'sysadmin@diu.edu.bd', status: 'SUCCESS', ipAddress: '10.0.0.12' },
  { id: 'EVT-9375', timestamp: '2026-06-02T08:14:05Z', actionType: 'ADMIN_LOGIN', actor: 'unknown', status: 'FAILURE', ipAddress: '103.11.22.100' },
  { id: 'EVT-9374', timestamp: '2026-06-01T15:22:11Z', actionType: 'VERIFICATION_APPROVED', studentId: '221-15-3301', actor: 'admin@diu.edu.bd', status: 'SUCCESS', ipAddress: '192.168.1.45' },
  { id: 'EVT-9373', timestamp: '2026-06-01T15:20:00Z', actionType: 'BIOMETRIC_SCAN', studentId: '221-15-3301', actor: 'SYSTEM', status: 'SUCCESS', ipAddress: 'Internal' },
];

function getActionLabel(type: AuditEvent['actionType']) {
  switch (type) {
    case 'VERIFICATION_APPROVED': return 'Verification Approved';
    case 'VERIFICATION_REJECTED': return 'Verification Rejected';
    case 'BIOMETRIC_SCAN': return 'Biometric Scan Attempt';
    case 'SYSTEM_CONFIG_CHANGED': return 'System Config Modified';
    case 'ADMIN_LOGIN': return 'Admin Authentication';
    default: return type;
  }
}

function getActionIcon(type: AuditEvent['actionType']) {
  switch (type) {
    case 'VERIFICATION_APPROVED': return <CheckCircle2 className="size-3.5 text-emerald-400" />;
    case 'VERIFICATION_REJECTED': return <XCircle className="size-3.5 text-rose-400" />;
    case 'BIOMETRIC_SCAN': return <Activity className="size-3.5 text-[#6493b5]" />;
    case 'SYSTEM_CONFIG_CHANGED': return <ShieldAlert className="size-3.5 text-amber-400" />;
    case 'ADMIN_LOGIN': return <FileText className="size-3.5 text-slate-400" />;
  }
}

export function AuditView() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-slate-100">Audit & Activity Log</h1>
          <p className="mt-1.5 text-[0.85rem] text-slate-400">Institutional verification activity and system events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="admin-btn-ghost group h-9 px-4">
            <ArrowDownToLine className="size-4 opacity-70 transition-opacity group-hover:opacity-100" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Surface */}
      <div className="flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] bg-[#080b0f]/80 px-4 sm:px-6 py-4">
          <div className="relative w-full sm:max-w-[280px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search ID, IP, or Actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 sm:h-9 w-full rounded-md border border-white/[0.05] bg-black/20 pl-9 pr-4 text-[0.8rem] sm:text-[0.8rem] text-slate-200 placeholder:text-slate-500 focus:border-[#6493b5]/40 focus:outline-none focus:ring-1 focus:ring-[#6493b5]/40"
            />
          </div>
          <div className="flex w-full overflow-x-auto sm:w-auto items-center gap-3 admin-workspace-scroll pb-1 sm:pb-0">
             <div className="flex shrink-0 items-center gap-2 rounded-md border border-white/[0.04] bg-white/[0.02] p-1 text-[0.7rem] font-medium text-slate-400">
               <button className="rounded px-3 sm:px-2.5 py-1.5 sm:py-1 text-slate-200 bg-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.2)]">All</button>
               <button className="rounded px-3 sm:px-2.5 py-1.5 sm:py-1 hover:text-slate-200">Verifications</button>
               <button className="rounded px-3 sm:px-2.5 py-1.5 sm:py-1 hover:text-slate-200">System</button>
             </div>
          </div>
        </div>

        {/* Table Content (Desktop) & Cards (Mobile) */}
        <div className="admin-workspace-scroll flex-1 overflow-x-auto overflow-y-auto bg-transparent">
          
          {/* Desktop Table Layout */}
          <table className="hidden md:table w-full min-w-[800px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#080b0f]/95 backdrop-blur-md">
              <tr>
                <th className="border-b border-white/[0.04] px-6 py-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">Timestamp</th>
                <th className="border-b border-white/[0.04] px-6 py-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">Action / Event</th>
                <th className="border-b border-white/[0.04] px-6 py-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">Target (ID)</th>
                <th className="border-b border-white/[0.04] px-6 py-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">Actor</th>
                <th className="border-b border-white/[0.04] px-6 py-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">IP Address</th>
                <th className="border-b border-white/[0.04] px-6 py-3 text-[0.65rem] font-medium uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="group transition-colors hover:bg-white/[0.015]">
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[0.75rem] text-slate-300">
                        {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-mono text-[0.7rem] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.04] bg-[#0c1015] shadow-sm">
                        {getActionIcon(log.actionType)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.8rem] font-medium text-slate-200">{getActionLabel(log.actionType)}</span>
                        <span className="text-[0.65rem] text-slate-500 font-mono">{log.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {log.studentId ? (
                      <span className="font-mono text-[0.8rem] text-slate-300">{log.studentId}</span>
                    ) : (
                      <span className="text-[0.8rem] text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                     <span className={cn(
                       "text-[0.75rem] font-medium",
                       log.actor === 'SYSTEM' ? "text-[#6493b5] bg-[#6493b5]/10 px-2 py-0.5 rounded" : "text-slate-400"
                     )}>
                       {log.actor}
                     </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-[0.75rem] text-slate-500">{log.ipAddress}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/[0.02] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/10 bg-rose-500/[0.02] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-rose-400">
                        <span className="size-1.5 rounded-full bg-rose-400" />
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards Layout */}
          <div className="flex flex-col md:hidden divide-y divide-white/[0.02]">
            {MOCK_AUDIT_LOGS.map((log) => (
              <div key={log.id} className="flex flex-col gap-3 p-4 hover:bg-white/[0.015] transition-colors">
                
                {/* Header: Action & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/[0.04] bg-[#0c1015] shadow-sm">
                      {getActionIcon(log.actionType)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.85rem] font-medium text-slate-200">{getActionLabel(log.actionType)}</span>
                      <span className="font-mono text-[0.65rem] text-slate-500">{log.id}</span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/[0.02] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/10 bg-rose-500/[0.02] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-rose-400">
                        <span className="size-1.5 rounded-full bg-rose-400" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/[0.02] bg-white/[0.01] p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">Target</span>
                    {log.studentId ? (
                      <span className="font-mono text-[0.75rem] text-slate-300">{log.studentId}</span>
                    ) : (
                      <span className="text-[0.75rem] text-slate-600">—</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">Actor</span>
                    <span className={cn(
                       "text-[0.75rem] font-medium truncate",
                       log.actor === 'SYSTEM' ? "text-[#6493b5]" : "text-slate-400"
                     )}>
                       {log.actor}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">Time</span>
                    <span className="font-mono text-[0.7rem] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                      <span className="text-slate-600 ml-1">{new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">Network</span>
                    <span className="font-mono text-[0.7rem] text-slate-400">{log.ipAddress}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
        
        {/* Pagination Footer */}
        <div className="border-t border-white/[0.04] bg-[#080b0f]/60 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[0.75rem] text-slate-500 text-center sm:text-left">Showing 1 to 9 of 1,204 logs</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="admin-btn-ghost h-10 sm:h-8 flex-1 sm:flex-none px-3 text-[0.75rem] sm:text-[0.7rem] justify-center">Prev</button>
            <button className="admin-btn-ghost h-10 sm:h-8 flex-1 sm:flex-none px-3 text-[0.75rem] sm:text-[0.7rem] justify-center">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}
