import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

export const ConfirmDialog: React.FC = () => {
  const { confirmState, closeConfirm } = useLibrary();

  if (!confirmState.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#171721] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-white">
              {confirmState.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeConfirm}
            className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{confirmState.message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmState.onConfirm}
            className="px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 transition-colors whitespace-nowrap shrink-0"
          >
            {confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
