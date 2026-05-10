import { useState, useEffect } from 'react';
import { Bell, Filter, RefreshCw, MapPin, BarChart3, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminStats from '../components/admin/AdminStats';
import BookingApprovalCard from '../components/admin/BookingApprovalCard';
import toast from 'react-hot-toast';
import { exportToCSV, formatBookingForExport } from '../utils/csvExport';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    fetchBookings();
    
    // Set up real-time subscription for new bookings
    const subscription = supabase
      .channel('admin-bookings')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'bookings'
        }, 
        (payload) => {
          toast('New booking request!', {
            icon: '🔔',
            duration: 5000,
          });
          setHasNewNotifications(true);
          fetchBookings();
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: bookingsData, error } = await query;

      if (error) throw error;

      // Fetch space details for each booking
      if (bookingsData && bookingsData.length > 0) {
        const spaceIds = [...new Set(bookingsData.map(b => b.space_id))];
        const { data: spacesData } = await supabase
          .from('spaces')
          .select('id, name, hourly_rate')
          .in('id', spaceIds);

        // Combine bookings with space data
        const bookingsWithSpaces = bookingsData.map(booking => ({
          ...booking,
          space: spacesData?.find(space => space.id === booking.space_id) || { name: 'Unknown Space', hourly_rate: 0 }
        }));

        setBookings(bookingsWithSpaces);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setHasNewNotifications(false);
    fetchBookings();
  };

  const handleExportBookings = () => {
    const exportData = bookings.map(booking => formatBookingForExport(booking));
    const filename = `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCSV(exportData, filename);
    toast.success('Bookings exported successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage bookings and monitor space utilization</p>
          </div>
          <div className="flex items-center space-x-4">
            {hasNewNotifications && (
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-600 animate-bounce" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </div>
            )}
            <Link
              to="/admin/analytics"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
            <Link
              to="/admin/spaces"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Manage Spaces
            </Link>
            <button
              onClick={handleExportBookings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <AdminStats />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <nav className="flex space-x-4">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No {filter !== 'all' ? filter : ''} bookings found</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <BookingApprovalCard
              key={booking.id}
              booking={booking}
              onUpdate={fetchBookings}
            />
          ))
        )}
      </div>
    </div>
  );
}
