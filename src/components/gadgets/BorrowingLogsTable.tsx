import { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileText, X } from 'lucide-react';
import { formatPeso } from '../../lib/pricingEngine';
import type { Borrowing, BorrowingStatus } from '../../types/gadgets';
import ReceivingForm, { borrowingToFormData } from './ReceivingForm';

type Row = Borrowing & {
  item?: { asset_tag: string | null; serial_number?: string | null };
  asset?: { name: string };
  usage_type?: string;
  destination_location?: string | null;
};

interface BorrowingLogsTableProps {
  borrowings: Row[];
}

const STATUS_BADGE: Record<BorrowingStatus, { cls: string; label: string }> = {
  pending:   { cls: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Pending' },
  approved:  { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',         label: 'Approved' },
  active:    { cls: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',     label: 'Active' },
  returned:  { cls: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',         label: 'Returned' },
  overdue:   { cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',             label: 'Overdue' },
  cancelled: { cls: 'bg-gray-50 text-gray-400 dark:bg-gray-900/30 dark:text-gray-500',          label: 'Cancelled' },
};

export default function BorrowingLogsTable({ borrowings }: BorrowingLogsTableProps): JSX.Element {
  const [viewingForm, setViewingForm] = useState<Row | null>(null);
  const totalCollected = borrowings
    .filter((b) => b.status === 'returned' || b.status === 'active')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  const handleExportCSV = (): void => {
    const headers = ['Reference', 'Asset', 'Tag', 'Usage Type', 'Destination', 'Start', 'End', 'Returned', 'Duration (hrs)', 'Fee', 'Status', 'Purpose', 'Notes'];
    const rows = borrowings.map((b) => [
      b.borrowing_reference,
      b.asset?.name ?? '',
      b.item?.asset_tag ?? '',
      b.usage_type !== undefined ? b.usage_type : b.location || '',
      b.destination_location || '',
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
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{borrowings.length}</span> records
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total collected: <span className="font-semibold text-green-700 dark:text-green-400">{formatPeso(totalCollected)}</span>
          </span>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
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
              <th className="px-4 py-3">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {borrowings.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
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
                        {b.destination_location && (
                          <span className="text-xs font-medium text-gray-900">
                            {b.destination_location}
                          </span>
                        )}
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${
                          (b.usage_type || b.location) === 'inside' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {(b.usage_type || b.location) === 'inside' ? 'Inside' : 'Outside'}
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewingForm(b)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        title="View Receiving Form"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {viewingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Receiving Form — {viewingForm.borrowing_reference}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                >
                  Print
                </button>
                <button onClick={() => setViewingForm(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-100 flex justify-center">
              {/* zoom, not transform:scale — transform would create a containing
                  block for the print root's position:fixed and trap it on-screen. */}
              <div style={{ zoom: 0.7 }}>
                <ReceivingForm pages={[borrowingToFormData(viewingForm)]} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
