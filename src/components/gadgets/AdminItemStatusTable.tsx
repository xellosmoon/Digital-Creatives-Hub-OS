import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Wrench,
  AlertOctagon,
  Archive,
  Building2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { Item, ItemStatus, Borrowing, Asset } from '../../types/gadgets';

interface AdminItemStatusTableProps {
  items: (Item & { asset?: { name: string; slug: string; requires_notice?: string | null } })[];
  activeBorrowings: Borrowing[];
  onRefresh: () => void;
}

const STATUS_BADGE: Record<ItemStatus, { icon: React.ElementType; cls: string; label: string }> = {
  available:   { icon: CheckCircle,  cls: 'bg-green-50 text-green-700 border-green-200',   label: 'Available' },
  borrowed:    { icon: ExternalLink, cls: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Borrowed' },
  maintenance: { icon: Wrench,       cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Maintenance' },
  broken:      { icon: AlertOctagon, cls: 'bg-red-50 text-red-700 border-red-200',          label: 'Broken' },
  retired:     { icon: Archive,      cls: 'bg-gray-50 text-gray-500 border-gray-200',       label: 'Retired' },
};

export default function AdminItemStatusTable({ items, activeBorrowings, onRefresh }: AdminItemStatusTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'all'>('all');

  const setItemStatus = async (itemId: string, status: ItemStatus, notes?: string) => {
    setUpdatingId(itemId);
    try {
      const payload: Record<string, any> = { status };
      if (notes !== undefined) payload.condition_notes = notes;
      const { error } = await supabase.from('items').update(payload).eq('id', itemId);
      if (error) throw error;
      toast.success(`Item set to ${status}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filterStatus === 'all' ? items : items.filter((i) => i.status === filterStatus);

  // Map item_id → active borrowing for location tracking
  const borrowingByItem = new Map<string, Borrowing>();
  activeBorrowings.forEach((b) => {
    if (b.status === 'active' || b.status === 'approved') {
      borrowingByItem.set(b.item_id, b);
    }
  });

  const statusCounts: Record<string, number> = {
    all: items.length,
    available: items.filter((i) => i.status === 'available').length,
    borrowed: items.filter((i) => i.status === 'borrowed').length,
    maintenance: items.filter((i) => i.status === 'maintenance').length,
    broken: items.filter((i) => i.status === 'broken').length,
    retired: items.filter((i) => i.status === 'retired').length,
  };

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4 px-4 pt-4">
        {(['all', 'available', 'borrowed', 'maintenance', 'broken', 'retired'] as const).map((s) => {
          const active = filterStatus === s;
          const count = statusCounts[s] || 0;
          if (s !== 'all' && count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                active
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Asset Tag</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Serial #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No items matching filter.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const badge = STATUS_BADGE[item.status];
                const BadgeIcon = badge.icon;
                const activeBorrow = borrowingByItem.get(item.id);
                const isUpdating = updatingId === item.id;
                const assetName = item.asset?.name ?? 'Unknown';
                const notice = (item.asset as any)?.requires_notice;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {item.asset_tag ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{assetName}</span>
                      {notice && (
                        <span className="block text-xs text-amber-600 mt-0.5">{notice}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.serial_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${badge.cls}`}>
                        <BadgeIcon className="h-3.5 w-3.5" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-900">
                          {item.current_location || 'DCIH Storage'}
                        </span>
                        {activeBorrow && activeBorrow.destination_location && (
                          <span className={`inline-flex items-center gap-1 text-xs ${
                            (activeBorrow as any).usage_type === 'inside'
                              ? 'text-blue-600'
                              : 'text-purple-600'
                          }`}>
                            {(activeBorrow as any).usage_type === 'inside' ? (
                              <Building2 className="h-3 w-3" />
                            ) : (
                              <ExternalLink className="h-3 w-3" />
                            )}
                            {(activeBorrow as any).usage_type === 'inside' ? 'Inside' : 'Outside'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                      {item.condition_notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Restore to available */}
                        {(item.status === 'maintenance' || item.status === 'broken') && (
                          <button
                            disabled={isUpdating}
                            onClick={() => setItemStatus(item.id, 'available')}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            title="Restore to Available"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {/* Set to maintenance */}
                        {item.status !== 'maintenance' && item.status !== 'retired' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => setItemStatus(item.id, 'maintenance')}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600"
                            title="Set to Maintenance"
                          >
                            <Wrench className="h-4 w-4" />
                          </button>
                        )}
                        {/* Set to broken */}
                        {item.status !== 'broken' && item.status !== 'retired' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => setItemStatus(item.id, 'broken')}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            title="Mark as Broken"
                          >
                            <AlertOctagon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
