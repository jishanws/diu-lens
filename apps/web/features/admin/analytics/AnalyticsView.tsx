'use client';

import { BarChart3, Clock, TrendingUp, ShieldCheck, Activity, Zap, CheckCircle2 } from 'lucide-react';

export function AnalyticsView() {
  return (
    <div className="flex h-full flex-col p-6 lg:p-8 overflow-y-auto admin-workspace-scroll">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-slate-100">System Intelligence</h1>
          <p className="mt-1.5 text-[0.85rem] text-slate-400">Operational visibility and biometric performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-white/[0.04] bg-white/[0.02] p-1 text-[0.7rem] font-medium text-slate-400">
            <button className="rounded px-3 py-1.5 text-slate-200 bg-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.2)]">Today</button>
            <button className="rounded px-3 py-1.5 hover:text-slate-200">7D</button>
            <button className="rounded px-3 py-1.5 hover:text-slate-200">30D</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Metric Card 1 */}
        <div className="flex flex-col justify-between rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.75rem] font-medium uppercase tracking-widest text-slate-500">Verification Volume</h3>
            <Activity className="size-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-100">2,841</span>
            <span className="flex items-center gap-0.5 text-[0.7rem] font-medium text-emerald-400">
              <TrendingUp className="size-3" /> +12.5%
            </span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="flex flex-col justify-between rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.75rem] font-medium uppercase tracking-widest text-slate-500">Approval Rate</h3>
            <ShieldCheck className="size-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-[#6493b5]">94.2%</span>
            <span className="flex items-center gap-0.5 text-[0.7rem] font-medium text-emerald-400">
              <TrendingUp className="size-3" /> +1.2%
            </span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="flex flex-col justify-between rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.75rem] font-medium uppercase tracking-widest text-slate-500">Pending Reviews</h3>
            <Clock className="size-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-amber-400">142</span>
            <span className="flex items-center gap-0.5 text-[0.7rem] font-medium text-slate-500">
              Avg. 4m 12s
            </span>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="flex flex-col justify-between rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.75rem] font-medium uppercase tracking-widest text-slate-500">System Throughput</h3>
            <Zap className="size-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-100">8.4</span>
            <span className="text-[0.8rem] text-slate-500">req/s</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main Chart Area */}
        <div className="flex flex-col rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-6 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)] lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
             <h3 className="text-[0.85rem] font-medium uppercase tracking-[0.1em] text-slate-200">Verification Trends</h3>
             <BarChart3 className="size-4 text-slate-500" />
          </div>
          
          {/* Custom CSS Bar Chart Mockup */}
          <div className="mt-4 flex flex-1 items-end gap-2 sm:gap-4 h-[220px]">
            {[40, 65, 45, 80, 55, 90, 75, 85, 60, 45, 70, 85].map((height, i) => (
              <div key={i} className="group relative flex flex-1 flex-col justify-end h-full">
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded border border-white/[0.08] bg-[#161a22] px-2 py-1 text-[0.65rem] font-medium text-slate-200 opacity-0 transition-opacity group-hover:opacity-100">
                   {height * 12}
                </div>
                {/* Bar Container */}
                <div className="w-full bg-white/[0.02] rounded-t-sm h-full overflow-hidden flex flex-col justify-end">
                  <div 
                    className="w-full rounded-t-sm bg-gradient-to-t from-[#6493b5]/20 to-[#6493b5]/80 transition-all duration-500 group-hover:to-[#6493b5]" 
                    style={{ height: `${height}%` }}
                  />
                </div>
                {/* X-Axis Label */}
                <div className="mt-3 text-center text-[0.65rem] text-slate-600">
                  {String(i * 2).padStart(2, '0')}:00
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary Column */}
        <div className="flex flex-col gap-6">
          {/* Confidence Distribution */}
          <div className="flex flex-col rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-6 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
            <h3 className="mb-5 text-[0.85rem] font-medium uppercase tracking-[0.1em] text-slate-200">Match Confidence</h3>
            <div className="flex flex-col gap-4">
               {/* High Confidence */}
               <div>
                 <div className="flex justify-between text-[0.7rem] mb-1.5">
                   <span className="font-medium text-emerald-400">High Confidence (&gt;90%)</span>
                   <span className="text-slate-400">78%</span>
                 </div>
                 <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                   <div className="h-full w-[78%] rounded-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                 </div>
               </div>
               {/* Likely Match */}
               <div>
                 <div className="flex justify-between text-[0.7rem] mb-1.5">
                   <span className="font-medium text-[#6493b5]">Likely Match (75-90%)</span>
                   <span className="text-slate-400">14%</span>
                 </div>
                 <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                   <div className="h-full w-[14%] rounded-full bg-[#6493b5]/80" />
                 </div>
               </div>
               {/* Needs Review */}
               <div>
                 <div className="flex justify-between text-[0.7rem] mb-1.5">
                   <span className="font-medium text-amber-400">Needs Review (&lt;75%)</span>
                   <span className="text-slate-400">8%</span>
                 </div>
                 <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                   <div className="h-full w-[8%] rounded-full bg-amber-500/80" />
                 </div>
               </div>
            </div>
          </div>

          {/* System Health */}
          <div className="flex flex-1 flex-col rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-6 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
            <h3 className="mb-5 text-[0.85rem] font-medium uppercase tracking-[0.1em] text-slate-200">System Health</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.01] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.75rem] font-medium text-slate-200">API Gateway</span>
                    <span className="text-[0.65rem] text-slate-500">24ms avg latency</span>
                  </div>
                </div>
                <span className="text-[0.7rem] text-emerald-400">Operational</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.01] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.75rem] font-medium text-slate-200">Biometric Engine</span>
                    <span className="text-[0.65rem] text-slate-500">GPU Cluster Active</span>
                  </div>
                </div>
                <span className="text-[0.7rem] text-emerald-400">Operational</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.01] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.75rem] font-medium text-slate-200">Redis Cache</span>
                    <span className="text-[0.65rem] text-slate-500">12.4 MB Used</span>
                  </div>
                </div>
                <span className="text-[0.7rem] text-emerald-400">Operational</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
