import { useState } from 'react';
import { format, isPast } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Wrench,
  FileText,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPeso } from '../../lib/pricingEngine';
import type { Borrowing, Item, BorrowingStatus, ReturnCondition } from '../../types/gadgets';
import { RETURN_CONDITION_LABELS } from '../../types/gadgets';
import ReceivingForm, { borrowingToFormData } from './ReceivingForm';

type Row = Borrowing & {
  item?: Item;
  asset?: { name: string };
  destination_location?: string | null;
  usage_type?: string;
};

interface AdminBorrowingTableProps {
  borrowings: Row[];
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<
  BorrowingStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30', label: 'Approved' },
  active: { icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30', label: 'Active' },
  returned: { icon: RotateCcw, color: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/30', label: 'Returned' },
  overdue: { icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'text-gray-400 bg-gray-50 dark:text-gray-500 dark:bg-gray-900/30', label: 'Cancelled' },
};

export default function AdminBorrowingTable({ borrowings, onRefresh }: AdminBorrowingTableProps): JSX.Element {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingForm, setViewingForm] = useState<Row | null>(null);
  const [returning, setReturning] = useState<Row | null>(null);

  const updateStatus = async (id: string, status: BorrowingStatus): Promise<void> => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('borrowings').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(`Borrowing ${status}`);
      onRefresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      toast.error(errorMessage);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateItemStatus = async (itemId: string, status: string): Promise<void> => {
    try {
      const { error } = await supabase.from('items').update({ status }).eq('id', itemId);
      if (error) throw error;
      toast.success(`Item set to ${status}`);
      onRefresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      toast.error(errorMessage);
    }
  };

  if (borrowings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">No borrowing records</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <th className="px-4 py-3">Ref</th>
            <th className="px-4 py-3">Borrower</th>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3">Item Tag</th>
            <th className="px-4 py-3">Where / Destination</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {borrowings.map((b) => {
            const cfg = STATUS_CONFIG[b.status];
            const StatusIcon = cfg.icon;
            const isOverdue = b.status === 'active' && isPast(new Date(b.end_time));

            return (
              <tr key={b.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/20' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs">{b.borrowing_reference}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{b.borrower_name ?? '—'}</span>
                  {b.borrower_office && <span className="block text-xs text-gray-500 dark:text-gray-400">{b.borrower_office}</span>}
                  {b.borrower_contact && <span className="block text-xs text-gray-400 dark:text-gray-500">{b.borrower_contact}</span>}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {b.asset?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {b.item?.asset_tag ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {b.destination_location ? (
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {b.destination_location}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        (b.usage_type || b.location) === 'inside'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}
                    >
                      {(b.usage_type || b.location) === 'inside' ? 'Inside Hub' : 'Outside Hub'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {format(new Date(b.start_time), 'MMM d, h:mm a')}
                  <br />
                  → {format(new Date(b.end_time), 'MMM d, h:mm a')}
                  {isOverdue && (
                    <span className="block text-red-600 dark:text-red-400 font-semibold mt-0.5">OVERDUE</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{formatPeso(b.total_price)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {isOverdue ? 'Overdue' : cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingForm(b)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
                      title="View Receiving Form"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    {b.status === 'pending' && (
                      <>
                        <button
                          disabled={updatingId === b.id}
                          onClick={() => updateStatus(b.id, 'approved')}
                          className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          disabled={updatingId === b.id}
                          onClick={() => updateStatus(b.id, 'cancelled')}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {(b.status === 'approved' || b.status === 'active') && (
                      <button
                        disabled={updatingId === b.id}
                        onClick={() => setReturning(b)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
                        title="Mark Returned"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    {b.item && b.item.status !== 'maintenance' && (
                      <button
                        onClick={() => updateItemStatus(b.item!.id, 'maintenance')}
                        className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 dark:text-amber-400"
                        title="Set to Maintenance"
                      >
                        <Wrench className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {viewingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receiving Form — {viewingForm.borrowing_reference}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                >
                  Print
                </button>
                <button onClick={() => setViewingForm(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-slate-900 flex justify-center">
              {/* zoom, not transform:scale — transform would create a containing
                  block for the print root's position:fixed and trap it on-screen. */}
              <div style={{ zoom: 0.7 }}>
                <ReceivingForm pages={[borrowingToFormData(viewingForm)]} />
              </div>
            </div>
          </div>
        </div>
      )}

      {returning && (
        <ReturnModal
          borrowing={returning}
          onClose={() => setReturning(null)}
          onDone={() => { setReturning(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

function ReturnModal({
  borrowing,
  onClose,
  onDone,
}: {
  borrowing: Row;
  onClose: () => void;
  onDone: () => void;
}): JSX.Element {
  const [condition, setCondition] = useState<ReturnCondition>('good');
  const [remarks, setRemarks] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    if (!receivedBy.trim()) {
      toast.error('Enter who received the item.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('borrowings')
        .update({
          status: 'returned',
          actual_return_time: new Date().toISOString(),
          return_condition: condition,
          return_remarks: remarks.trim() || null,
          received_by: receivedBy.trim(),
        })
        .eq('id', borrowing.id);
      if (error) throw error;
      toast.success('Marked as returned');
      onDone();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Return</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition Upon Return</label>
            <div className="space-y-2">
              {(Object.keys(RETURN_CONDITION_LABELS) as ReturnCondition[]).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="return_condition"
                    checked={condition === c}
                    onChange={() => setCondition(c)}
                  />
                  {RETURN_CONDITION_LABELS[c]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional — e.g. minor scratch on the lens"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Checked and Received By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Admin/staff name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400 text-sm"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm Return'}
          </button>
        </div>
      </div>
    </div>
  );
}
