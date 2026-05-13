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
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { formatPeso } from '../lib/pricingEngine';
import type { Borrowing, BorrowingStatus } from '../types/inventory';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<BorrowingStatus, { icon: React.ElementType; cls: string; label: string }> = {
  pending:   { icon: Clock,         cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Pending Approval' },
  approved:  { icon: CheckCircle,   cls: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Approved' },
  active:    { icon: CheckCircle,   cls: 'bg-green-50 text-green-700 border-green-200',    label: 'Active' },
  returned:  { icon: RotateCcw,     cls: 'bg-gray-50 text-gray-600 border-gray-200',       label: 'Returned' },
  overdue:   { icon: AlertTriangle, cls: 'bg-red-50 text-red-700 border-red-200',          label: 'Overdue' },
  cancelled: { icon: XCircle,       cls: 'bg-gray-50 text-gray-400 border-gray-200',       label: 'Cancelled' },
};

export default function MyBorrows() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'past' | 'all'>('active');

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      let query = supabase
        .from('borrowings')
        .select('*, asset:assets(name, slug, category), item:items(asset_tag)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['pending', 'approved', 'active']);
      } else if (filter === 'past') {
        query = query.in('status', ['returned', 'cancelled']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBorrowings((data ?? []) as Borrowing[]);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load borrowings');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase.from('borrowings').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      toast.success('Borrowing cancelled');
      fetchBorrowings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
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
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Borrows</h1>
            <p className="text-sm text-gray-500">Track your equipment borrowings</p>
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
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Borrows</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 uppercase">Currently Active</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Fees</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatPeso(stats.totalSpent)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {(['active', 'past', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No borrowings found</p>
          <p className="text-sm text-gray-400 mt-1">Visit the inventory to borrow equipment.</p>
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
            const assetName = (b.asset as any)?.name ?? 'Unknown';
            const tag = (b.item as any)?.asset_tag ?? '';

            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{assetName}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${cfg.cls}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="font-mono text-xs">{b.borrowing_reference}</span>
                      {tag && <span className="text-xs">Tag: {tag}</span>}
                      {(b as any).destination_location && (
                        <span className="text-xs font-medium text-gray-700">
                          {(b as any).destination_location}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        ((b as any).usage_type || b.location) === 'inside' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        <MapPin className="h-3 w-3" />
                        {((b as any).usage_type || b.location) === 'inside' ? 'Inside DCIH' : 'Outside'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-gray-600">
                      <span>
                        <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                        {format(new Date(b.start_time), 'MMM d, h:mm a')} → {format(new Date(b.end_time), 'MMM d, h:mm a')}
                      </span>
                      <span className="font-semibold text-gray-900">{formatPeso(b.total_price)}</span>
                    </div>

                    {b.purpose && (
                      <p className="text-xs text-gray-400 mt-2">Purpose: {b.purpose}</p>
                    )}
                  </div>

                  {/* Cancel button for pending */}
                  {b.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="ml-4 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
