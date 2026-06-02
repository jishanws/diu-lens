import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertCircle, Clock, ShieldCheck, 
  User, Mail, Phone, Image as ImageIcon,
  ChevronDown, ChevronUp, AlertTriangle, Crosshair, Loader2
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
      <div className={`flex flex-col items-center justify-center bg-slate-900 border border-slate-800 text-slate-500 ${className || ''}`}>
        <AlertTriangle className="h-4 w-4 mb-1 opacity-50" />
        <span className="text-[10px]">Unavailable</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 border border-slate-800 ${className || ''}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-800 border-t-[#6493b5]"></div>
      </div>
    );
  }

  return <Image src={imageUrl} alt={alt} fill unoptimized className={className} />;
}

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
  const [showSupplementary, setShowSupplementary] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  useEffect(() => {
    if (!studentId || !token) return;
    let mounted = true;
    
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEnrollmentDetails(token!, studentId!);
        if (mounted) setDetails(data);
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

  const heroImage = useMemo(() => {
    if (!details || details.prioritized_images.length === 0) return null;
    return details.prioritized_images.find(img => img.angle === 'natural_front' || img.angle === 'front') || details.prioritized_images[0];
  }, [details]);

  const otherImages = useMemo(() => {
    if (!details) return [];
    return details.prioritized_images.filter(img => img.id !== heroImage?.id);
  }, [details, heroImage]);

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
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-[90vw] max-w-5xl border-l border-slate-800 bg-[#0b1422] shadow-2xl flex flex-col pt-[env(safe-area-inset-top)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0b1422]/80 backdrop-blur-md p-4 sm:p-6 sticky top-0 z-10 min-h-[64px]">
                <div>
                  <h2 className="text-[1.05rem] sm:text-xl font-semibold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-[#6493b5]" />
                    Biometric Verification Console
                  </h2>
                  <p className="hidden sm:block text-sm text-slate-400 mt-1">
                    Review and verify enrollment data for approval
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative pb-[calc(140px+env(safe-area-inset-bottom))]">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-[#6493b5]"></div>
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3 text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : details ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
                    
                    {/* Identity Details */}
                    <div className="order-1 lg:order-none lg:col-start-2 rounded-3xl border border-white/[0.04] bg-white/[0.01] p-5 sm:p-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-5 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Identity Information
                      </h3>
                      <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Full Name</p>
                          <p className="text-sm font-medium text-slate-200">{details.student.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Student ID</p>
                          <p className="text-sm font-medium text-slate-200">{details.student.student_id}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-xs text-slate-500 mb-1">Email</p>
                          <p className="text-sm font-medium text-slate-200 flex items-center gap-2 truncate">
                            <Mail className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span className="truncate">{details.student.university_email}</span>
                          </p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-xs text-slate-500 mb-1">Phone</p>
                          <p className="text-sm font-medium text-slate-200 flex items-center gap-2 truncate">
                            <Phone className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            {details.student.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Verification Insights (Health) */}
                    <div className="order-2 lg:order-none lg:col-start-2 rounded-3xl border border-white/[0.04] bg-white/[0.01] p-5 sm:p-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                        <Crosshair className="h-4 w-4" />
                        Verification Insights
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-black/20 p-3 sm:p-4 border border-white/[0.03]">
                          <p className="text-[0.65rem] sm:text-xs text-slate-500 mb-1">Consistency Score</p>
                          <div className="flex items-end gap-2">
                            <span className="text-xl sm:text-2xl font-semibold text-[#6493b5]">
                              {details.biometric_diagnostics.consistency_score.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3 sm:p-4 border border-white/[0.03]">
                          <p className="text-[0.65rem] sm:text-xs text-slate-500 mb-1">Angle Coverage</p>
                          <div className="flex items-end gap-2">
                            <span className="text-xl sm:text-2xl font-semibold text-slate-200">
                              {details.biometric_diagnostics.angle_coverage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3 sm:p-4 border border-white/[0.03]">
                          <p className="text-[0.65rem] sm:text-xs text-slate-500 mb-1">Quality Frames</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-semibold text-slate-200">
                              {details.biometric_diagnostics.blur_free_frame_count} 
                            </span>
                            <span className="text-xs sm:text-sm text-slate-500 pb-0.5">/ {details.biometric_diagnostics.total_frames}</span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3 sm:p-4 border border-white/[0.03]">
                          <p className="text-[0.65rem] sm:text-xs text-slate-500 mb-1">Capture Quality</p>
                          <div className="flex items-center h-full pb-1">
                            <span className="text-[0.8rem] sm:text-sm font-medium text-slate-300 leading-tight">
                              {details.biometric_diagnostics.overall_quality_label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BIOMETRIC EVIDENCE */}
                    <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-5 space-y-5 sm:space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Biometric Evidence
                        </h3>
                        {details.biometric_diagnostics.overall_capture_quality >= 75 ? (
                          <span className="flex items-center gap-1.5 text-[0.65rem] sm:text-xs font-medium text-[#6493b5] bg-[#6493b5]/10 px-2.5 py-1 rounded-full border border-[#6493b5]/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#6493b5]"></span> Excellent
                          </span>
                        ) : details.biometric_diagnostics.overall_capture_quality >= 60 ? (
                          <span className="flex items-center gap-1.5 text-[0.65rem] sm:text-xs font-medium text-amber-400 bg-amber-500/[0.05] px-2.5 py-1 rounded-full border border-amber-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Acceptable
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[0.65rem] sm:text-xs font-medium text-rose-400 bg-rose-500/[0.05] px-2.5 py-1 rounded-full border border-rose-500/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> Needs Review
                          </span>
                        )}
                      </div>

                      {/* Hero Image */}
                      {heroImage && (
                        <div className="relative aspect-[4/3] sm:aspect-square rounded-[1.5rem] overflow-hidden bg-black border border-white/[0.04] group shadow-xl">
                          <AuthenticatedImage 
                            src={getImageUrl(heroImage.file_path)} 
                            token={token || ''}
                            alt={`${heroImage.angle} frame`} 
                            className="w-full h-full object-cover transition-transform duration-700 sm:group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 sm:p-5 pt-12">
                            <p className="text-[0.8rem] sm:text-sm font-medium text-slate-200 capitalize">Primary Identity Frame ({heroImage.angle})</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Grid of secondary prioritized frames */}
                      {otherImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                          {otherImages.map((img) => (
                            <div key={img.id} className="relative aspect-square rounded-[1rem] overflow-hidden bg-black border border-white/[0.04] group">
                              <AuthenticatedImage 
                                src={getImageUrl(img.file_path)} 
                                token={token || ''}
                                alt={`${img.angle} frame`} 
                                className="w-full h-full object-cover transition-transform duration-500 sm:group-hover:scale-110"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-2.5 pt-6">
                                <p className="text-[0.6rem] sm:text-[11px] font-medium text-slate-300 capitalize">{img.angle}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Supplementary frames */}
                      {details.supplementary_images.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.04]">
                          <button 
                            onClick={() => setShowSupplementary(!showSupplementary)}
                            className="flex min-h-[44px] items-center justify-between w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                          >
                            <span>View {details.supplementary_images.length} supplementary frames</span>
                            {showSupplementary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          
                          <AnimatePresence>
                            {showSupplementary && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-3">
                                  {details.supplementary_images.map((img) => (
                                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-white/[0.04] opacity-80 sm:hover:opacity-100 transition-opacity">
                                      <AuthenticatedImage 
                                        src={getImageUrl(img.file_path)} 
                                        token={token || ''}
                                        alt={`supplementary ${img.angle}`} 
                                        className="w-full h-full object-cover sm:grayscale sm:hover:grayscale-0 transition-all"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 text-center">
                                        <p className="text-[9px] text-slate-400 capitalize">{img.angle}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Duplicate Check */}
                    {details.duplicate_candidates.length > 0 && (
                      <div className="order-4 lg:order-none lg:col-start-2 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
                        <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Potential Duplicate Detected
                        </h3>
                        <p className="text-[0.75rem] text-amber-500/80 mb-4 leading-relaxed">
                          The enrolling face strongly matches existing profiles in the database.
                        </p>
                        <div className="flex flex-col gap-2.5">
                          {details.duplicate_candidates.map((cand) => (
                            <div key={cand.student_id} className="flex items-center justify-between rounded-2xl bg-black/40 p-3.5 px-4 border border-amber-500/20">
                              <div>
                                <p className="text-[0.65rem] sm:text-xs text-slate-500 mb-0.5">Existing Match</p>
                                <p className="text-[0.8rem] sm:text-sm font-medium text-slate-200">{cand.student_id}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[0.65rem] sm:text-xs text-slate-500 mb-0.5">Similarity</p>
                                <p className="text-[0.8rem] sm:text-sm font-medium text-amber-400">{(100 - cand.best_distance * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="order-5 lg:order-none lg:col-start-2 rounded-3xl border border-white/[0.04] bg-white/[0.01] p-5 sm:p-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-5 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Audit Timeline
                      </h3>
                      <div className="relative pl-5 space-y-6 before:absolute before:inset-y-2 before:left-[9px] before:w-px before:bg-white/[0.08]">
                        {details.timeline.map((log, i) => (
                          <div key={log.id} className="relative">
                            <div className={`absolute -left-7 h-3 w-3 rounded-full border-2 border-[#03060c] ${i === 0 ? 'bg-[#6493b5] shadow-[0_0_10px_rgba(100, 147, 181,0.5)]' : 'bg-slate-700'}`} />
                            <p className="text-[0.8rem] sm:text-sm font-medium text-slate-200 capitalize">{log.event_type.replace(/_/g, ' ')}</p>
                            <p className="text-[0.7rem] sm:text-xs text-slate-500 mt-1 leading-relaxed">{log.message}</p>
                            <p className="text-[9px] sm:text-[10px] text-slate-600 mt-1.5 font-mono">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown Time'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>

              {/* STICKY ACTIONS FOOTER */}
              <div className="absolute bottom-0 inset-x-0 border-t border-white/[0.04] bg-[#0b1422]/90 backdrop-blur-xl p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="hidden lg:block">
                    {details && details.enrollment.status !== 'validated' && details.enrollment.status !== 'pending' && (
                      <p className="text-[0.7rem] sm:text-xs text-slate-500 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Status: <span className="uppercase text-slate-400 font-medium">{details.enrollment.status}</span>. Cannot approve.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-3 sm:gap-4 w-full lg:w-auto">
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={loading || isProcessing || !details}
                      className="flex-1 lg:flex-none min-h-[50px] rounded-2xl bg-transparent px-4 sm:px-6 text-[0.85rem] sm:text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50 transition-all border border-white/[0.08] hover:border-rose-500/20 active:scale-[0.98]"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => studentId && onApprove(studentId)}
                      disabled={loading || isProcessing || !details || details.enrollment.status !== 'validated'}
                      className="group relative flex-[2] lg:flex-none min-h-[50px] overflow-hidden rounded-2xl bg-[#5C7D8F] px-4 sm:px-6 text-[0.85rem] sm:text-sm font-medium text-white hover:bg-[#6A8E9F] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(100, 147, 181,0.15)] hover:shadow-[0_0_30px_rgba(100, 147, 181,0.3)] disabled:shadow-none active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-black/70" />
                            <span className="font-semibold">Processing...</span>
                          </>
                        ) : (
                          <span className="font-semibold">Approve & Extract</span>
                        )}
                      </div>
                      {/* Subtle hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] sm:group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    </button>
                  </div>
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
