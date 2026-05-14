import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Download,
} from 'lucide-react';
import { formatPeso } from '../../lib/pricingEngine';
import type { Borrowing, Item, BorrowingStatus } from '../../types/gadgets';

interface BorrowingLogsTableProps {
  borrowings: (Borrowing & { item?: { asset_tag: string | null }; asset?: { name: string } })[];
}

const STATUS_BADGE: Record<BorrowingStatus, { cls: string; label: string }> = {
  pending:   { cls: 'bg-yellow-50 text-yellow-700', label: 'Pending' },
  approved:  { cls: 'bg-blue-50 text-blue-700',     label: 'Approved' },
  active:    { cls: 'bg-green-50 text-green-700',   label: 'Active' },
  returned:  { cls: 'bg-gray-100 text-gray-700',    label: 'Returned' },
  overdue:   { cls: 'bg-red-50 text-red-700',       label: 'Overdue' },
  cancelled: { cls: 'bg-gray-50 text-gray-400',     label: 'Cancelled' },
};

export default function BorrowingLogsTable({ borrowings }: BorrowingLogsTableProps) {
  const totalCollected = borrowings
    .filter((b) => b.status === 'returned' || b.status === 'active')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  const handleExportCSV = () => {
    const headers = ['Reference', 'Asset', 'Tag', 'Usage Type', 'Destination', 'Start', 'End', 'Returned', 'Duration (hrs)', 'Fee', 'Status', 'Purpose', 'Notes'];
    const rows = borrowings.map((b) => [
      b.borrowing_reference,
      b.asset?.name ?? '',
      b.item?.asset_tag ?? '',
      (b as any).usage_type || b.location || '',
      (b as any).destination_location || '',
      format(new Date(b.start_time), 'yyyy-MM-dd HH:mm'),
      format(new Date(b.end_time), 'yyyy-MM-dd HH:mm'),
      b.actual_return_time ? format(new Date(b.actual_return_time), 'yyyy-MM-dd HH:mm') : '',
      b.duration_hours?.toFixed(1) ?? '',
      b.total_price?.toFixed(2) ?? '',
      b.status,
      b.purpose ?? '',
      b.notes ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `borrowing-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{borrowings.length}</span> records
          </span>
          <span className="text-sm text-gray-500">
            Total collected: <span className="font-semibold text-green-700">{formatPeso(totalCollected)}</span>
          </span>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Checked Out</th>
              <th className="px-4 py-3">Due / Returned</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {borrowings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  No borrowing logs yet.
                </td>
              </tr>
            ) : (
              borrowings.map((b) => {
                const badge = STATUS_BADGE[b.status];
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.borrowing_reference}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.asset?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.item?.asset_tag ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {(b as any).destination_location && (
                          <span className="text-xs font-medium text-gray-900">
                            {(b as any).destination_location}
                          </span>
                        )}
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${
                          ((b as any).usage_type || b.location) === 'inside' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {((b as any).usage_type || b.location) === 'inside' ? 'Inside' : 'Outside'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {format(new Date(b.start_time), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {b.actual_return_time ? (
                        <span className="text-green-700">
                          {format(new Date(b.actual_return_time), 'MMM d, h:mm a')}
                        </span>
                      ) : (
                        <span>Due: {format(new Date(b.end_time), 'MMM d, h:mm a')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{b.duration_hours?.toFixed(1)}h</td>
                    <td className="px-4 py-3 font-medium">{formatPeso(b.total_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
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
