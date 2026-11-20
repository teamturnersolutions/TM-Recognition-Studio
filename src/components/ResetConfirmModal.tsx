interface ResetConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetConfirmModal({
  open,
  onCancel,
  onConfirm,
}: ResetConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <h2 id="reset-modal-title" className="text-lg font-bold text-white">
          Reset Recognition Session?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          This will permanently clear all six nominee names, remove all uploaded photos from
          browser memory, clear winner recognition details, and return to a blank Recognition
          Builder. Templates will not be modified.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#b90404] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d11313]"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
}
