import { useState, useEffect, useCallback } from 'react';
import { format, isPast } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Plus,
  Printer,
  X,
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { formatPeso } from '../lib/pricingEngine';
import type { BorrowingStatus, LateFeeUnit } from '../types/gadgets';
import toast from 'react-hot-toast';
import ReceivingForm, { borrowingToFormData } from '../components/gadgets/ReceivingForm';

interface BorrowingWithAsset {
  id: string;
  asset?: { name: string; slug: string; category: string };
  item?: { asset_tag: string | null; serial_number: string | null };
  destination_location?: string | null;
  usage_type?: string | null;
  location?: string | null;
  status: BorrowingStatus;
  borrowing_reference: string;
  end_time: string;
  start_time: string;
  total_price?: number | null;
  purpose?: string | null;
  borrower_name?: string | null;
  borrower_office?: string | null;
  borrower_contact?: string | null;
  device_operator_name?: string | null;
  late_fee_rate?: number | null;
  late_fee_unit?: LateFeeUnit | null;
}

const STATUS_CONFIG: Record<BorrowingStatus, { icon: React.ElementType; cls: string; label: string }> = {
  pending: { icon: Clock, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', label: 'Pending Approval' },
  approved: { icon: CheckCircle, cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', label: 'Approved' },
  active: { icon: CheckCircle, cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', label: 'Active' },
  returned: { icon: RotateCcw, cls: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700', label: 'Returned' },
  overdue: { icon: AlertTriangle, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', label: 'Overdue' },
  cancelled: { icon: XCircle, cls: 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-gray-500 dark:border-slate-700', label: 'Cancelled' },
};

export default function MyBorrows(): JSX.Element {
  const [borrowings, setBorrowings] = useState<BorrowingWithAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'past' | 'all'>('active');
  const [printing, setPrinting] = useState<BorrowingWithAsset | null>(null);

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      let query = supabase
        .from('borrowings')
        .select('*, asset:assets(name, slug, category), item:items(asset_tag, serial_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['pending', 'approved', 'active']);
      } else if (filter === 'past') {
        query = query.in('status', ['returned', 'cancelled']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBorrowings((data ?? []) as BorrowingWithAsset[]);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load borrowings');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  // Live-refresh when an admin approves/returns/cancels one of this user's
  // borrowings elsewhere (e.g. the admin queue) while this page is open.
  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      sub = supabase
        .channel(`my-borrows-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'borrowings', filter: `user_id=eq.${user.id}` },
          () => fetchBorrowings()
        )
        .subscribe();
    })();
    return () => { if (sub) supabase.removeChannel(sub); };
  }, [fetchBorrowings]);

  const handleCancel = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('borrowings').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      toast.success('Borrowing cancelled');
      fetchBorrowings();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel';
      toast.error(errorMessage);
    }
  };

  const stats = {
    total: borrowings.length,
    active: borrowings.filter((b) => ['pending', 'approved', 'active'].includes(b.status)).length,
    totalSpent: borrowings
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + (b.total_price ?? 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Borrows</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your equipment borrowings</p>
          </div>
        </div>
        <Link
          to="/inventory"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Borrow Equipment
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Borrows</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Currently Active</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Fees</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{formatPeso(stats.totalSpent)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {(['active', 'past', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === f
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
          >
            {f === 'active' ? 'Active' : f === 'past' ? 'Past' : 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : borrowings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No borrowings found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Visit the gadgets catalog to borrow equipment.</p>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
          >
            <Package className="h-4 w-4" />
            Browse Equipment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {borrowings.map((b) => {
            const displayStatus: BorrowingStatus =
              b.status === 'active' && isPast(new Date(b.end_time)) ? 'overdue' : b.status;
            const cfg = STATUS_CONFIG[displayStatus];
            const StatusIcon = cfg.icon;
            const assetName = b.asset?.name ?? 'Unknown';
            const tag = b.item?.asset_tag ?? '';

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{assetName}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${cfg.cls}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-mono text-xs">{b.borrowing_reference}</span>
                      {tag && <span className="text-xs">Tag: {tag}</span>}
                      {b.destination_location && (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {b.destination_location}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${(b.usage_type || b.location) === 'inside' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                        <MapPin className="h-3 w-3" />
                        {(b.usage_type || b.location) === 'inside' ? 'Inside DCIH' : 'Outside'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                        {b.start_time ? format(new Date(b.start_time), 'MMM d, h:mm a') : 'N/A'} → {format(new Date(b.end_time), 'MMM d, h:mm a')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPeso(b.total_price ?? 0)}</span>
                    </div>

                    {b.purpose && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Purpose: {b.purpose}</p>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2">
                    {(b.status === 'pending' || b.status === 'approved') && (
                      <button
                        onClick={() => setPrinting(b)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print Form
                      </button>
                    )}
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {printing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receiving Form — {printing.borrowing_reference}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                >
                  Print
                </button>
                <button onClick={() => setPrinting(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-slate-900 flex justify-center">
              {/* zoom, not transform:scale — transform would create a containing
                  block for the print root's position:fixed and trap it on-screen. */}
              <div style={{ zoom: 0.7 }}>
                <ReceivingForm pages={[borrowingToFormData(printing)]} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

