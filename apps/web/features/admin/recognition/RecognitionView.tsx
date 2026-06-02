'use client';

import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Activity,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanFace,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  AdminApiAuthError,
  matchRecognitionProbe,
  RecognitionMatchCandidate,
  RecognitionMatchResponse,
} from '@/features/admin/api';
import { useAdminAuth } from '@/features/admin/auth/AdminAuthContext';
import { useAdminToast } from '@/features/admin/ui/AdminToastProvider';
import { cn } from '@/lib/utils';

const DEFAULT_TOP_K = '5';
const DEFAULT_THRESHOLD = '0.38';

function formatDistance(value: number) {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(4);
}

function parsePositiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parsePositiveFloat(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getConfidenceLabel(classification: RecognitionMatchCandidate['classification']): string {
  if (classification === 'high_confidence') return 'High confidence';
  if (classification === 'likely_match') return 'Likely match';
  if (classification === 'possible_match') return 'Possible match';
  return 'Low confidence';
}

function CandidateCard({
  candidate,
  isTopCandidate,
  isOnlyCandidate,
}: {
  candidate: RecognitionMatchCandidate;
  isTopCandidate: boolean;
  isOnlyCandidate?: boolean;
}) {
  const similarity = Math.max(0, Math.min(100, (1 - candidate.best_distance) * 100));
  const simColor = candidate.classification === 'high_confidence' ? 'bg-[#6493b5]' 
                 : candidate.classification === 'likely_match' ? 'bg-blue-400' 
                 : candidate.classification === 'possible_match' ? 'bg-[#6493b5]' 
                 : 'bg-slate-400';

  return (
    <div className={cn(
      "group relative flex flex-col gap-4 overflow-hidden rounded-[1.25rem] border p-5 transition-all duration-300",
      isOnlyCandidate ? "sm:flex-col sm:items-center sm:text-center p-8 border-[#6493b5]/40 bg-gradient-to-b from-[#6493b5]/[0.08] to-transparent shadow-[0_0_35px_-5px_rgba(100, 147, 181,0.15)]"
      : isTopCandidate 
        ? "sm:flex-row sm:items-stretch sm:justify-between border-[#6493b5]/30 bg-gradient-to-r from-[#6493b5]/[0.08] to-transparent shadow-[0_0_25px_-5px_rgba(100, 147, 181,0.1)]"
        : "sm:flex-row sm:items-stretch sm:justify-between border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]"
    )}>
      {isTopCandidate && (
         <div className={cn("absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent", isOnlyCandidate ? "via-[#6493b5]" : "via-[#6493b5]/80")} />
      )}
      
      {/* Identity Column */}
      <div className={cn("flex min-w-0 flex-1 flex-col justify-center gap-2", isOnlyCandidate && "items-center")}>
        <div className="flex items-center gap-3">
          {!isOnlyCandidate && (
            <span className="flex size-6 items-center justify-center rounded-md bg-white/[0.06] text-[0.65rem] font-bold text-slate-300">
              #{candidate.rank}
            </span>
          )}
          <h4 className={cn("truncate font-semibold tracking-tight", isTopCandidate ? "text-[#6493b5]" : "text-slate-100", isOnlyCandidate ? "text-2xl" : "text-[0.95rem]")}>
            {candidate.full_name || 'Unknown Candidate'}
          </h4>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider",
            candidate.classification === 'high_confidence' ? 'bg-[#6493b5]/10 text-[#6493b5]' :
            candidate.classification === 'likely_match' ? 'bg-blue-500/10 text-blue-400' :
            candidate.classification === 'possible_match' ? 'bg-[#6493b5]/10 text-[#6493b5]' :
            'bg-slate-500/10 text-slate-400'
          )}>
            {getConfidenceLabel(candidate.classification)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[0.75rem] text-slate-500">
          <span className="font-mono text-slate-400">{candidate.student_id}</span>
          {candidate.university_email && (
            <>
              <span className="hidden sm:block size-1 rounded-full bg-white/10" />
              <span className="hidden sm:block">{candidate.university_email}</span>
            </>
          )}
          {candidate.phone && (
            <>
              <span className="hidden sm:block size-1 rounded-full bg-white/10" />
              <span className="hidden sm:block">{candidate.phone}</span>
            </>
          )}
        </div>
        <div className={cn("mt-1 flex flex-wrap items-center gap-2 text-[0.65rem] text-slate-500", isOnlyCandidate && "justify-center")}>
           <span className="uppercase tracking-widest hidden sm:inline">Support:</span>
           <span className="font-medium text-slate-400">{candidate.support_count} frames</span>
           <span className="size-1 rounded-full bg-white/10" />
           <span className="uppercase tracking-widest hidden sm:inline">Angles:</span>
           <span className="font-medium text-slate-400">{candidate.matched_angles.length} <span className="sm:hidden">angles</span></span>
           <span className="size-1 rounded-full bg-white/10 hidden sm:block" />
           <span className="uppercase tracking-widest hidden sm:inline">Top-3 Dist:</span>
           <span className="font-medium text-slate-400 hidden sm:inline">{formatDistance(candidate.top_avg_distance)}</span>
        </div>
      </div>

      {/* Intelligence Column */}
      <div className={cn(
        "flex shrink-0 flex-col items-start justify-center gap-1.5 border-t border-white/[0.04] pt-4",
        isOnlyCandidate ? "mt-4 items-center border-t-0 pt-0" : "sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"
      )}>
         <span className={cn("font-medium uppercase tracking-widest text-slate-500", isOnlyCandidate ? "text-[0.7rem]" : "text-[0.65rem]")}>Similarity</span>
         <span className={cn("font-semibold tracking-tighter", isTopCandidate ? "text-[#6493b5] drop-shadow-[0_0_8px_rgba(100, 147, 181,0.5)]" : "text-slate-200", isOnlyCandidate ? "text-4xl my-1" : "text-2xl")}>
           {similarity.toFixed(1)}%
         </span>
         <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/[0.05]", isOnlyCandidate ? "w-48" : "w-32")}>
           <div 
             className={cn("h-full rounded-full transition-all duration-700 ease-out", simColor)}
             style={{ width: `${similarity}%` }}
           />
         </div>
         <span className="mt-1 text-[0.7rem] font-medium text-slate-500">
           Dist: {formatDistance(candidate.best_distance)}
         </span>
      </div>
    </div>
  );
}

