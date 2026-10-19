import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getErrorMessage } from '../../lib/getErrorMessage';
import { GUEST_CANCEL_REASONS, type DecisionReason } from '../../lib/decisionReasons';

interface CancelTicketControlProps {
  kind: 'booking' | 'proposal';
  reference: string;
  /** The email the booking/proposal was made with — the database needs the
   *  reference AND the email to match before it will cancel anything. */
  email: string;
  onCancelled: (decision: DecisionReason) => void;
}

/** "Cancel" for a guest's own ticket — no account needed, just like the
 *  ticket itself. Collapsed to a small link until clicked, so it's there
 *  when needed without inviting accidental taps. */
export default function CancelTicketControl({ kind, reference, email, onCancelled }: CancelTicketControlProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);

  const noun = kind === 'booking' ? 'booking' : 'proposal';

  const handleCancel = async (): Promise<void> => {
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc(
        kind === 'booking' ? 'cancel_hub_booking' : 'cancel_event_proposal',
        { p_reference: reference, p_email: email, p_reason: reason || null, p_note: note.trim() || null },
      );
      if (error) throw error;
      if (!data) {
        // The database only cancels what's still cancellable by the guest
        // (e.g. not once it's been turned into a published event).
        toast.error(`This ${noun} can no longer be cancelled online — please contact the Hub.`);
        return;
      }
      toast.success(`Your ${noun} has been cancelled`);
      onCancelled({ reason, note: note.trim() });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Could not cancel your ${noun}`));
    } finally {
      setWorking(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm font-semibold text-red-600 hover:text-red-700 hover:underline py-1"
      >
        Cancel this {noun}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-4 space-y-3 text-left">
      <p className="text-sm font-bold text-red-800">Cancel this {noun}?</p>
      <p className="text-xs text-red-700">This can't be undone — you'd need to submit a new one.</p>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-700">Why are you cancelling? <span className="font-normal text-gray-500">(optional)</span></p>
        {GUEST_CANCEL_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
            <input
              type="radio"
              name={`cancel-reason-${reference}`}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="h-4 w-4 text-red-600 focus:ring-red-500"
            />
            {r}
          </label>
        ))}
      </div>

      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything you'd like us to know? (optional)"
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={working}
          className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={working}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {working && <Loader2 className="h-4 w-4 animate-spin" />}
          Yes, cancel it
        </button>
      </div>
    </div>
  );
}
