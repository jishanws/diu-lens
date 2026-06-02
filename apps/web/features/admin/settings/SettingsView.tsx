'use client';

import { Save, Shield, Sliders, Lock, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('biometric');

  const tabs = [
    { id: 'biometric', label: 'Biometric Engine', icon: Sliders },
    { id: 'security', label: 'System Security', icon: Shield },
    { id: 'access', label: 'Admin Access', icon: Lock },
    { id: 'audit', label: 'Data & Audit', icon: Database },
  ];

  return (
    <div className="flex h-full flex-col p-6 lg:p-8 overflow-y-auto admin-workspace-scroll">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-slate-100">System Configuration</h1>
          <p className="mt-1.5 text-[0.85rem] text-slate-400">Secure platform parameters and infrastructure settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="admin-btn-primary group h-9 px-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-300">
            <Save className="size-4" />
            <span className="font-semibold tracking-wide">Save Configuration</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-[240px] shrink-0">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 admin-workspace-scroll">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={cn(
                   "flex items-center gap-3 rounded-lg px-4 py-3 text-[0.8rem] font-medium transition-all duration-200 whitespace-nowrap",
                   activeTab === tab.id
                     ? "bg-[#6493b5]/10 text-[#6493b5] border border-[#6493b5]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                     : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent"
                 )}
               >
                 <tab.icon className={cn("size-4", activeTab === tab.id ? "text-[#6493b5]" : "text-slate-500")} />
                 {tab.label}
               </button>
             ))}
          </div>
        </div>

        {/* Configuration Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          {activeTab === 'biometric' && (
            <>
              {/* Panel 1 */}
              <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-7 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="mb-6 pb-5 border-b border-white/[0.04]">
                  <h3 className="text-[1rem] font-medium text-slate-200">Matching Thresholds</h3>
                  <p className="mt-1 text-[0.75rem] text-slate-500">Configure global parameters for cosine distance confidence mapping.</p>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[0.85rem] font-medium text-slate-300">High Confidence Boundary</h4>
                      <p className="text-[0.7rem] text-slate-500 mt-0.5">Maximum distance to automatically approve matches.</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" defaultValue="0.25" step="0.01" className="h-9 w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:border-[#6493b5]/50 focus:outline-none" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[0.85rem] font-medium text-slate-300">Review Threshold</h4>
                      <p className="text-[0.7rem] text-slate-500 mt-0.5">Distance triggering manual administrative review.</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" defaultValue="0.38" step="0.01" className="h-9 w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:border-[#6493b5]/50 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 2 */}
              <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-7 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="mb-6 pb-5 border-b border-white/[0.04]">
                  <h3 className="text-[1rem] font-medium text-slate-200">Processing Engine</h3>
                  <p className="mt-1 text-[0.75rem] text-slate-500">Resource allocation for Celery workers and embedding extraction.</p>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[0.85rem] font-medium text-slate-300">GPU Acceleration</h4>
                      <p className="text-[0.7rem] text-slate-500 mt-0.5">Force extraction tasks to CUDA devices when available.</p>
                    </div>
                    <div className="relative inline-flex h-5 w-9 cursor-pointer rounded-full bg-[#6493b5]">
                       <div className="absolute left-[2px] top-[2px] h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[0.85rem] font-medium text-slate-300">Max Worker Concurrency</h4>
                      <p className="text-[0.7rem] text-slate-500 mt-0.5">Limit concurrent face detection processes.</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" defaultValue="4" className="h-9 w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:border-[#6493b5]/50 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-7 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
               <div className="mb-6 pb-5 border-b border-white/[0.04] flex items-center gap-3">
                  <Shield className="size-5 text-[#6493b5]" />
                  <div>
                    <h3 className="text-[1rem] font-medium text-slate-200">Security Policies</h3>
                    <p className="mt-1 text-[0.75rem] text-slate-500">Platform-wide security enforcement.</p>
                  </div>
               </div>
               
               <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[0.85rem] font-medium text-slate-300">Require MFA for Admins</h4>
                      <p className="text-[0.7rem] text-slate-500 mt-0.5">Enforce multi-factor authentication for console access.</p>
                    </div>
                    <div className="relative inline-flex h-5 w-9 cursor-pointer rounded-full bg-[#6493b5]">
                       <div className="absolute left-[2px] top-[2px] h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[0.85rem] font-medium text-slate-300">Session Timeout (Minutes)</h4>
                      <p className="text-[0.7rem] text-slate-500 mt-0.5">Idle time before automatic logout.</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" defaultValue="30" className="h-9 w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:border-[#6493b5]/50 focus:outline-none" />
                    </div>
                  </div>
               </div>
            </div>
          )}

          {(activeTab === 'access' || activeTab === 'audit') && (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[300px] rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="relative mb-6 flex size-16 items-center justify-center rounded-full border border-white/[0.03] bg-[#080b0f] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                  <div className="absolute inset-0 rounded-full border-t border-white/[0.05]" />
                  <Lock className="size-6 text-slate-600/40" />
                </div>
                <h3 className="text-[0.95rem] font-medium tracking-wide text-slate-300">Module Restricted</h3>
                <p className="mt-2.5 max-w-[280px] text-[0.8rem] leading-relaxed text-slate-500">
                  This configuration panel requires Super Administrator privileges to access.
                </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
