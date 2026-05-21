'use client';

import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImagePlus,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
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

function getConfidenceBadgeClass(classification: RecognitionMatchCandidate['classification']): string {
  if (classification === 'strong_match') return 'admin-badge admin-badge-approved';
  if (classification === 'possible_match') return 'admin-badge admin-badge-pending';
  return 'admin-badge admin-badge-rejected';
}

function getConfidenceLabel(classification: RecognitionMatchCandidate['classification']): string {
  if (classification === 'strong_match') return 'Strong match';
  if (classification === 'possible_match') return 'Possible match';
  return 'Weak candidate';
}

function CandidateCard({
  candidate,
  isTopCandidate,
}: {
  candidate: RecognitionMatchCandidate;
  isTopCandidate: boolean;
}) {
  const similarity = Math.max(0, Math.min(100, (1 - candidate.best_distance) * 100));
  const simColor = candidate.classification === 'strong_match' ? 'bg-emerald-400' 
                 : candidate.classification === 'possible_match' ? 'bg-amber-400' 
                 : 'bg-rose-400';

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-5 transition-all duration-300",
      isTopCandidate 
        ? "border-cyan-500/40 bg-cyan-500/[0.04] shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]"
        : candidate.classification === 'strong_match' ? "border-emerald-500/20 bg-emerald-500/[0.02]"
        : candidate.classification === 'possible_match' ? "border-amber-500/20 bg-amber-500/[0.02]"
        : "border-white/[0.05] bg-white/[0.01]"
    )}>
      {isTopCandidate && (
         <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      )}
      
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center rounded-lg bg-white/[0.05] px-2.5 py-1 text-[0.75rem] font-bold text-slate-300">
              #{candidate.rank}
            </span>
            <span className={getConfidenceBadgeClass(candidate.classification)}>
              {getConfidenceLabel(candidate.classification)}
            </span>
            {isTopCandidate && (
               <span className="text-[0.7rem] font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                 Best Match
               </span>
            )}
          </div>
          
          <div>
            <h4 className={cn("text-lg font-semibold", isTopCandidate ? "text-cyan-300" : "text-slate-100")}>
              {candidate.full_name || 'Name unavailable'}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[0.8rem] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500">ID:</span>
                <span className="font-medium text-slate-300">{candidate.student_id}</span>
              </span>
              {candidate.university_email && (
                <>
                  <span className="size-1 rounded-full bg-white/10" />
                  <span className="text-slate-300">{candidate.university_email}</span>
                </>
              )}
              {candidate.phone && (
                <>
                  <span className="size-1 rounded-full bg-white/10" />
                  <span className="text-slate-300">{candidate.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 md:w-48 text-right">
           <div className="flex items-end justify-between md:justify-end md:gap-3 mb-2">
              <span className="text-[0.75rem] text-slate-500 uppercase tracking-wider">Similarity</span>
              <span className={cn("text-xl font-bold tracking-tight", isTopCandidate ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "text-slate-200")}>
                {similarity.toFixed(1)}%
              </span>
           </div>
           <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
             <div 
               className={cn("h-full rounded-full transition-all duration-700 ease-out", simColor)}
               style={{ width: `${similarity}%` }}
             />
           </div>
           <p className="mt-2 text-[0.7rem] text-slate-500">
             Distance: <span className="text-slate-300 font-medium">{formatDistance(candidate.best_distance)}</span>
           </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-black/20 p-4 border border-white/[0.02]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-[0.7rem] uppercase tracking-widest text-slate-500">Top-3 Avg</span>
            <span className="text-[0.8rem] font-medium text-slate-300">{formatDistance(candidate.top_avg_distance)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[0.7rem] uppercase tracking-widest text-slate-500">Support</span>
            <span className="text-[0.8rem] font-medium text-slate-300">{candidate.support_count} frames / {candidate.matched_angles_count} angles</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[0.7rem] uppercase tracking-widest text-slate-500">Gap to Next</span>
            <span className="text-[0.8rem] font-medium text-slate-300">{candidate.rank_gap_to_next === null ? '-' : formatDistance(candidate.rank_gap_to_next)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[0.7rem] uppercase tracking-widest text-slate-500">Angles</span>
            <span className="truncate text-[0.8rem] font-medium text-slate-300" title={candidate.matched_angles.join(', ')}>
              {candidate.matched_angles.length > 0 ? candidate.matched_angles.join(', ') : '-'}
            </span>
          </div>
        </div>
        
        <div className="mt-4 border-t border-white/[0.04] pt-4 grid gap-2">
           <div className="flex gap-2">
             <span className="w-24 shrink-0 text-[0.7rem] uppercase tracking-widest text-slate-500">Factors</span>
             <span className="text-[0.75rem] text-slate-300">
                {candidate.decision_reasons.length > 0 ? candidate.decision_reasons.join(', ') : '-'}
             </span>
           </div>
           <div className="flex gap-2">
             <span className="w-24 shrink-0 text-[0.7rem] uppercase tracking-widest text-slate-500">Crop Path</span>
             <span className="break-all text-[0.75rem] text-slate-300">{candidate.representative_crop_path || '-'}</span>
           </div>
           <div className="flex gap-2">
             <span className="w-24 shrink-0 text-[0.7rem] uppercase tracking-widest text-slate-500">Src Image</span>
             <span className="break-all text-[0.75rem] text-slate-300">{candidate.representative_source_image_path || '-'}</span>
           </div>
        </div>
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

    const parsedTopK = parsePositiveInt(topKInput);
    if (parsedTopK === null) { setErrorMessage('top_k must be a positive integer.'); return; }

    const parsedThreshold = parsePositiveFloat(thresholdInput);
    if (parsedThreshold === null) { setErrorMessage('threshold must be a positive number.'); return; }

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
      showToast({ title: 'Search completed', message: response.message, variant: 'success' });
    } catch (errorValue) {
      if (handleAuthFailure(errorValue)) return;
      const message = errorValue instanceof Error ? errorValue.message : 'Unable to run recognition match right now.';
      setErrorMessage(message);
      setResults(null);
      showToast({ title: 'Request failed', message, variant: 'error' });
    } finally {
      setIsMatching(false);
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
    let strong = 0, possible = 0, weak = 0;
    for (const c of allCandidates) {
      if (c.classification === 'strong_match') strong += 1;
      else if (c.classification === 'possible_match') possible += 1;
      else weak += 1;
    }
    return { strong, possible, weak };
  }, [allCandidates]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(allCandidates.length / pageSize));
  
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allCandidates.slice(start, start + pageSize);
  }, [allCandidates, currentPage, pageSize]);

  return (
    <div className="grid gap-5">
      {/* Header */}
      <div className="admin-surface relative overflow-hidden px-6 py-5">
        <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <h2 className="text-[0.95rem] font-semibold text-white">Recognition Candidate Search</h2>
        <p className="mt-0.5 text-[0.82rem] text-slate-400">
          Upload a probe image to find ranked candidate students from approved enrollments. Results are suggestions for manual review, not automatic identity confirmation.
        </p>
      </div>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        {/* Left — Probe Image */}
        <div className="admin-surface relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <div className="border-b border-white/[0.05] px-6 py-5">
            <h3 className="text-[0.9rem] font-semibold text-white">Probe Image</h3>
            <p className="mt-0.5 text-[0.8rem] text-slate-400">
              Use a clear face crop when possible. Low-quality input images may return weaker candidates.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              {/* Drop zone */}
              <div
                className={cn(
                  'rounded-xl border border-dashed p-6 transition-colors',
                  dragActive
                    ? 'border-cyan-500/50 bg-cyan-500/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.02]'
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
                <div className="grid gap-3 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] shadow-[0_0_16px_-4px_rgba(6,182,212,0.2)]">
                    <Upload className="size-5 text-cyan-400/70" />
                  </div>
                  <p className="text-[0.85rem] text-slate-300">Drop an image here</p>
                  <p className="text-[0.75rem] text-slate-500">or select from your device</p>
                  <div className="flex justify-center gap-2">
                    <button type="button" className="admin-btn-ghost" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="size-4" />
                      Choose Image
                    </button>
                    <button type="button" className="admin-btn-ghost" disabled={!hasImage} onClick={clearSelectedFile}>
                      <Trash2 className="size-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {previewUrl ? (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <p className="text-[0.75rem] text-slate-500">Selected file: {selectedFile?.name || '-'}</p>
                  <img
                    src={previewUrl}
                    alt="Uploaded probe preview"
                    className="mt-2 h-64 w-full rounded-lg border border-white/[0.06] object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-6 text-center text-[0.82rem] text-slate-500">
                  No input image selected yet.
                </div>
              )}

              <details className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.85rem] font-medium text-slate-300">
                  <SlidersHorizontal className="size-4 text-slate-500" />
                  Advanced matching controls
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="top-k" className="mb-1 block text-[0.75rem] font-medium text-slate-400">top_k</label>
                    <input
                      id="top-k"
                      className="admin-input"
                      type="number"
                      min={1}
                      step={1}
                      value={topKInput}
                      onChange={(e) => setTopKInput(e.target.value)}
                      disabled={isMatching}
                    />
                  </div>
                  <div>
                    <label htmlFor="threshold" className="mb-1 block text-[0.75rem] font-medium text-slate-400">threshold</label>
                    <input
                      id="threshold"
                      className="admin-input"
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={!hasImage || isMatching}
                  onClick={() => { void runMatch(); }}
                >
                  {isMatching ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />
                      Finding matches…
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Find Matches
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost"
                  disabled={!hasImage || isMatching}
                  onClick={() => { void runMatch(); }}
                >
                  <RefreshCw className="size-4" />
                  Retry
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right — Candidate Results */}
        <div className="admin-surface relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <div className="border-b border-white/[0.05] px-6 py-5">
            <h3 className="text-[0.9rem] font-semibold text-white">Candidate Results</h3>
            <p className="mt-0.5 text-[0.8rem] text-slate-400">
              Review ranked candidates and supporting evidence before taking any manual action.
            </p>
          </div>
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[0.8rem] text-amber-300">
              Candidate ranking indicates similarity only. It does not confirm identity.
            </div>

            {isMatching ? (
              <div className="flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] py-16 text-[0.85rem] text-slate-500">
                <div className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400/60" />
                Searching…
              </div>
            ) : null}

            {!isMatching && errorMessage ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-[0.85rem] text-rose-300">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  className="admin-btn-ghost mt-3"
                  disabled={!hasImage}
                  onClick={() => { void runMatch(); }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!isMatching && !errorMessage && !hasSearched ? (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] py-16 text-center text-[0.85rem] text-slate-500">
                Upload a probe image and run &ldquo;Find Matches&rdquo; to view ranked candidates.
              </div>
            ) : null}

            {!isMatching && !errorMessage && hasSearched && allCandidates.length === 0 ? (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] py-16 text-center text-[0.85rem] text-slate-500">
                <p className="font-medium text-slate-300">No reliable match found.</p>
                <p className="mt-2">Try a clearer face image or search manually.</p>
              </div>
            ) : null}

            {!isMatching && !errorMessage && hasSearched && allCandidates.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[0.78rem] text-slate-500">
                  <p>
                    Ranked candidates: <span className="text-slate-300">{allCandidates.length}</span>
                    {' '}| Strong: <span className="text-emerald-400">{confidenceCounts.strong}</span>
                    {' '}| Possible: <span className="text-amber-400">{confidenceCounts.possible}</span>
                    {' '}| Weak: <span className="text-rose-400">{confidenceCounts.weak}</span>
                    {' '}| Threshold: <span className="text-slate-300">{formatDistance(results?.threshold_used ?? 0)}</span>
                  </p>
                  <p className="mt-1">
                    Embeddings searched: <span className="text-slate-300">{results?.searched_embedding_rows ?? 0}</span>
                  </p>
                </div>

                {paginatedCandidates.length > 0 ? (
                  <div className="grid gap-4">
                    {paginatedCandidates.map((candidate, index) => (
                      <CandidateCard
                        key={`${candidate.student_id}-${candidate.rank}-${index}`}
                        candidate={candidate}
                        isTopCandidate={candidate.rank === topCandidateRank}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <p className="text-[0.85rem] text-slate-500">No candidates available in this result.</p>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.01] px-4 py-3">
                    <span className="text-[0.75rem] text-slate-400">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, allCandidates.length)} of {allCandidates.length} results
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="admin-btn-ghost px-3 py-1.5 text-[0.75rem]"
                      >
                        Previous
                      </button>
                      <span className="px-2 text-[0.75rem] font-medium text-slate-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="admin-btn-ghost px-3 py-1.5 text-[0.75rem]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {!isMatching && results ? (
              <details className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <summary className="cursor-pointer text-[0.75rem] text-slate-500">Show debug response</summary>
                <p className="mt-2 text-[0.75rem] text-slate-500">
                  Match found: <span className="text-slate-300">{results.match_found ? 'Yes' : 'No'}</span>
                  {' '}| Candidates: <span className="text-slate-300">{results.candidates.length}</span>
                </p>
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-white/[0.05] bg-black/30 p-3 text-[11px] leading-4 text-slate-400">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        </div>
      </section>

      {/* Suppress unused import */}
      {false && <Loader2 />}
    </div>
  );
}
