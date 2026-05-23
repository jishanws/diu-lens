import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, CheckCircle2 } from 'lucide-react';

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

const COMMON_REASONS = [
  'Blurry or low quality images',
  'Duplicate enrollment detected',
  'Inconsistent face across frames',
  'Incorrect identity details',
];

export function RejectReasonModal({ isOpen, onClose, onConfirm, isSubmitting }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = async () => {
    const finalReason = reason === 'custom' ? customReason : reason;
    if (!finalReason.trim()) return;
    await onConfirm(finalReason.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-semibold text-slate-100">Reject Enrollment</h3>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-400">
                Please provide a reason for rejection. This will be recorded in the audit logs.
              </p>

              <div className="space-y-2">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm text-left transition-all ${
                      reason === r
                        ? 'border-red-500/50 bg-red-500/10 text-red-200'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{r}</span>
                    {reason === r && <CheckCircle2 className="h-4 w-4 text-red-400" />}
                  </button>
                ))}

                <button
                  onClick={() => setReason('custom')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm text-left transition-all ${
                    reason === 'custom'
                      ? 'border-red-500/50 bg-red-500/10 text-red-200'
                      : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Custom Reason...</span>
                  {reason === 'custom' && <CheckCircle2 className="h-4 w-4 text-red-400" />}
                </button>
              </div>

              {reason === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2"
                >
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Type specific rejection reason..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={3}
                  />
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-slate-800 bg-slate-900/50 p-5">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || !reason || (reason === 'custom' && !customReason.trim())}
                className="flex-1 rounded-xl bg-red-500/10 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors border border-red-500/20"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
