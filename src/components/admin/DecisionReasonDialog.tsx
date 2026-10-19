import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { OTHER_REASON, type DecisionReason } from '../../lib/decisionReasons';

interface DecisionReasonDialogProps {
  title: string;
  /** Short line under the title, e.g. who/what this applies to. */
  subtitle?: string;
  confirmLabel: string;
  reasons: string[];
  loading?: boolean;
  onConfirm: (decision: DecisionReason) => void;
  onClose: () => void;
}

/** Asks the admin *why* before a booking/proposal is rejected or
 *  cancelled — the answer is stored and shown to the guest on their
 *  ticket, instead of the request just quietly disappearing. */
export default function DecisionReasonDialog({
  title, subtitle, confirmLabel, reasons, loading = false, onConfirm, onClose,
}: DecisionReasonDialogProps): JSX.Element {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const needsNote = reason === OTHER_REASON;
  const canConfirm = !!reason && (!needsNote || note.trim().length > 0) && !loading;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Why? <span className="font-normal text-gray-500">— the guest will see this</span></p>
            <div className="space-y-1.5">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${
                    reason === r
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Add a note {needsNote ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-500">(optional)</span>}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={needsNote ? 'Please explain the reason' : 'Anything else the guest should know?'}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            Keep it
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm({ reason, note: note.trim() })}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
