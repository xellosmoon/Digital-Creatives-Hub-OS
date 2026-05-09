import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Clock, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { exportToCSV, formatAnalyticsForExport } from '../utils/csvExport';

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  averageBookingDuration: number;
  spaceUtilization: { [key: string]: number };
  bookingsByStatus: { [key: string]: number };
  revenueByMonth: { month: string; revenue: number }[];
  popularSpaces: { name: string; bookings: number; revenue: number }[];
  peakHours: { hour: number; bookings: number }[];
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 2)),
    end: endOfMonth(new Date())
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalBookings: 0,
    totalRevenue: 0,
    averageBookingDuration: 0,
    spaceUtilization: {},
    bookingsByStatus: {},
    revenueByMonth: [],
    popularSpaces: [],
    peakHours: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch bookings with space data
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          space:spaces(name, hourly_rate)
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (bookingsError) throw bookingsError;

      // Fetch all spaces for utilization calculation
      const { data: spaces, error: spacesError } = await supabase
        .from('spaces')
        .select('id, name');

      if (spacesError) throw spacesError;

      // Process analytics
      const analyticsData = processAnalytics(bookings || [], spaces || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (bookings: any[], spaces: any[]): AnalyticsData => {
    const approvedBookings = bookings.filter(b => b.status === 'approved');
    
    // Total bookings and revenue
    const totalBookings = bookings.length;
    const totalRevenue = approvedBookings.reduce((sum, booking) => {
      const duration = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
      return sum + (duration * booking.space.hourly_rate);
    }, 0);

    // Average booking duration
    const totalDuration = approvedBookings.reduce((sum, booking) => {
      return sum + (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
    }, 0);
    const averageBookingDuration = approvedBookings.length > 0 ? totalDuration / approvedBookings.length : 0;

    // Space utilization
    const spaceUtilization: { [key: string]: number } = {};
    spaces.forEach(space => {
      const spaceBookings = approvedBookings.filter(b => b.space_id === space.id);
      spaceUtilization[space.name] = spaceBookings.length;
    });

    // Bookings by status
    const bookingsByStatus: { [key: string]: number } = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0
    };
    bookings.forEach(booking => {
      bookingsByStatus[booking.status] = (bookingsByStatus[booking.status] || 0) + 1;
    });

    // Revenue by month
    const revenueByMonth: { [key: string]: number } = {};
    approvedBookings.forEach(booking => {
      const month = format(new Date(booking.created_at), 'MMM yyyy');
      const duration = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
      const revenue = duration * booking.space.hourly_rate;
      revenueByMonth[month] = (revenueByMonth[month] || 0) + revenue;
    });

    // Popular spaces
    const spaceStats: { [key: string]: { bookings: number; revenue: number } } = {};
    approvedBookings.forEach(booking => {
      const spaceName = booking.space.name;
      if (!spaceStats[spaceName]) {
        spaceStats[spaceName] = { bookings: 0, revenue: 0 };
      }
      spaceStats[spaceName].bookings += 1;
      const duration = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
      spaceStats[spaceName].revenue += duration * booking.space.hourly_rate;
    });

    const popularSpaces = Object.entries(spaceStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Peak hours
    const hourCounts: { [key: number]: number } = {};
    approvedBookings.forEach(booking => {
      const startHour = new Date(booking.start_time).getHours();
      hourCounts[startHour] = (hourCounts[startHour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, bookings]) => ({ hour: parseInt(hour), bookings }))
      .sort((a, b) => a.hour - b.hour);

    return {
      totalBookings,
      totalRevenue,
      averageBookingDuration,
      spaceUtilization,
      bookingsByStatus,
      revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue })),
      popularSpaces,
      peakHours
    };
  };

  const handleExportToCSV = () => {
    const exportData = formatAnalyticsForExport(analytics);
    const filename = `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCSV(exportData, filename);
    toast.success('Analytics exported successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600">Track space utilization and revenue metrics</p>
          </div>
          <button
            onClick={handleExportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.totalBookings}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">₱{analytics.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.averageBookingDuration.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.totalBookings > 0 
                      ? ((analytics.bookingsByStatus.approved / analytics.totalBookings) * 100).toFixed(0)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Booking Status Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analytics.bookingsByStatus).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{status}</span>
                      <span>{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          status === 'approved' ? 'bg-green-500' :
                          status === 'pending' ? 'bg-yellow-500' :
                          status === 'rejected' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${analytics.totalBookings > 0 ? (count / analytics.totalBookings) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Spaces */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 Spaces by Revenue</h3>
              <div className="space-y-3">
                {analytics.popularSpaces.map((space, index) => (
                  <div key={space.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">#{index + 1}</span>
                      <span className="text-sm text-gray-700">{space.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">₱{space.revenue.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{space.bookings} bookings</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Peak Booking Hours</h3>
            <div className="grid grid-cols-24 gap-1">
              {Array.from({ length: 24 }, (_, i) => {
                const hourData = analytics.peakHours.find(h => h.hour === i);
                const bookings = hourData?.bookings || 0;
                const maxBookings = Math.max(...analytics.peakHours.map(h => h.bookings), 1);
                const height = (bookings / maxBookings) * 100;
                
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-full bg-gray-200 rounded-t" style={{ height: '100px' }}>
                      <div
                        className="w-full bg-primary-500 rounded-t transition-all duration-300"
                        style={{ height: `${height}%`, marginTop: `${100 - height}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 mt-1">{i}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
