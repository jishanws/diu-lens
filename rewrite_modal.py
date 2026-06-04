import re

with open('/Users/jishan/Code/diu-lens/apps/web/features/admin/enrollments/EnrollmentDetailsPanel.tsx', 'r') as f:
    content = f.read()

# I will write the entirely new content for this file
new_content = """import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertCircle, Clock, ShieldCheck, 
  User, Mail, Phone, Image as ImageIcon,
  ChevronDown, ChevronUp, AlertTriangle, Crosshair, Loader2,
  Calendar, FileCheck, ScanFace
} from 'lucide-react';
import { EnrollmentDetailsResponse, fetchEnrollmentDetails } from '../api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { RejectReasonModal } from './RejectReasonModal';
import Image from 'next/image';

function AuthenticatedImage({ src, token, alt, className }: { src: string; token: string; alt: string; className?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;

    async function fetchImage() {
      try {
        const response = await fetch(src, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        if (!mounted) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        if (mounted) setError(true);
      }
    }

    fetchImage();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-[#0c1015] border border-white/[0.05] text-slate-500 ${className || ''}`}>
        <AlertTriangle className="h-4 w-4 mb-1 opacity-50" />
        <span className="text-[10px]">Unavailable</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-[#0c1015] border border-white/[0.05] ${className || ''}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-800 border-t-[#6493b5]"></div>
      </div>
    );
  }

  return <Image src={imageUrl} alt={alt} fill unoptimized className={className} />;
}

const PanelCard = ({ title, icon: Icon, children, isWarning = false, className = '' }: { title: string, icon: React.ElementType, children: React.ReactNode, isWarning?: boolean, className?: string }) => {
  const borderColor = isWarning ? 'border-amber-500/30' : 'border-white/[0.04]';
  const headerBg = isWarning ? 'bg-amber-500/10' : 'bg-white/[0.02]';
  const textColor = isWarning ? 'text-amber-500' : 'text-slate-400';
  const iconColor = isWarning ? 'text-amber-500' : 'text-slate-400';

  return (
    <div className={`rounded-xl border bg-white/[0.01] flex flex-col overflow-hidden ${borderColor} ${className}`}>
      <div className={`px-5 py-3 border-b flex items-center gap-2.5 ${borderColor} ${headerBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h3 className={`text-[0.75rem] font-semibold uppercase tracking-wider ${textColor}`}>
          {title}
        </h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

interface EnrollmentDetailsPanelProps {
  studentId: string | null;
  onClose: () => void;
  onApprove: (studentId: string) => Promise<void>;
  onReject: (studentId: string, reason: string) => Promise<void>;
  isProcessing: boolean;
}

export function EnrollmentDetailsPanel({ 
  studentId, 
  onClose, 
  onApprove, 
  onReject,
  isProcessing 
}: EnrollmentDetailsPanelProps) {
  const { token } = useAdminAuth();
  const [details, setDetails] = useState<EnrollmentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  
  // State for gallery viewer
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !token) return;
    let mounted = true;
    
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEnrollmentDetails(token!, studentId!);
        if (mounted) {
          setDetails(data);
          // Set initial hero image (front or first available)
          if (data.prioritized_images.length > 0) {
            const initial = data.prioritized_images.find(img => img.angle === 'natural_front' || img.angle === 'front') || data.prioritized_images[0];
            setSelectedImageId(initial.id);
          }
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load details.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    load();
    return () => { mounted = false; };
  }, [studentId, token]);

  const handleRejectConfirm = async (reason: string) => {
    if (!studentId) return;
    await onReject(studentId, reason);
    setIsRejectModalOpen(false);
  };

  const getImageUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}/admin/storage/${path}`;
  };

  const primaryImage = useMemo(() => {
    if (!details || !selectedImageId) return null;
    return details.prioritized_images.find(img => img.id === selectedImageId) 
      || details.supplementary_images.find(img => img.id === selectedImageId)
      || details.prioritized_images[0];
  }, [details, selectedImageId]);

  return (
    <>
      <AnimatePresence>
        {studentId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-50 w-full lg:w-[1200px] max-w-full border-l border-white/[0.04] bg-[#0c1015] shadow-2xl flex flex-col pt-[env(safe-area-inset-top)]"
            >
              {/* 1. HEADER (Fixed 72-80px) */}
              <div className="flex-none flex items-center justify-between h-[72px] sm:h-[80px] px-6 border-b border-white/[0.04] bg-[#0c1015]">
                
                {/* Left: Review Workstation & Status */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <h2 className="text-[1.05rem] sm:text-[1.1rem] font-semibold text-slate-100 flex items-center gap-2.5 truncate">
                    <ShieldCheck className="h-5 w-5 text-[#6493b5] shrink-0" />
                    Review Workstation
                  </h2>
                  {details && (
                    <>
                      <div className="h-4 w-px bg-white/10 shrink-0 hidden sm:block" />
                      <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-[0.65rem] uppercase tracking-widest font-medium text-slate-300 shrink-0">
                        {details.enrollment.status}
                      </span>
                    </>
                  )}
                </div>

                {/* Center: Student Metadata */}
                {details && (
                  <div className="hidden lg:flex items-center justify-center flex-[1.5]">
                    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-2">
                      <span className="text-[0.8rem] font-medium text-slate-400">
                        ID: <span className="text-slate-200">{details.student.student_id}</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[0.8rem] font-medium text-slate-300">
                        {details.student.full_name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Right: Close Action */}
                <div className="flex justify-end flex-1">
                  <button
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 transition-colors border border-transparent hover:border-white/[0.05]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 2. MAIN REVIEW WORKSPACE (Scrollable Body) */}
              <div className="flex-1 overflow-y-auto bg-[#0a0d12]">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-[#6493b5]" />
                  </div>
                ) : error ? (
                  <div className="m-8 rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 flex gap-3 text-rose-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : details ? (
                  <div className="p-6 lg:p-8">
                    {/* Two Column Layout: 65% / 35% */}
                    <div className="grid grid-cols-1 lg:grid-cols-[65%_calc(35%-2rem)] gap-8 items-start">
                      
                      {/* =========================================
                          LEFT COLUMN: Evidence Review 
                          ========================================= */}
                      <div className="flex flex-col gap-6">
                        
                        {/* Section 1: Primary Identity Frame */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-[#6493b5]" />
                              Primary Identity Frame
                            </h3>
                            {primaryImage && (
                              <span className="text-[0.7rem] uppercase tracking-wider text-slate-400 bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.04]">
                                {primaryImage.angle.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          
                          {primaryImage && (
                            <div className="relative w-full rounded-xl overflow-hidden bg-[#0c1015] border border-white/[0.05] shadow-lg flex items-center justify-center min-h-[420px] max-h-[500px]">
                              <AuthenticatedImage 
                                src={getImageUrl(primaryImage.file_path)} 
                                token={token || ''}
                                alt={`${primaryImage.angle} frame`} 
                                className="object-contain w-full h-full"
                              />
                            </div>
                          )}
                        </div>

                        {/* Section 2: Capture Gallery */}
                        <div className="flex flex-col gap-3">
                          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                            <ScanFace className="h-4 w-4 text-[#6493b5]" />
                            Capture Gallery
                          </h3>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                            {details.prioritized_images.map((img) => (
                              <button
                                key={img.id}
                                onClick={() => setSelectedImageId(img.id)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                                  selectedImageId === img.id 
                                    ? 'border-[#6493b5] opacity-100 ring-2 ring-[#6493b5]/20 ring-offset-2 ring-offset-[#0a0d12]' 
                                    : 'border-white/[0.04] opacity-60 hover:opacity-100 hover:border-white/20'
                                }`}
                              >
                                <AuthenticatedImage 
                                  src={getImageUrl(img.file_path)} 
                                  token={token || ''}
                                  alt={`${img.angle} thumbnail`} 
                                  className="object-cover w-full h-full bg-[#0c1015]"
                                />
                                <div className={`absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1.5 border-t ${selectedImageId === img.id ? 'border-[#6493b5]/50' : 'border-white/[0.05]'}`}>
                                  <p className={`text-[0.55rem] uppercase tracking-wider font-semibold text-center truncate ${selectedImageId === img.id ? 'text-[#6493b5]' : 'text-slate-300'}`}>
                                    {img.angle.replace(/_/g, ' ')}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 3: Enrollment Metadata */}
                        <PanelCard title="Enrollment Metadata" icon={FileCheck}>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Date</p>
                              <p className="text-[0.85rem] font-medium text-slate-200">
                                {new Date(details.enrollment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Frames</p>
                              <p className="text-[0.85rem] font-medium text-slate-200">
                                {details.prioritized_images.length + details.supplementary_images.length} Captured
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Quality</p>
                              <p className="text-[0.85rem] font-medium text-slate-200">
                                {details.biometric_diagnostics.overall_quality_label}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Enrollment ID</p>
                              <p className="text-[0.85rem] font-medium text-slate-200 truncate" title={details.enrollment.id}>
                                {details.enrollment.id.split('-')[0]}...
                              </p>
                            </div>
                          </div>
                        </PanelCard>

                      </div>

                      {/* =========================================
                          RIGHT COLUMN: Decision Support 
                          ========================================= */}
                      <div className="flex flex-col gap-6">
                        
                        {/* Card 1: Student Information */}
                        <PanelCard title="Student Information" icon={User}>
                          <div className="flex flex-col gap-4">
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Full Name</p>
                              <p className="text-[0.9rem] font-medium text-slate-200">{details.student.full_name}</p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Student ID</p>
                              <p className="text-[0.9rem] font-medium text-slate-200">{details.student.student_id}</p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Email</p>
                              <p className="text-[0.85rem] font-medium text-slate-300 flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                {details.student.university_email}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mb-1">Phone</p>
                              <p className="text-[0.85rem] font-medium text-slate-300 flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                {details.student.phone}
                              </p>
                            </div>
                          </div>
                        </PanelCard>

                        {/* Card 2: Verification Insights */}
                        <PanelCard title="Verification Insights" icon={Crosshair}>
                          <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center pb-3 border-b border-white/[0.04]">
                              <p className="text-[0.8rem] font-medium text-slate-400">Consistency Score</p>
                              <p className="text-[0.9rem] font-semibold text-slate-200">{details.biometric_diagnostics.consistency_score.toFixed(1)}%</p>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/[0.04]">
                              <p className="text-[0.8rem] font-medium text-slate-400">Angle Coverage</p>
                              <p className="text-[0.9rem] font-semibold text-slate-200">{details.biometric_diagnostics.angle_coverage.toFixed(0)}%</p>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/[0.04]">
                              <p className="text-[0.8rem] font-medium text-slate-400">Capture Quality</p>
                              <p className="text-[0.9rem] font-semibold text-slate-200">{details.biometric_diagnostics.overall_quality_label}</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-[0.8rem] font-medium text-slate-400">Validation State</p>
                              <p className="text-[0.8rem] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                {details.enrollment.status}
                              </p>
                            </div>
                          </div>
                        </PanelCard>

                        {/* Duplicate Check Warning */}
                        {details.duplicate_candidates.length > 0 && (
                          <PanelCard title="Duplicate Warning" icon={AlertTriangle} isWarning>
                            <p className="text-[0.75rem] text-amber-500/90 mb-3 leading-relaxed font-medium">
                              Matches existing profiles.
                            </p>
                            <div className="flex flex-col gap-2">
                              {details.duplicate_candidates.map((cand) => (
                                <div key={cand.student_id} className="flex items-center justify-between rounded-lg bg-black/40 p-3 border border-amber-500/10">
                                  <p className="text-[0.8rem] font-medium text-amber-500">{cand.student_id}</p>
                                  <p className="text-[0.8rem] font-semibold text-amber-400">{(100 - cand.best_distance * 100).toFixed(1)}%</p>
                                </div>
                              ))}
                            </div>
                          </PanelCard>
                        )}

                        {/* Card 3: Audit Timeline */}
                        <PanelCard title="Audit Timeline" icon={Clock}>
                          <div className="relative pl-4 space-y-5 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-white/[0.06]">
                            {details.timeline.map((log, i) => (
                              <div key={log.id} className="relative">
                                <div className={`absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full ${i === 0 ? 'bg-[#6493b5] ring-4 ring-[#6493b5]/20' : 'bg-slate-700'}`} />
                                <p className="text-[0.8rem] font-medium text-slate-200 capitalize">{log.event_type.replace(/_/g, ' ')}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[0.7rem] text-slate-400 truncate">{log.message}</p>
                                </div>
                                <p className="text-[0.65rem] text-slate-500 mt-1 uppercase tracking-widest font-mono">
                                  {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown Time'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </PanelCard>

                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 3. ACTION FOOTER (Fixed 72-80px) */}
              <div className="flex-none flex items-center justify-between h-[72px] sm:h-[80px] px-6 border-t border-white/[0.04] bg-[#0c1015]">
                {/* Left: Summary */}
                <div className="hidden sm:flex flex-col justify-center">
                  {details && details.enrollment.status === 'validated' ? (
                    <p className="text-[0.8rem] font-medium text-slate-300">Ready for processing.</p>
                  ) : details ? (
                    <p className="text-[0.8rem] font-medium text-rose-400 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Cannot approve in current status.
                    </p>
                  ) : null}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={loading || isProcessing || !details}
                    className="h-10 sm:h-11 px-6 rounded-lg bg-transparent border border-white/[0.08] text-[0.85rem] font-medium text-slate-300 hover:bg-white/[0.04] hover:text-white disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => studentId && onApprove(studentId)}
                    disabled={loading || isProcessing || !details || details.enrollment.status !== 'validated'}
                    className="h-10 sm:h-11 px-8 flex items-center justify-center gap-2 rounded-lg bg-[#6493b5] text-[0.85rem] font-semibold text-white hover:bg-[#75a3c7] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Approve & Extract'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <RejectReasonModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        isSubmitting={isProcessing}
      />
    </>
  );
}
"""

with open('/Users/jishan/Code/diu-lens/apps/web/features/admin/enrollments/EnrollmentDetailsPanel.tsx', 'w') as f:
    f.write(new_content)

