import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Clock, Download, Trash, Users, Building2, Briefcase, Package, ArrowLeft, BarChart3, AlertTriangle } from 'lucide-react';
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
  borrowing_reference?: string;
  asset?: { name: string };
  asset_id?: string;
  total_price?: number;
  duration_hours?: number;
  start_time?: string;
  end_time?: string;
  purpose?: string;
  borrower_name?: string;
  borrower_office?: string;
  borrower_contact?: string;
  return_condition?: string;
  created_at: string;
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
  gadgetRevenue: number;
  overdueBorrowings: number;
  borrowingsByStatus: { [key: string]: number };
  popularGadgets: { name: string; borrows: number; revenue: number }[];
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
    purposeBreakdown: [],
    gadgetRevenue: 0,
    overdueBorrowings: 0,
    borrowingsByStatus: {},
    popularGadgets: []
  });

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchAnalytics = async (): Promise<void> => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [bookingsRes, spacesRes, attendanceRes, eventsRes, borrowingsRes] = await Promise.all([
        supabase
          .from('hub_bookings')
          .select('*, package:rental_packages(name, hourly_rate)')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase.from('hub_zones').select('id, name, seats'),
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
          .select('*, asset:assets(name)')
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
        []
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
    bookings: any[],
    zones: any[],
    attendance: any[],
    events: any[],
    borrowings: any[],
    proposals: any[]
  ): AnalyticsData => {
    const approvedBookings = bookings.filter(b => b.status === 'approved');

    // Total bookings and revenue
    const totalBookings = bookings.length;
    const totalRevenue = approvedBookings.reduce((sum, booking) => {
      return sum + (booking.total_price || 0);
    }, 0);

    // Average booking duration
    const totalDuration = approvedBookings.reduce((sum, booking) => {
      return sum + (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60);
    }, 0);
    const averageBookingDuration = approvedBookings.length > 0 ? totalDuration / approvedBookings.length : 0;

    // Zone utilization
    const zoneUtilization: { [key: string]: number } = {};
    zones.forEach(zone => {
      const zoneBookings = approvedBookings.filter(b => b.workshop_zones?.includes(zone.id));
      zoneUtilization[zone.name] = zoneBookings.length;
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
      const revenue = booking.total_price || 0;
      revenueByMonth[month] = (revenueByMonth[month] || 0) + revenue;
    });

    // Popular packages (replaces popular spaces)
    const packageStats: { [key: string]: { bookings: number; revenue: number } } = {};
    approvedBookings.forEach(booking => {
      const packageName = booking.package?.name || 'Unknown';
      if (!packageStats[packageName]) {
        packageStats[packageName] = { bookings: 0, revenue: 0 };
      }
      packageStats[packageName].bookings += 1;
      packageStats[packageName].revenue += booking.total_price || 0;
    });

    const popularSpaces = Object.entries(packageStats)
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
    const spacesOccupied = new Set(approvedBookings.map(b => b.workshop_zones).flat()).size;

    // Gadget revenue (returned/active borrowings, mirroring how booking revenue only counts approved)
    const gadgetRevenue = borrowings
      .filter((b: Borrowing) => b.status === 'returned' || b.status === 'active')
      .reduce((sum, b: Borrowing) => sum + (b.total_price || 0), 0);

    // Overdue borrowings: still active but past their end_time
    const overdueBorrowings = borrowings.filter(
      (b: Borrowing) => b.status === 'active' && b.end_time && new Date(b.end_time) < new Date()
    ).length;

    // Borrowing status distribution
    const borrowingsByStatus: { [key: string]: number } = {
      pending: 0,
      approved: 0,
      active: 0,
      returned: 0,
      overdue: 0,
      cancelled: 0
    };
    borrowings.forEach((b: Borrowing) => {
      if (b.status) borrowingsByStatus[b.status] = (borrowingsByStatus[b.status] || 0) + 1;
    });

    // Popular gadgets by borrow count
    const gadgetStats: { [key: string]: { borrows: number; revenue: number } } = {};
    borrowings.forEach((b: Borrowing) => {
      const name = b.asset?.name || 'Unknown';
      if (!gadgetStats[name]) gadgetStats[name] = { borrows: 0, revenue: 0 };
      gadgetStats[name].borrows += 1;
      gadgetStats[name].revenue += b.total_price || 0;
    });
    const popularGadgets = Object.entries(gadgetStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.borrows - a.borrows)
      .slice(0, 5);

    // Organizations breakdown
    const orgCounts: { [key: string]: number } = {};
    [...bookings, ...attendance].forEach((record: any) => {
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
      spaceUtilization: zoneUtilization,
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
      purposeBreakdown,
      gadgetRevenue,
      overdueBorrowings,
      borrowingsByStatus,
      popularGadgets
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

  const exportBorrowings = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('borrowings')
        .select('*, asset:assets(name)')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (error) throw error;

      const csvData = (data || []).map((b: Borrowing) => ({
        'Reference': b.borrowing_reference || '',
        'Gadget': b.asset?.name || '',
        'Borrower Name': b.borrower_name || '',
        'Office/Agency': b.borrower_office || '',
        'Contact': b.borrower_contact || '',
        'Start Time': b.start_time ? new Date(b.start_time).toLocaleString() : '',
        'End Time': b.end_time ? new Date(b.end_time).toLocaleString() : '',
        'Duration (hrs)': b.duration_hours?.toFixed(1) ?? '',
        'Fee': b.total_price?.toFixed(2) ?? '',
        'Status': b.status || '',
        'Purpose': b.purpose || '',
        'Return Condition': b.return_condition || '',
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
      a.download = `borrowings_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Borrowings exported');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const kpiTiles: { label: string; value: string | number; icon: typeof Calendar; badge: string }[] = [
    { label: 'Total Bookings', value: analytics.totalBookings, icon: Calendar, badge: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' },
    { label: 'Total Check-ins', value: analytics.totalCheckins, icon: Users, badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { label: 'Total Revenue', value: `₱${analytics.totalRevenue.toFixed(2)}`, icon: DollarSign, badge: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    { label: 'Avg. Duration', value: `${analytics.averageBookingDuration.toFixed(1)}h`, icon: Clock, badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Total Events', value: analytics.totalEvents, icon: Calendar, badge: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    {
      label: 'Approval Rate',
      value: `${analytics.totalBookings > 0 ? ((analytics.bookingsByStatus.approved / analytics.totalBookings) * 100).toFixed(0) : 0}%`,
      icon: TrendingUp,
      badge: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    },
    { label: 'Spaces Occupied', value: analytics.spacesOccupied, icon: Building2, badge: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
    { label: 'Gadgets Borrowed', value: analytics.gadgetsBorrowed, icon: Package, badge: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
    { label: 'Gadget Revenue', value: `₱${analytics.gadgetRevenue.toFixed(2)}`, icon: DollarSign, badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Overdue Borrows', value: analytics.overdueBorrowings, icon: AlertTriangle, badge: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleDeleteData = async (deleteAll: boolean): Promise<void> => {
    if (!deleteAll && (!deleteStartDate || !deleteEndDate)) {
      toast.error('Please select start and end dates');
      return;
    }

    const confirmMsg = deleteAll
      ? 'Delete ALL analytics data (hub_bookings, attendance, events)? This cannot be undone!'
      : `Delete data from ${deleteStartDate} to ${deleteEndDate}? This cannot be undone!`;

    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const tables = ['hub_bookings', 'hub_attendance', 'events'];

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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Space, event, and gadget performance at a glance</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportBookings}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Bookings
          </button>
          <button
            onClick={exportAttendance}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Attendance
          </button>
          <button
            onClick={exportEvents}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Events
          </button>
          <button
            onClick={exportBorrowings}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Borrowings
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash className="h-3.5 w-3.5 mr-1.5" />
            Clear Data
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {kpiTiles.map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Booking Status Distribution */}
            <ChartCard icon={BarChart3} title="Booking Status Distribution">
              <div className="space-y-3">
                {Object.entries(analytics.bookingsByStatus).map(([status, count]) => (
                  <StatusBar
                    key={status}
                    status={status}
                    count={count}
                    total={analytics.totalBookings}
                    colorClass={
                      status === 'approved' ? 'bg-green-500' :
                      status === 'pending' ? 'bg-yellow-500' :
                      status === 'rejected' ? 'bg-red-500' :
                      'bg-gray-400'
                    }
                  />
                ))}
              </div>
            </ChartCard>

            {/* Popular Spaces */}
            <ChartCard icon={Building2} title="Top 5 Spaces by Revenue">
              <div className="space-y-3">
                {analytics.popularSpaces.map((space, _index) => (
                  <RankedRow
                    key={space.name}
                    rank={_index + 1}
                    label={space.name}
                    sublabel={`${space.bookings} bookings`}
                    value={space.revenue}
                    valueLabel={`₱${space.revenue.toFixed(2)}`}
                    max={Math.max(...analytics.popularSpaces.map((s) => s.revenue), 1)}
                  />
                ))}
                {analytics.popularSpaces.length === 0 && <EmptyNote />}
              </div>
            </ChartCard>
          </div>

          {/* Gadget Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Borrowing Status Distribution */}
            <ChartCard icon={Package} title="Borrowing Status Distribution">
              <div className="space-y-3">
                {Object.entries(analytics.borrowingsByStatus).map(([status, count]) => (
                  <StatusBar
                    key={status}
                    status={status}
                    count={count}
                    total={Object.values(analytics.borrowingsByStatus).reduce((s, c) => s + c, 0)}
                    colorClass={
                      status === 'returned' ? 'bg-green-500' :
                      status === 'active' ? 'bg-blue-500' :
                      status === 'pending' ? 'bg-yellow-500' :
                      status === 'overdue' ? 'bg-red-500' :
                      'bg-gray-400'
                    }
                  />
                ))}
                {Object.values(analytics.borrowingsByStatus).every((c) => c === 0) && <EmptyNote />}
              </div>
            </ChartCard>

            {/* Popular Gadgets */}
            <ChartCard icon={TrendingUp} title="Top 5 Gadgets by Borrows">
              <div className="space-y-3">
                {analytics.popularGadgets.map((gadget, _index) => (
                  <RankedRow
                    key={gadget.name}
                    rank={_index + 1}
                    label={gadget.name}
                    sublabel={`${gadget.borrows} borrows`}
                    value={gadget.borrows}
                    valueLabel={`₱${gadget.revenue.toFixed(2)}`}
                    max={Math.max(...analytics.popularGadgets.map((g) => g.borrows), 1)}
                  />
                ))}
                {analytics.popularGadgets.length === 0 && <EmptyNote />}
              </div>
            </ChartCard>
          </div>

          {/* New Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Organizations Breakdown */}
            <ChartCard icon={Building2} title="Top Organizations">
              <div className="space-y-3">
                {analytics.organizations.slice(0, 5).map((org, _index) => (
                  <RankedRow
                    key={org.name}
                    rank={_index + 1}
                    label={org.name}
                    valueLabel={`${org.visits} visits`}
                    value={org.visits}
                    max={Math.max(...analytics.organizations.slice(0, 5).map((o) => o.visits), 1)}
                  />
                ))}
                {analytics.organizations.length === 0 && <EmptyNote />}
              </div>
            </ChartCard>

            {/* Creative Domains Breakdown */}
            <ChartCard icon={Briefcase} title="Creative Domains">
              <div className="space-y-3">
                {analytics.creativeDomains.slice(0, 5).map((domain, _index) => (
                  <RankedRow
                    key={domain.domain}
                    rank={_index + 1}
                    label={domain.domain}
                    valueLabel={String(domain.count)}
                    value={domain.count}
                    max={Math.max(...analytics.creativeDomains.slice(0, 5).map((d) => d.count), 1)}
                  />
                ))}
                {analytics.creativeDomains.length === 0 && <EmptyNote />}
              </div>
            </ChartCard>

            {/* Purpose Breakdown */}
            <ChartCard icon={Users} title="Purpose of Visit">
              <div className="space-y-3">
                {analytics.purposeBreakdown.slice(0, 5).map((purpose, _index) => (
                  <RankedRow
                    key={purpose.purpose}
                    rank={_index + 1}
                    label={purpose.purpose}
                    valueLabel={String(purpose.count)}
                    value={purpose.count}
                    max={Math.max(...analytics.purposeBreakdown.slice(0, 5).map((p) => p.count), 1)}
                  />
                ))}
                {analytics.purposeBreakdown.length === 0 && <EmptyNote />}
              </div>
            </ChartCard>
          </div>

          {/* Peak Hours - Compact Version at Bottom */}
          <ChartCard icon={Clock} title="Peak Booking Hours">
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
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">{hourLabel}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 relative overflow-hidden">
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
          </ChartCard>
        </>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Analytics Data</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will delete bookings, attendance, and events data. This action cannot be undone!
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delete by Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={deleteStartDate}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                  <input
                    type="date"
                    value={deleteEndDate}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
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

              <div className="border-t dark:border-slate-700 pt-4">
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
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
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

// ============================================================
// Presentational helpers — kept local since they're only ever
// composed inside this dashboard's layout.
// ============================================================

function StatTile({
  label,
  value,
  icon: Icon,
  badge,
}: {
  label: string;
  value: string | number;
  icon: typeof Calendar;
  badge: string;
}): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${badge}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Calendar;
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyNote(): JSX.Element {
  return <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>;
}

/** One row of a status-distribution chart — a thin, rounded, directly-labeled
 *  bar. No separate legend needed since every bar carries its own label. */
function StatusBar({
  status,
  count,
  total,
  colorClass,
}: {
  status: string;
  count: number;
  total: number;
  colorClass: string;
}): JSX.Element {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize text-gray-700 dark:text-gray-300">{status}</span>
        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** One row of a ranked list — magnitude encoded both as a number and as a
 *  thin proportional bar (single sequential hue), so relative size reads at
 *  a glance instead of requiring the reader to compare digits. */
function RankedRow({
  rank,
  label,
  value,
  valueLabel,
  sublabel,
  max,
}: {
  rank: number;
  label: string;
  value: number;
  valueLabel: string;
  sublabel?: string;
  max: number;
}): JSX.Element {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1 gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-5 flex-shrink-0">#{rank}</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">{label}</span>
        </span>
        <span className="text-right flex-shrink-0">
          <span className="font-medium text-gray-900 dark:text-white">{valueLabel}</span>
          {sublabel && <span className="block text-xs text-gray-400 dark:text-gray-500">{sublabel}</span>}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 ml-7">
        <div className="h-1.5 rounded-full bg-primary-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
