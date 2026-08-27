import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Filter, Calendar, Download, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToCSV, formatBookingForExport } from '../utils/csvExport';
import BookingApprovalCard from '../components/admin/BookingApprovalCard';

interface AdminBooking {
  id: string;
  booking_reference: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_used: number;
  total_price: number;
  status: string;
  purpose: string | string[] | null;
  notes: string | null;
  is_workshop: boolean;
  created_at: string;
  admin_contacted: boolean;
  admin_contacted_at: string | null;
  booking_type: string | null;
  group_size: number | null;
  organization: string | null;
  gathering_type: string | null;
  package?: {
    id: string;
    slug: string;
    name: string;
    hourly_rate: number | null;
    daily_rate: number | null;
    billing_mode: string;
    seats_consumed: number;
    is_bundle: boolean;
  } | null;
  borrowings?: { id: string; asset: { name: string } | null }[];
}

export default function AdminBookings(): JSX.Element {
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBookings = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_bookings')
        .select('*, package:rental_packages(id, slug, name, hourly_rate, daily_rate, billing_mode, seats_consumed, is_bundle), borrowings(id, asset:assets(name))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Apply filter and search
  const filteredBookings = allBookings.filter(booking => {
    // Filter by status first
    if (filter !== 'all' && booking.status !== filter) return false;
    
    // Then filter by search term
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const purposeText = Array.isArray(booking.purpose) ? booking.purpose.join(' ') : booking.purpose;
    return (
      booking.guest_name?.toLowerCase().includes(term) ||
      booking.guest_email?.toLowerCase().includes(term) ||
      booking.booking_reference?.toLowerCase().includes(term) ||
      purposeText?.toLowerCase().includes(term)
    );
  });

  // Calculate stats from ALL bookings
  const stats = {
    all: allBookings.length,
    pending: allBookings.filter(b => b.status === 'pending').length,
    approved: allBookings.filter(b => b.status === 'approved').length,
    rejected: allBookings.filter(b => b.status === 'rejected').length,
  };

  const handleExport = async (): Promise<void> => {
    try {
      toast.loading('Exporting bookings...', { id: 'export' });
      const { data, error } = await supabase
        .from('hub_bookings')
        .select('*, package:rental_packages(name, slug)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const exportData = (data || []).map((b: AdminBooking) => formatBookingForExport(b as unknown as Record<string, unknown>));
      exportToCSV(exportData, `Admin_Bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      
      toast.dismiss('export');
      toast.success(`Exported ${data?.length || 0} bookings`);
    } catch (err) {
      toast.dismiss('export');
      toast.error('Export failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/admin" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hub Bookings</h1>
            </div>
            <p className="mt-1 text-gray-600 dark:text-gray-400 ml-8">Review and manage advanced bookings</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBookings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === status
                    ? 'bg-[#0C2340] dark:bg-slate-700 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-[#0C2340] dark:focus:ring-slate-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`p-4 rounded-xl border-2 transition-all ${
              filter === status
                ? 'border-[#0C2340] dark:border-slate-500 bg-[#0C2340]/5 dark:bg-slate-700/50'
                : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats[status]}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{status}</p>
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2340] dark:border-slate-400"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-slate-800 rounded-2xl">
            <Calendar className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No {filter !== 'all' ? filter : ''} bookings found</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <BookingApprovalCard key={booking.id} booking={booking} onUpdate={fetchBookings} />
          ))
        )}
      </div>
    </div>
  );
}