export function RecognitionView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { token, clearSession } = useAdminAuth();
  const { showToast } = useAdminToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const isRequestingRef = useRef(false);

  const [topKInput, setTopKInput] = useState(DEFAULT_TOP_K);
  const [thresholdInput, setThresholdInput] = useState(DEFAULT_THRESHOLD);

  const [isMatching, setIsMatching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<RecognitionMatchResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const hasImage = Boolean(selectedFile);

  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(null); return; }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => { URL.revokeObjectURL(objectUrl); };
  }, [selectedFile]);

  const handleAuthFailure = useCallback(
    (errorValue: unknown): boolean => {
      if (errorValue instanceof AdminApiAuthError) {
        clearSession();
        showToast({ title: 'Session expired', message: errorValue.message, variant: 'error' });
        router.replace('/admin/login?next=%2Fadmin%2Frecognition');
        return true;
      }
      return false;
    },
    [clearSession, router, showToast]
  );

  const onSelectFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setErrorMessage('Please choose a valid image file.');
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    setResults(null);
    setHasSearched(false);
    setCurrentPage(1);
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onSelectFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    onSelectFile(file);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setResults(null);
    setErrorMessage(null);
    setHasSearched(false);
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runMatch = useCallback(async () => {
    if (!token || !selectedFile) return;
    if (isRequestingRef.current) return;

    const parsedTopK = parsePositiveInt(topKInput);
    if (parsedTopK === null) { setErrorMessage('top_k must be a positive integer.'); return; }

    const parsedThreshold = parsePositiveFloat(thresholdInput);
    if (parsedThreshold === null) { setErrorMessage('threshold must be a positive number.'); return; }

    isRequestingRef.current = true;
    setHasSearched(true);
    setIsMatching(true);
    setErrorMessage(null);

    try {
      const response = await matchRecognitionProbe(token, selectedFile, { topK: parsedTopK, threshold: parsedThreshold });
      if (!response.success) {
        setResults(null);
        setErrorMessage(response.message);
        showToast({ title: 'Match request failed', message: response.message, variant: 'error' });
        return;
      }
      setResults(response);
      setCurrentPage(1);
    } catch (errorValue) {
      if (handleAuthFailure(errorValue)) return;
      const message = errorValue instanceof Error ? errorValue.message : 'Unable to run recognition match right now.';
      setErrorMessage(message);
      setResults(null);
      showToast({ title: 'Request failed', message, variant: 'error' });
    } finally {
      setIsMatching(false);
      isRequestingRef.current = false;
    }
  }, [handleAuthFailure, selectedFile, showToast, thresholdInput, token, topKInput]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runMatch();
  };

  const candidates = useMemo(() => results?.candidates ?? [], [results]);
  const weakCandidates = useMemo(() => results?.weak_candidates ?? [], [results]);
  const allCandidates = useMemo(
    () => [...candidates, ...weakCandidates].sort((a, b) => a.rank - b.rank),
    [candidates, weakCandidates]
  );
  const topCandidateRank = useMemo(() => (allCandidates.length === 0 ? null : allCandidates[0].rank), [allCandidates]);
  const confidenceCounts = useMemo(() => {
    let high = 0, likely = 0, possible = 0, low = 0;
    for (const c of allCandidates) {
      if (c.classification === 'high_confidence') high += 1;
      else if (c.classification === 'likely_match') likely += 1;
      else if (c.classification === 'possible_match') possible += 1;
      else low += 1;
    }
    return { high, likely, possible, low };
  }, [allCandidates]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(allCandidates.length / pageSize));
  
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allCandidates.slice(start, start + pageSize);
  }, [allCandidates, currentPage, pageSize]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 pb-[env(safe-area-inset-bottom)]">
      
      {/* ── Left Column: Upload Hero & Actions ─────────────────────────────────── */}
      <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[360px] xl:w-[400px]">
        
        {/* Title Area */}
        <div className="px-2">
          <h2 className="text-xl font-medium tracking-tight text-white">Biometric Intelligence</h2>
          <p className="mt-1.5 text-[0.85rem] leading-relaxed text-slate-400">
            Drop a probe image to initiate an AI-powered face embedding extraction and similarity scan.
          </p>
        </div>

        {/* Action Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {/* Secure Biometric Intake Dropzone */}
          <div
            className={cn(
              'group relative overflow-hidden rounded-[1.25rem] border transition-all duration-500 min-h-[280px]',
              dragActive
                ? 'border-[#6493b5]/50 bg-gradient-to-b from-[#6493b5]/[0.08] to-transparent shadow-[0_0_40px_-10px_rgba(100,147,181,0.25),inset_0_0_0_1px_rgba(100,147,181,0.2)]'
                : hasImage 
                ? 'border-white/[0.06] bg-[#0c1015]/80' 
                : 'border-white/[0.06] border-dashed bg-gradient-to-b from-white/[0.01] to-transparent hover:border-[#6493b5]/30 hover:bg-[#6493b5]/[0.02] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]'
            )}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onInputChange}
            />
            
            {/* Drag Active Glow Overlay */}
            <div className={cn(
              "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100, 147, 181,0.1)_0%,transparent_70%)] opacity-0 transition-opacity duration-500",
              dragActive && "opacity-100"
            )} />

            {previewUrl ? (
              <div className="relative h-full w-full bg-[#080b0f] min-h-[280px]">
                <Image
                  src={previewUrl}
                  alt="Probe preview"
                  fill
                  unoptimized
                  className="object-contain p-4"
                />
                
                {/* Glass overlay controls */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#080b0f]/80 p-1.5 backdrop-blur-md shadow-xl">
                    <button type="button" className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.7rem] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="size-3.5" /> Replace
                    </button>
                    <div className="h-4 w-px bg-white/[0.08]" />
                    <button type="button" className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.7rem] font-medium text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200" onClick={clearSelectedFile}>
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                </div>

                {/* Scanning Animation */}
                {isMatching && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-[#6493b5]/10 mix-blend-color" />
                    <div className="absolute inset-x-0 -top-full h-[2px] w-full bg-[#6493b5] shadow-[0_0_15px_1px_rgba(100, 147, 181,0.6)] animate-[pulse_2s_ease-in-out_infinite]" style={{ animation: "scan 2s linear infinite" }} />
                    <style jsx>{`
                      @keyframes scan {
                        0% { top: -10%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 110%; opacity: 0; }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[280px] w-full cursor-pointer flex-col items-center justify-center p-8 text-center" onClick={() => fileInputRef.current?.click()}>
                {/* Scanner reticle decoration */}
                <div className="absolute inset-5 border border-white/[0.03] rounded-xl pointer-events-none" />
                <div className="absolute top-5 left-5 size-4 border-l-2 border-t-2 border-[#6493b5]/30 rounded-tl-xl transition-colors duration-500 group-hover:border-[#6493b5]/70" />
                <div className="absolute top-5 right-5 size-4 border-r-2 border-t-2 border-[#6493b5]/30 rounded-tr-xl transition-colors duration-500 group-hover:border-[#6493b5]/70" />
                <div className="absolute bottom-5 left-5 size-4 border-l-2 border-b-2 border-[#6493b5]/30 rounded-bl-xl transition-colors duration-500 group-hover:border-[#6493b5]/70" />
                <div className="absolute bottom-5 right-5 size-4 border-r-2 border-b-2 border-[#6493b5]/30 rounded-br-xl transition-colors duration-500 group-hover:border-[#6493b5]/70" />
                
                <div className="relative mb-5 flex size-12 items-center justify-center rounded-lg border border-white/[0.04] bg-[#06080a]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-transform duration-500 group-hover:scale-110 group-hover:bg-[#6493b5]/10 group-hover:border-[#6493b5]/30">
                  <ScanFace className="size-5 text-[#6493b5]/60 transition-colors duration-500 group-hover:text-[#6493b5]" />
                </div>
                <h3 className="mb-1 text-[0.9rem] font-medium text-slate-200 tracking-tight">Initialize Intake</h3>
                <p className="max-w-[200px] text-[0.75rem] leading-relaxed text-slate-500">
                  Drag & drop a high-resolution probe or browse system files.
                </p>
                <div className="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-2 text-[0.75rem] font-medium tracking-wide text-slate-300 transition-colors group-hover:bg-white/[0.05] group-hover:text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]">
                  Browse System
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA Button */}
          <button
            type="button"
            disabled={!hasImage || isMatching}
            onClick={() => { void runMatch(); }}
            className={cn(
              "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl p-4 min-h-[56px] transition-all duration-300",
              !hasImage 
                ? "cursor-not-allowed border border-white/[0.04] bg-white/[0.02] text-slate-500" 
                : isMatching
                ? "cursor-wait border border-[#6493b5]/20 bg-[#6493b5]/10 text-[#6493b5] shadow-[0_0_20px_-5px_rgba(100, 147, 181,0.2)]"
                : "border border-[#6493b5]/30 bg-gradient-to-b from-[#5C7D8F] to-[#2D3A42] text-white shadow-[0_0_25px_-5px_rgba(100, 147, 181,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#6A8E9F] hover:to-[#384A54] hover:shadow-[0_0_35px_-5px_rgba(100, 147, 181,0.4)] active:scale-[0.98]"
            )}
          >
            {isMatching ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span className="text-[1rem] font-medium tracking-wide">Scanning Identity Database...</span>
              </>
            ) : (
              <>
                <Search className="size-5" />
                <span className="text-[1rem] font-medium tracking-wide">Initiate Recognition</span>
                {hasImage && (
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                )}
              </>
            )}
          </button>

          {/* Advanced Parameters (Softened) */}
          <details className="group mt-1">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.7rem] font-medium uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-400">
              <SlidersHorizontal className="size-3.5" />
              Algorithm Parameters
            </summary>
            <div className="mt-4 grid gap-4 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 sm:grid-cols-2">
              <div>
                <label htmlFor="top-k" className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-slate-500">top_k matches</label>
                <input
                  id="top-k"
                  className="w-full h-10 sm:h-9 rounded-lg border border-white/[0.06] bg-black/40 px-3 text-[16px] sm:text-[0.8rem] text-slate-200 outline-none transition-colors focus:border-[#6493b5]/50 focus:ring-1 focus:ring-[#6493b5]/50"
                  type="number"
                  min={1}
                  step={1}
                  value={topKInput}
                  onChange={(e) => setTopKInput(e.target.value)}
                  disabled={isMatching}
                />
              </div>
              <div>
                <label htmlFor="threshold" className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-slate-500">distance threshold</label>
                <input
                  id="threshold"
                  className="w-full h-10 sm:h-9 rounded-lg border border-white/[0.06] bg-black/40 px-3 text-[16px] sm:text-[0.8rem] text-slate-200 outline-none transition-colors focus:border-[#6493b5]/50 focus:ring-1 focus:ring-[#6493b5]/50"
                  type="number"
                  min={0.0001}
                  step={0.01}
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  disabled={isMatching}
                />
              </div>
            </div>
          </details>
        </form>
      </div>

      {/* ── Right Column: Live Results Workspace ───────────────────────────────── */}
      <div className="flex min-h-[350px] lg:min-h-[500px] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.04] bg-[#0c1015]/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.02)] lg:min-w-[500px]">
        
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] bg-[#080b0f]/80 px-5 sm:px-6 py-4 shadow-[0_1px_8px_rgba(0,0,0,0.2)] z-10">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center rounded border border-[#6493b5]/20 bg-[#6493b5]/10">
              <Activity className="size-3.5 text-[#6493b5]" />
            </div>
            <h3 className="text-[0.85rem] font-medium uppercase tracking-[0.1em] text-slate-200">Analysis Workspace</h3>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[#6493b5]/10 bg-[#6493b5]/[0.02] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <ShieldAlert className="size-3.5 text-[#6493b5]/70" />
            <span className="text-[0.62rem] font-medium uppercase tracking-widest text-slate-400">Manual Verification Required</span>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="relative flex flex-1 flex-col overflow-y-auto p-7">
          
          {/* Empty State: Pre-Upload */}
          {!hasImage && !isMatching && !hasSearched && (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <div className="relative mb-6 flex size-16 items-center justify-center rounded-full border border-white/[0.03] bg-[#080b0f] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                <div className="absolute inset-0 rounded-full border-t border-white/[0.05]" />
                <ScanFace className="size-6 text-slate-600/40" />
              </div>
              <h3 className="text-[0.95rem] font-medium tracking-wide text-slate-300">System Standby</h3>
              <p className="mt-2.5 max-w-[280px] text-[0.8rem] leading-relaxed text-slate-500">
                Initialize the workspace by securely loading a biometric probe into the intake zone.
              </p>
            </div>
          )}

          {/* Empty State: Pre-Search */}
          {hasImage && !isMatching && !hasSearched && (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <div className="relative mb-6 flex size-16 items-center justify-center rounded-full border border-[#6493b5]/10 bg-[#080b0f] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                <div className="absolute inset-0 rounded-full border-t border-[#6493b5]/20" />
                <div className="absolute inset-0 rounded-full bg-[#6493b5]/5 animate-pulse" />
                <ScanFace className="size-6 text-[#6493b5]/70" />
              </div>
              <h3 className="text-[0.95rem] font-medium tracking-wide text-slate-200">Target Data Cached</h3>
              <p className="mt-2.5 max-w-[280px] text-[0.8rem] leading-relaxed text-slate-500">
                Probe telemetry captured. Ready to execute distance computation against the identity registry.
              </p>
            </div>
          )}

          {/* Processing State */}
          {isMatching && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-8 flex size-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[#6493b5]/10" />
                <div className="absolute inset-0 animate-[spin_2s_linear_infinite] rounded-full border-2 border-transparent border-t-[#6493b5]/80" />
                <div className="absolute inset-2 animate-[spin_3s_linear_infinite_reverse] rounded-full border border-transparent border-t-[#6493b5]/30" />
                <ScanFace className="size-8 text-[#6493b5] animate-pulse" />
              </div>
              <h3 className="text-[1.1rem] font-medium text-[#6493b5]">Processing Intelligence</h3>
              <p className="mt-2 text-[0.85rem] text-[#6493b5]/60">
                Extracting 512-dimensional embeddings and scanning vector space.
              </p>
            </div>
          )}

          {/* Error State */}
          {!isMatching && errorMessage && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/[0.05]">
                <ShieldAlert className="size-8 text-rose-500/80" />
              </div>
              <h3 className="text-[1.1rem] font-medium text-slate-200">Recognition Unavailable</h3>
              <p className="mt-2.5 max-w-[320px] text-[0.85rem] leading-relaxed text-slate-500">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => { void runMatch(); }}
                className="mt-8 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-2.5 text-[0.8rem] font-medium text-slate-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw className="size-4 opacity-70" />
                Retry Recognition
              </button>
            </div>
          )}

          {/* No Candidates Found */}
          {!isMatching && !errorMessage && hasSearched && allCandidates.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-white/[0.02] bg-white/[0.01]">
                <ScanFace className="size-8 text-slate-600/50" />
              </div>
              <h3 className="text-[1.1rem] font-medium text-slate-300">No Confident Matches</h3>
              <p className="mt-2.5 max-w-sm text-[0.85rem] leading-relaxed text-slate-500">
                The intelligence system could not identify any candidates within the specified distance threshold. Try adjusting the parameters or uploading a clearer probe image.
              </p>
            </div>
          )}

          {/* Live Candidates */}
          {!isMatching && !errorMessage && hasSearched && allCandidates.length > 0 && (
            <div className="flex flex-col gap-5">
              
              {/* Stats Bar */}
              <div className="flex flex-wrap items-center justify-between rounded-[1rem] border border-white/[0.04] bg-white/[0.01] px-5 py-3">
                <div className="flex flex-wrap items-center gap-4 text-[0.75rem] font-medium text-slate-400">
                  <span>Returned: <strong className="text-slate-200">{allCandidates.length}</strong></span>
                  <div className="h-3 w-px bg-white/10" />
                  <span>High: <strong className="text-[#6493b5]">{confidenceCounts.high}</strong></span>
                  <div className="h-3 w-px bg-white/10" />
                  <span>Likely: <strong className="text-blue-400">{confidenceCounts.likely}</strong></span>
                  <div className="h-3 w-px bg-white/10" />
                  <span>Possible: <strong className="text-[#6493b5]">{confidenceCounts.possible}</strong></span>
                  <div className="h-3 w-px bg-white/10" />
                  <span>Searched Space: <strong className="text-slate-300">{results?.searched_embedding_rows ?? 0} vectors</strong></span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="grid gap-4">
                {paginatedCandidates.map((candidate, index) => (
                  <CandidateCard
                    key={`${candidate.student_id}-${candidate.rank}-${index}`}
                    candidate={candidate}
                    isTopCandidate={candidate.rank === topCandidateRank}
                    isOnlyCandidate={allCandidates.length === 1}
                  />
                ))}
              </div>
              
              {allCandidates.length === 1 && (
                <div className="mt-2 text-center text-[0.75rem] text-slate-500">
                  No additional meaningful matches found.
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between rounded-[1rem] border border-white/[0.03] bg-white/[0.01] px-5 py-3 gap-3">
                  <span className="text-[0.75rem] text-slate-500 w-full sm:w-auto text-center sm:text-left">
                    Showing <strong className="text-slate-300">{((currentPage - 1) * pageSize) + 1}</strong> to <strong className="text-slate-300">{Math.min(currentPage * pageSize, allCandidates.length)}</strong> of <strong className="text-slate-300">{allCandidates.length}</strong>
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="admin-btn-ghost px-4 py-2 text-[0.75rem] min-h-[44px] sm:min-h-0 flex-1 sm:flex-none justify-center"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="admin-btn-ghost px-4 py-2 text-[0.75rem] min-h-[44px] sm:min-h-0 flex-1 sm:flex-none justify-center"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Debug Tools */}
              {results && (
                <details className="mt-6 rounded-xl border border-white/[0.03] bg-black/20 p-4">
                  <summary className="cursor-pointer text-[0.7rem] uppercase tracking-widest text-slate-500">Show raw intelligence payload</summary>
                  <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-white/[0.05] bg-black/40 p-4 text-[11px] leading-relaxed text-slate-400">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
