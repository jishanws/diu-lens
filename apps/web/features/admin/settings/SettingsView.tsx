'use client';

import { Save, Shield, Database, Users, Fingerprint, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { fetchSystemConfig, SystemConfig } from '@/features/admin/api';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('verification');
  const { token } = useAdminAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchSystemConfig(token).then((data) => {
      setConfig(data);
      setIsLoading(false);
    });
  }, [token]);

  const tabs = [
    { id: 'verification', label: 'Verification', icon: Fingerprint },
    { id: 'enrollment', label: 'Enrollment', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'administrators', label: 'Administrators', icon: Users },
    { id: 'retention', label: 'Data Retention', icon: Database },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto admin-workspace-scroll">
      {/* Header */}
      <div className="mb-2 md:mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-slate-100">System Configuration</h1>
          <p className="mt-1.5 text-[0.85rem] text-slate-400">Secure platform parameters and infrastructure settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="admin-btn-primary group h-9 px-5 bg-[#6493b5]/10 text-[#6493b5] border border-[#6493b5]/20 hover:bg-[#6493b5]/20 hover:border-[#6493b5]/30 hover:text-white transition-colors" disabled={isLoading}>
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
          
          {isLoading ? (
            <div className="flex h-40 items-center justify-center rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
              <div className="size-6 animate-spin rounded-full border-2 border-[#6493b5] border-t-transparent" />
            </div>
          ) : (
            <>
              {activeTab === 'verification' && (
                <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 sm:p-7 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <div className="mb-6 pb-5 border-b border-white/[0.04]">
                    <h3 className="text-[1rem] font-medium text-slate-200">Verification Policies</h3>
                    <p className="mt-1 text-[0.75rem] text-slate-500">Global parameters for face matching confidence and quality.</p>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div>
                        <h4 className="text-[0.85rem] font-medium text-slate-300">Auto Approval Threshold</h4>
                        <p className="text-[0.7rem] text-slate-500 mt-0.5">Maximum cosine distance to automatically approve face matches.</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                         <input type="number" readOnly value={config?.verification?.auto_approval_threshold ?? ''} className="h-10 sm:h-9 w-full sm:w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:outline-none opacity-80 cursor-not-allowed" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div>
                        <h4 className="text-[0.85rem] font-medium text-slate-300">Minimum Face Quality (Blur Variance)</h4>
                        <p className="text-[0.7rem] text-slate-500 mt-0.5">Threshold below which enrollment images are rejected as blurry.</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                         <input type="number" readOnly value={config?.verification?.minimum_face_quality_blur ?? ''} className="h-10 sm:h-9 w-full sm:w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:outline-none opacity-80 cursor-not-allowed" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div>
                        <h4 className="text-[0.85rem] font-medium text-slate-300">Duplicate Enrollment Sensitivity</h4>
                        <p className="text-[0.7rem] text-slate-500 mt-0.5">Maximum perceptual hash distance to trigger duplicate review.</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                         <input type="number" readOnly value={config?.verification?.duplicate_enrollment_sensitivity ?? ''} className="h-10 sm:h-9 w-full sm:w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:outline-none opacity-80 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 sm:p-7 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                   <div className="mb-6 pb-5 border-b border-white/[0.04] flex items-center gap-3">
                      <Shield className="size-5 text-[#6493b5]" />
                      <div>
                        <h3 className="text-[1rem] font-medium text-slate-200">Security Policies</h3>
                        <p className="mt-1 text-[0.75rem] text-slate-500">Platform-wide security enforcement.</p>
                      </div>
                   </div>
                   
                   <div className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                          <h4 className="text-[0.85rem] font-medium text-slate-300">Session Timeout (Minutes)</h4>
                          <p className="text-[0.7rem] text-slate-500 mt-0.5">Idle time before automatic logout.</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                           <input type="number" readOnly value={config?.security?.session_timeout_minutes ?? ''} className="h-10 sm:h-9 w-full sm:w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:outline-none opacity-80 cursor-not-allowed" />
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'administrators' && (
                <div className="rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 p-5 sm:p-7 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                   <div className="mb-6 pb-5 border-b border-white/[0.04] flex items-center gap-3">
                      <Users className="size-5 text-[#6493b5]" />
                      <div>
                        <h3 className="text-[1rem] font-medium text-slate-200">Role Management</h3>
                        <p className="mt-1 text-[0.75rem] text-slate-500">Overview of administrative accounts and access levels.</p>
                      </div>
                   </div>
                   
                   <div className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                          <h4 className="text-[0.85rem] font-medium text-slate-300">Active Admin Accounts</h4>
                          <p className="text-[0.7rem] text-slate-500 mt-0.5">Total number of active administrative identities in the system.</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                           <input type="number" readOnly value={config?.administrators?.active_admin_accounts ?? ''} className="h-10 sm:h-9 w-full sm:w-24 rounded-md border border-white/[0.06] bg-black/40 px-3 text-center text-[0.85rem] font-mono text-slate-200 focus:outline-none opacity-80 cursor-not-allowed" />
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {/* Empty / Unimplemented states for other operational tabs */}
              {(activeTab === 'enrollment' || activeTab === 'retention' || activeTab === 'maintenance') && (
                <div className="flex flex-col items-center justify-center p-12 text-center h-[300px] rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="relative mb-6 flex size-16 items-center justify-center rounded-full border border-white/[0.03] bg-[#080b0f] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                      <div className="absolute inset-0 rounded-full border-t border-white/[0.05]" />
                      <SettingsIcon className="size-6 text-slate-600/40" />
                    </div>
                    <h3 className="text-[0.95rem] font-medium tracking-wide text-slate-300">Managed by Environment</h3>
                    <p className="mt-2.5 max-w-[320px] text-[0.8rem] leading-relaxed text-slate-500">
                      There are currently no runtime-configurable settings exposed for this category. System parameters are managed securely via environment configuration or automated policies.
                    </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
