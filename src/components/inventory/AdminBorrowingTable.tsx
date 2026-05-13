import { useState } from 'react';
import { format, isPast } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Wrench,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPeso } from '../../lib/pricingEngine';
import type { Borrowing, Item, BorrowingStatus } from '../../types/inventory';

interface AdminBorrowingTableProps {
  borrowings: (Borrowing & { item?: Item; asset?: { name: string } })[];
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<
  BorrowingStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-blue-600 bg-blue-50', label: 'Approved' },
  active: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Active' },
  returned: { icon: RotateCcw, color: 'text-gray-600 bg-gray-50', label: 'Returned' },
  overdue: { icon: AlertTriangle, color: 'text-red-600 bg-red-50', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'text-gray-400 bg-gray-50', label: 'Cancelled' },
};

export default function AdminBorrowingTable({ borrowings, onRefresh }: AdminBorrowingTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: BorrowingStatus) => {
    setUpdatingId(id);
    try {
      const payload: Record<string, any> = { status };
      if (status === 'returned') {
        payload.actual_return_time = new Date().toISOString();
      }
      const { error } = await supabase.from('borrowings').update(payload).eq('id', id);
      if (error) throw error;
      toast.success(`Borrowing ${status}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      const { error } = await supabase.from('items').update({ status }).eq('id', itemId);
      if (error) throw error;
      toast.success(`Item set to ${status}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  if (borrowings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No borrowing records</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Ref</th>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3">Item Tag</th>
            <th className="px-4 py-3">Where / Destination</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {borrowings.map((b) => {
            const cfg = STATUS_CONFIG[b.status];
            const StatusIcon = cfg.icon;
            const isOverdue = b.status === 'active' && isPast(new Date(b.end_time));

            return (
              <tr key={b.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs">{b.borrowing_reference}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {b.asset?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {b.item?.asset_tag ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {(b as any).destination_location ? (
                      <span className="text-xs font-medium text-gray-900">
                        {(b as any).destination_location}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        ((b as any).usage_type || b.location) === 'inside'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {((b as any).usage_type || b.location) === 'inside' ? 'Inside Hub' : 'Outside Hub'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {format(new Date(b.start_time), 'MMM d, h:mm a')}
                  <br />
                  → {format(new Date(b.end_time), 'MMM d, h:mm a')}
                  {isOverdue && (
                    <span className="block text-red-600 font-semibold mt-0.5">OVERDUE</span>
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
                    {b.status === 'pending' && (
                      <>
                        <button
                          disabled={updatingId === b.id}
                          onClick={() => updateStatus(b.id, 'approved')}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          disabled={updatingId === b.id}
                          onClick={() => updateStatus(b.id, 'cancelled')}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {(b.status === 'approved' || b.status === 'active') && (
                      <button
                        disabled={updatingId === b.id}
                        onClick={() => updateStatus(b.id, 'returned')}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Mark Returned"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    {b.item && b.item.status !== 'maintenance' && (
                      <button
                        onClick={() => updateItemStatus(b.item!.id, 'maintenance')}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500"
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
    </div>
  );
}
