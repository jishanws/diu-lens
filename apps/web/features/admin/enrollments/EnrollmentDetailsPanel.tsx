import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, AlertCircle, Clock, ShieldCheck, 
  User, Mail, Phone, Image as ImageIcon,
  ChevronDown, ChevronUp, AlertTriangle, Crosshair, Loader2
} from 'lucide-react';
import { EnrollmentDetailsResponse, fetchEnrollmentDetails } from '../api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { RejectReasonModal } from './RejectReasonModal';

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
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-800 border-t-cyan-500"></div>
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} />;
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
              className="fixed inset-y-0 right-0 z-50 w-[90vw] max-w-5xl border-l border-slate-800 bg-slate-950 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md p-6 sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-cyan-400" />
                    Biometric Verification Console
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Review and verify enrollment data for approval
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 relative">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500"></div>
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3 text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : details ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-32">
                    
                    {/* LEFT COLUMN - BIOMETRIC EVIDENCE */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Biometric Evidence
                        </h3>
                        {details.biometric_diagnostics.overall_capture_quality >= 75 ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Excellent
                          </span>
                        ) : details.biometric_diagnostics.overall_capture_quality >= 60 ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400"></span> Acceptable
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span> Needs Review
                          </span>
                        )}
                      </div>

                      {/* Hero Image */}
                      {heroImage && (
                        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/50 group shadow-lg">
                          <AuthenticatedImage 
                            src={getImageUrl(heroImage.file_path)} 
                            token={token || ''}
                            alt={`${heroImage.angle} frame`} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 pt-12">
                            <p className="text-sm font-medium text-slate-200 capitalize">Primary Identity Frame ({heroImage.angle})</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Grid of secondary prioritized frames */}
                      {otherImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {otherImages.map((img) => (
                            <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/50 group">
                              <AuthenticatedImage 
                                src={getImageUrl(img.file_path)} 
                                token={token || ''}
                                alt={`${img.angle} frame`} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2 pt-6">
                                <p className="text-[11px] font-medium text-slate-300 capitalize">{img.angle}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Supplementary frames */}
                      {details.supplementary_images.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/50">
                          <button 
                            onClick={() => setShowSupplementary(!showSupplementary)}
                            className="flex items-center justify-between w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
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
                                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 opacity-70 hover:opacity-100 transition-opacity">
                                      <AuthenticatedImage 
                                        src={getImageUrl(img.file_path)} 
                                        token={token || ''}
                                        alt={`supplementary ${img.angle}`} 
                                        className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-1.5 text-center">
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

                    {/* RIGHT COLUMN - INTELLIGENCE & DIAGNOSTICS */}
                    <div className="space-y-6">
                      
                      {/* Verification Insights */}
                      <div className="rounded-3xl border border-slate-800/60 bg-slate-900/30 p-6">
                        <h3 className="text-sm font-medium text-slate-400 mb-5 flex items-center gap-2">
                          <Crosshair className="h-4 w-4" />
                          Verification Insights
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-950/50 p-4 border border-slate-800/50">
                            <p className="text-xs text-slate-500 mb-1">Consistency Score</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-semibold text-cyan-400">
                                {details.biometric_diagnostics.consistency_score.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-950/50 p-4 border border-slate-800/50">
                            <p className="text-xs text-slate-500 mb-1">Angle Coverage</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-semibold text-slate-200">
                                {details.biometric_diagnostics.angle_coverage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-950/50 p-4 border border-slate-800/50">
                            <p className="text-xs text-slate-500 mb-1">Quality Frames</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-semibold text-slate-200">
                                {details.biometric_diagnostics.blur_free_frame_count} 
                              </span>
                              <span className="text-sm text-slate-500 pb-0.5">/ {details.biometric_diagnostics.total_frames}</span>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-950/50 p-4 border border-slate-800/50">
                            <p className="text-xs text-slate-500 mb-1">Capture Quality</p>
                            <div className="flex items-center h-full pb-1">
                              <span className="text-sm font-medium text-slate-300">
                                {details.biometric_diagnostics.overall_quality_label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Duplicate Check */}
                      {details.duplicate_candidates.length > 0 && (
                        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
                          <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Potential Duplicate Detected
                          </h3>
                          <p className="text-xs text-amber-500/80 mb-4">
                            The enrolling face strongly matches existing profiles in the database.
                          </p>
                          <div className="flex flex-col gap-2">
                            {details.duplicate_candidates.map((cand) => (
                              <div key={cand.student_id} className="flex items-center justify-between rounded-2xl bg-slate-950 p-3 px-4 border border-amber-500/20">
                                <div>
                                  <p className="text-xs text-slate-500 mb-0.5">Existing Match</p>
                                  <p className="text-sm font-medium text-slate-200">{cand.student_id}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500 mb-0.5">Similarity</p>
                                  <p className="text-sm font-medium text-amber-400">{(100 - cand.best_distance * 100).toFixed(1)}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Identity Details */}
                      <div className="rounded-3xl border border-slate-800/60 bg-slate-900/30 p-6">
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
                              {details.student.university_email}
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

                      {/* Timeline */}
                      <div className="rounded-3xl border border-slate-800/60 bg-slate-900/30 p-6">
                        <h3 className="text-sm font-medium text-slate-400 mb-5 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Audit Timeline
                        </h3>
                        <div className="relative pl-5 space-y-6 before:absolute before:inset-y-2 before:left-[9px] before:w-px before:bg-slate-800/80">
                          {details.timeline.map((log, i) => (
                            <div key={log.id} className="relative">
                              <div className={`absolute -left-7 h-3 w-3 rounded-full border-2 border-slate-900 ${i === 0 ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
                              <p className="text-sm font-medium text-slate-200 capitalize">{log.event_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.message}</p>
                              <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                                {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown Time'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : null}
              </div>

              {/* STICKY ACTIONS FOOTER */}
              <div className="absolute bottom-0 inset-x-0 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl p-6 z-20">
                <div className="flex items-center justify-between">
                  <div className="hidden sm:block">
                    {details && details.enrollment.status !== 'validated' && details.enrollment.status !== 'pending' && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Status: <span className="uppercase text-slate-400 font-medium">{details.enrollment.status}</span>. Cannot approve.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={loading || isProcessing || !details}
                      className="flex-1 sm:flex-none min-w-[140px] rounded-2xl bg-transparent py-3.5 px-6 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition-all border border-slate-800 hover:border-red-500/20"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => studentId && onApprove(studentId)}
                      disabled={loading || isProcessing || !details || details.enrollment.status !== 'validated'}
                      className="group relative flex-1 sm:flex-none min-w-[200px] overflow-hidden rounded-2xl bg-cyan-500 py-3.5 px-6 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] disabled:shadow-none"
                    >
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Approve & Extract</span>
                        )}
                      </div>
                      {/* Subtle hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
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
