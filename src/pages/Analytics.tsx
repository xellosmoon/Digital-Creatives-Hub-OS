import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Clock, Download, Trash, Users, Building2, Briefcase, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  space_id?: string;
  space?: { name: string; hourly_rate: number };
  booking_reference?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  organization?: string;
  purpose?: string;
  attendees?: number;
  created_at: string;
  [key: string]: unknown;
}

interface Space {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface Attendance {
  id: string;
  organization?: string;
  guest_organization?: string;
  pcida_domain?: string;
  creative_domain?: string;
  purpose?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  entrance_time?: string;
  exit_time?: string;
  status?: string;
  created_at: string;
  [key: string]: unknown;
}

interface Event {
  id: string;
  title?: string;
  organizer_name?: string;
  organizer_email?: string;
  start_time: string;
  end_time: string;
  status?: string;
  is_featured?: boolean;
  registration_link?: string;
  created_at: string;
  [key: string]: unknown;
}

interface Borrowing {
  id: string;
  status?: string;
  [key: string]: unknown;
}

interface Proposal {
  id: string;
  creative_domains?: string[];
  [key: string]: unknown;
}

interface RecordWithOrg {
  organization?: string;
  guest_organization?: string;
  [key: string]: unknown;
}

interface RecordWithPurpose {
  purpose?: string;
  [key: string]: unknown;
}

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  averageBookingDuration: number;
  spaceUtilization: { [key: string]: number };
  bookingsByStatus: { [key: string]: number };
  revenueByMonth: { month: string; revenue: number }[];
  popularSpaces: { name: string; bookings: number; revenue: number }[];
  peakHours: { hour: number; bookings: number }[];
  totalCheckins: number;
  totalEvents: number;
  gadgetsBorrowed: number;
  spacesOccupied: number;
  organizations: { name: string; visits: number }[];
  creativeDomains: { domain: string; count: number }[];
  purposeBreakdown: { purpose: string; count: number }[];
}

