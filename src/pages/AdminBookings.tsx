import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Filter, CheckCircle, XCircle, Clock, Calendar, Download, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToCSV, formatBookingForExport } from '../utils/csvExport';

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
  purpose: string | null;
  notes: string | null;
  created_at: string;
  package?: {
    name: string;
    slug: string;
  };
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
        .select('*, package:rental_packages(name, slug)')
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
    return (
      booking.guest_name?.toLowerCase().includes(term) ||
      booking.guest_email?.toLowerCase().includes(term) ||
      booking.booking_reference?.toLowerCase().includes(term) ||
      booking.purpose?.toLowerCase().includes(term)
    );
  });

  // Calculate stats from ALL bookings
  const stats = {
    all: allBookings.length,
    pending: allBookings.filter(b => b.status === 'pending').length,
    approved: allBookings.filter(b => b.status === 'approved').length,
    rejected: allBookings.filter(b => b.status === 'rejected').length,
  };

  const handleApprove = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('hub_bookings')
        .update({ status: 'approved' })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Booking approved!');
      fetchBookings();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve';
      toast.error(errorMessage);
    }
  };

  const handleReject = async (id: string): Promise<void> => {
    if (!window.confirm('Reject this booking?')) return;
    try {
      const { error } = await supabase
        .from('hub_bookings')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Booking rejected');
      fetchBookings();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject';
      toast.error(errorMessage);
    }
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

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock className="h-4 w-4" />,
    approved: <CheckCircle className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/admin" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Hub Bookings</h1>
            </div>
            <p className="mt-1 text-gray-600 ml-8">Review and manage advanced bookings</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBookings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === status
                    ? 'bg-[#0C2340] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent"
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
                ? 'border-[#0C2340] bg-[#0C2340]/5'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{stats[status]}</p>
            <p className="text-sm text-gray-500 capitalize">{status}</p>
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2340]"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No {filter !== 'all' ? filter : ''} bookings found</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const isPast = booking.booking_date < todayStr;
            return (
            <div key={booking.id} className={`rounded-2xl border p-6 hover:shadow-md transition-shadow ${isPast ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{booking.guest_name || 'Unknown'}</h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusIcons[booking.status]}
                      {booking.status}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${isPast ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                    {booking.package && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {booking.package.name}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Reference</p>
                      <p className="font-mono text-gray-900">{booking.booking_reference || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Email</p>
                      <p className="text-gray-900">{booking.guest_email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Phone</p>
                      <p className="text-gray-900">{booking.guest_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Seats</p>
                      <p className="text-gray-900">{booking.seats_used}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Date</p>
                      <p className="text-gray-900">{format(new Date(booking.booking_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Time</p>
                      <p className="text-gray-900">
                        {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Price</p>
                      <p className="text-gray-900 font-semibold">₱{booking.total_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Booked</p>
                      <p className="text-gray-900">{format(new Date(booking.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>

                  {(booking.purpose || booking.notes) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {booking.purpose && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-gray-500">Purpose:</span> {booking.purpose}
                        </p>
                      )}
                      {booking.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium text-gray-500">Notes:</span> {booking.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(booking.id)}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(booking.id)}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-sm transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {booking.status === 'approved' && !isPast && (
                    <button
                      onClick={() => handleReject(booking.id)}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-sm transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  {booking.status === 'approved' && isPast && (
                    <span className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 bg-gray-100 text-center whitespace-nowrap">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
