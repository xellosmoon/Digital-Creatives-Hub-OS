import { useState, useEffect } from 'react';
import { Calendar, Clock, Filter, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, getCurrentUser } from '../lib/supabase';
import BookingCard from '../components/booking/BookingCard';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserAndBookings();
  }, [filter]);

  const loadUserAndBookings = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await fetchBookings(currentUser.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchBookings = async (userId: string) => {
    setLoading(true);
    try {
      // Get user's email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      let query = supabase
        .from('bookings')
        .select('*');
      
      // Build OR condition properly
      if (userEmail) {
        query = query.or(`user_id.eq.${userId},guest_email.eq.${userEmail}`);
      } else {
        query = query.eq('user_id', userId);
      }
      
      query = query.order('start_time', { ascending: false });

      // Apply filter
      const now = new Date().toISOString();
      if (filter === 'upcoming') {
        query = query.gte('start_time', now);
      } else if (filter === 'past') {
        query = query.lt('start_time', now);
      }

      const { data: bookingsData, error: bookingsError } = await query;

      if (bookingsError) throw bookingsError;

      // Fetch space details for each booking
      if (bookingsData && bookingsData.length > 0) {
        const spaceIds = [...new Set(bookingsData.map(b => b.space_id))];
        const { data: spacesData, error: spacesError } = await supabase
          .from('spaces')
          .select('id, name, location, hourly_rate')
          .in('id', spaceIds);

        if (spacesError) throw spacesError;

        // Combine bookings with space data
        const bookingsWithSpaces = bookingsData.map(booking => ({
          ...booking,
          spaces: spacesData?.find(space => space.id === booking.space_id) || null
        }));

        setBookings(bookingsWithSpaces);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: bookings.length,
    approved: bookings.filter(b => b.status === 'approved').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    upcoming: bookings.filter(b => 
      b.status === 'approved' && new Date(b.start_time) > new Date()
    ).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back{user?.email ? `, ${user.email}` : ''}! Manage your bookings and account here.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-primary-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.upcoming}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium text-gray-900">My Bookings</h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="text-sm border-gray-300 rounded-md"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <Link
              to="/bookings"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Link>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'upcoming' 
                  ? "You don't have any upcoming bookings."
                  : filter === 'past'
                  ? "You don't have any past bookings."
                  : "You haven't made any bookings yet."}
              </p>
              <div className="mt-6">
                <Link
                  to="/bookings"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Make a Booking
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onUpdate={() => fetchBookings(user?.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