export default function Analytics(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [dateRange] = useState({
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
    peakHours: [],
    totalCheckins: 0,
    totalEvents: 0,
    gadgetsBorrowed: 0,
    spacesOccupied: 0,
    organizations: [],
    creativeDomains: [],
    purposeBreakdown: []
  });

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchAnalytics = async (): Promise<void> => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [bookingsRes, spacesRes, attendanceRes, eventsRes, borrowingsRes, proposalsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, space:spaces(name, hourly_rate)')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase.from('spaces').select('id, name'),
        supabase
          .from('hub_attendance')
          .select('*')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('events')
          .select('*')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('borrowings')
          .select('*')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('hub_events')
          .select('*')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (spacesRes.error) throw spacesRes.error;

      // Process analytics with all data
      const analyticsData = processAnalytics(
        bookingsRes.data || [],
        spacesRes.data || [],
        attendanceRes.data || [],
        eventsRes.data || [],
        borrowingsRes.data || [],
        proposalsRes.data || []
      );
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (
    bookings: Booking[],
    spaces: Space[],
    attendance: Attendance[],
    events: Event[],
    borrowings: Borrowing[],
    proposals: Proposal[]
  ): AnalyticsData => {
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

    // New stats
    const totalCheckins = attendance.length;
    const totalEvents = events.length;
    const gadgetsBorrowed = borrowings.filter(b => b.status === 'returned' || b.status === 'active').length;
    const spacesOccupied = new Set(approvedBookings.map(b => b.space_id)).size;

    // Organizations breakdown
    const orgCounts: { [key: string]: number } = {};
    [...bookings, ...attendance].forEach((record: RecordWithOrg) => {
      const org = record.organization || record.guest_organization;
      if (org && org.trim()) {
        orgCounts[org] = (orgCounts[org] || 0) + 1;
      }
    });
    const organizations = Object.entries(orgCounts)
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    // Creative domains breakdown (from proposals and attendance)
    const domainCounts: { [key: string]: number } = {};
    proposals.forEach((p: Proposal) => {
      if (Array.isArray(p.creative_domains)) {
        p.creative_domains.forEach((d: string) => {
          domainCounts[d] = (domainCounts[d] || 0) + 1;
        });
      }
    });
    attendance.forEach((a: Attendance) => {
      const domain = a.pcida_domain || a.creative_domain;
      if (domain && domain.trim()) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });
    const creativeDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    // Purpose breakdown
    const purposeCounts: { [key: string]: number } = {};
    [...bookings, ...attendance].forEach((record: RecordWithPurpose) => {
      const purpose = record.purpose;
      if (purpose && purpose.trim()) {
        purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1;
      }
    });
    const purposeBreakdown = Object.entries(purposeCounts)
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalBookings,
      totalRevenue,
      averageBookingDuration,
      spaceUtilization,
      bookingsByStatus,
      revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue })),
      popularSpaces,
      peakHours,
      totalCheckins,
      totalEvents,
      gadgetsBorrowed,
      spacesOccupied,
      organizations,
      creativeDomains,
      purposeBreakdown
    };
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleting, setDeleting] = useState(false);

  const exportBookings = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (error) throw error;
      
      const csvData = (data || []).map(b => ({
        'Reference': b.booking_reference,
        'Guest Name': b.guest_name || '',
        'Email': b.guest_email || '',
        'Phone': b.guest_phone || '',
        'Organization': b.organization || '',
        'Start Time': new Date(b.start_time).toLocaleString(),
        'End Time': new Date(b.end_time).toLocaleString(),
        'Status': b.status,
        'Purpose': b.purpose || '',
        'Attendees': b.attendees || 0,
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] ?? ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Bookings exported');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const exportAttendance = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('hub_attendance')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (error) throw error;
      
      const csvData = (data || []).map(a => ({
        'Name': a.guest_name || '',
        'Email': a.guest_email || '',
        'Phone': a.guest_phone || '',
        'Organization': a.guest_organization || '',
        'PCIDA Domain': a.pcida_domain || '',
        'Purpose': a.purpose || '',
        'Check-in Time': new Date(a.entrance_time || a.created_at).toLocaleString(),
        'Check-out Time': a.exit_time ? new Date(a.exit_time).toLocaleString() : '',
        'Status': a.status,
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] ?? ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attendance exported');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const exportEvents = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (error) throw error;
      
      const csvData = (data || []).map(e => ({
        'Title': e.title,
        'Organizer': e.organizer_name || '',
        'Email': e.organizer_email || '',
        'Start Time': new Date(e.start_time).toLocaleString(),
        'End Time': new Date(e.end_time).toLocaleString(),
        'Status': e.status,
        'Featured': e.is_featured ? 'Yes' : 'No',
        'Registration Link': e.registration_link || '',
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] ?? ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Events exported');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleDeleteData = async (deleteAll: boolean): Promise<void> => {
    if (!deleteAll && (!deleteStartDate || !deleteEndDate)) {
      toast.error('Please select start and end dates');
      return;
    }

    const confirmMsg = deleteAll 
      ? 'Delete ALL analytics data (bookings, attendance, events)? This cannot be undone!'
      : `Delete data from ${deleteStartDate} to ${deleteEndDate}? This cannot be undone!`;
    
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const tables = ['bookings', 'hub_attendance', 'events'];
      
      for (const table of tables) {
        let query = supabase.from(table).delete();
        
        if (!deleteAll) {
          query = query
            .gte('created_at', new Date(deleteStartDate).toISOString())
            .lte('created_at', new Date(deleteEndDate + 'T23:59:59').toISOString());
        } else {
          query = query.neq('id', '00000000-0000-0000-0000-000000000000');
        }

        const { error } = await query;
        if (error) throw error;
      }

      toast.success(deleteAll ? 'All data deleted' : 'Data deleted');
      setShowDeleteModal(false);
      setDeleteStartDate('');
      setDeleteEndDate('');
      fetchAnalytics();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            <p className="mt-1 text-gray-600 ml-8">Track space utilization and revenue metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportBookings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Bookings
            </button>
            <button
              onClick={exportAttendance}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Attendance
            </button>
            <button
              onClick={exportEvents}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Events
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50"
            >
              <Trash className="h-4 w-4 mr-2" />
              Clear Data
            </button>
          </div>
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
                  <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.totalCheckins}</p>
                </div>
                <Users className="h-8 w-8 text-indigo-500" />
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
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.totalEvents}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gadgets Borrowed</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.gadgetsBorrowed}</p>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Spaces Occupied</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.spacesOccupied}</p>
                </div>
                <Building2 className="h-8 w-8 text-cyan-500" />
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
                {analytics.popularSpaces.map((space, _index) => (
                  <div key={space.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">#{_index + 1}</span>
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

          {/* New Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Organizations Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                Top Organizations
              </h3>
              <div className="space-y-2">
                {analytics.organizations.slice(0, 5).map((org, _index) => (
                  <div key={org.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 mr-2">#{_index + 1}</span>
                      <span className="text-sm text-gray-700">{org.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{org.visits} visits</span>
                  </div>
                ))}
                {analytics.organizations.length === 0 && (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>

            {/* Creative Domains Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gray-600" />
                Creative Domains
              </h3>
              <div className="space-y-2">
                {analytics.creativeDomains.slice(0, 5).map((domain, _index) => (
                <div key={domain.domain} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{domain.domain}</span>
                  <span className="text-sm font-medium text-gray-900">{domain.count}</span>
                </div>
              ))}
                {analytics.creativeDomains.length === 0 && (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>

            {/* Purpose Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                Purpose of Visit
              </h3>
              <div className="space-y-2">
                {analytics.purposeBreakdown.slice(0, 5).map((purpose, _index) => (
                <div key={purpose.purpose} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{purpose.purpose}</span>
                  <span className="text-sm font-medium text-gray-900">{purpose.count}</span>
                </div>
              ))}
                {analytics.purposeBreakdown.length === 0 && (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Peak Hours - Compact Version at Bottom */}
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Peak Booking Hours</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
              {Array.from({ length: 24 }, (_, i) => {
                const hourData = analytics.peakHours.find(h => h.hour === i);
                const bookings = hourData?.bookings || 0;
                const maxBookings = Math.max(...analytics.peakHours.map(h => h.bookings), 1);
                const widthPercent = maxBookings > 0 ? (bookings / maxBookings) * 100 : 0;
                
                // Format hour display
                let hourLabel = '';
                if (i === 0) hourLabel = '12 MN';
                else if (i === 12) hourLabel = '12 NN';
                else if (i < 12) hourLabel = `${i} AM`;
                else hourLabel = `${i - 12} PM`;
                
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 w-12 text-right">{hourLabel}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {bookings > 0 && (
                          <span className="text-xs font-semibold text-white">{bookings}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Analytics Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will delete bookings, attendance, and events data. This action cannot be undone!
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delete by Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={deleteStartDate}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                  <input
                    type="date"
                    value={deleteEndDate}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
                <button
                  onClick={() => handleDeleteData(false)}
                  disabled={deleting || !deleteStartDate || !deleteEndDate}
                  className="mt-2 w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {deleting ? 'Deleting...' : 'Delete by Date Range'}
                </button>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={() => handleDeleteData(true)}
                  disabled={deleting}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {deleting ? 'Deleting...' : 'Delete ALL Data'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteStartDate('');
                  setDeleteEndDate('');
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
