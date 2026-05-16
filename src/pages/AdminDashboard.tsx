import { useState, useEffect } from 'react';
import {
  Bell, Filter, RefreshCw, BarChart3, Download, CalendarDays,
  Package, Armchair, Users, UserPlus, Zap, Activity, Clock,
  CheckCircle, X, LogOut, Trash2, Timer, Building2, Check, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminStats from '../components/admin/AdminStats';
import BookingApprovalCard from '../components/admin/BookingApprovalCard';
import toast from 'react-hot-toast';
import { exportToCSV, formatBookingForExport, formatAttendanceForDTIExport } from '../utils/csvExport';
import { format, differenceInMinutes } from 'date-fns';
import { PCIDA_DOMAINS } from '../types/hub';
import type { HubAttendance } from '../types/hub';

// Time elapsed helper
function timeElapsed(from: string): string {
  const mins = differenceInMinutes(new Date(), new Date(from));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function AdminDashboard(): JSX.Element {
  const [bookings, setBookings] = useState<{ id: string; booking_reference: string; guest_name: string | null; guest_email: string | null; guest_phone: string | null; booking_date: string; start_time: string; end_time: string; seats_used: number; total_price: number; status: string; purpose: string | null; notes: string | null; is_workshop: boolean; created_at: string; admin_contacted: boolean; admin_contacted_at: string | null; package?: { id: string; slug: string; name: string; hourly_rate: number | null; daily_rate: number | null; billing_mode: string; seats_consumed: number; is_bundle: boolean } }[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // Live Floor state
  const [attendance, setAttendance] = useState<HubAttendance[]>([]);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [showForceBook, setShowForceBook] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'floor'>('floor');
  const [floorView, setFloorView] = useState<'pending' | 'active' | 'checked_out'>('pending');

  // Manual check-in form
  const [manualForm, setManualForm] = useState({
    mobile: '', name: '', domain: PCIDA_DOMAINS[0] as string, organization: '',
  });

  // Force book form
  const [forceForm, setForceForm] = useState({
    name: '', email: '', phone: '', date: format(new Date(), 'yyyy-MM-dd'),
    start: '09:00', end: '17:00', seats: 1, reason: '',
  });

  useEffect(() => {
    fetchBookings();
    fetchAttendance();

    // Real-time subscriptions
    const subscription = supabase
      .channel('admin-hub-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hub_bookings' }, () => {
        toast('New booking request!', { icon: '🔔', duration: 5000 });
        setHasNewNotifications(true);
        fetchBookings();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hub_bookings' }, () => { fetchBookings(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_attendance' }, () => { fetchAttendance(); })
      .subscribe();

    return () => { subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchBookings = async (): Promise<void> => {
    setLoading(true);
    try {
      let query = supabase
        .from('hub_bookings')
        .select('*, package:rental_packages(id, slug, name, hourly_rate, daily_rate, billing_mode, seats_consumed, is_bundle)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: bookingsData, error } = await query;
      if (error) throw error;
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (): Promise<void> => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('hub_attendance')
        .select('*')
        .gte('check_in_time', `${today}T00:00:00`)
        .order('check_in_time', { ascending: false });
      if (error) throw error;
      setAttendance((data as HubAttendance[]) || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  // ── Secretariat: Confirm Entrance ──────────────────────────────
  const handleConfirmEntrance = async (id: string, name: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('confirm_entrance', { p_attendance_id: id });
      if (error) throw error;
      toast.success(`${name} confirmed on floor!`);
      fetchAttendance();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Confirm failed';
      toast.error(errorMessage);
    }
  };

  // ── Secretariat: Check Out ─────────────────────────────────────
  const handleCheckout = async (id: string, name: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('checkout_user', { p_attendance_id: id });
      if (error) throw error;
      toast.success(`${name} checked out.`);
      fetchAttendance();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      toast.error(errorMessage);
    }
  };

  // ── Clear All Active ───────────────────────────────────────────
  const handleClearAll = async (): Promise<void> => {
    if (!window.confirm('Check out ALL active and pending users? This cannot be undone.')) return;
    try {
      const { data, error } = await supabase.rpc('clear_all_active');
      if (error) throw error;
      toast.success(`${data} user(s) checked out.`);
      fetchAttendance();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Clear all failed';
      toast.error(errorMessage);
    }
  };

  // ── Manual Check-In (walk-in, directly active) ─────────────────
  const handleManualCheckIn = async (): Promise<void> => {
    if (!manualForm.name.trim() || !manualForm.mobile.trim()) {
      toast.error('Name and mobile are required');
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from('hub_attendance').insert({
        mobile_number: manualForm.mobile,
        full_name: manualForm.name,
        creative_domain: manualForm.domain,
        organization: manualForm.organization || null,
        status: 'active',
        confirmed_at: new Date().toISOString(),
        confirmed_by: session?.session?.user?.id || null,
        privacy_consented: true,
        consent_timestamp: new Date().toISOString(),
        is_walk_in: true,
        manually_added_by: session?.session?.user?.id || null,
      });
      if (error) throw error;
      toast.success(`${manualForm.name} checked in!`);
      setManualForm({ mobile: '', name: '', domain: PCIDA_DOMAINS[0], organization: '' });
      setShowManualCheckIn(false);
      fetchAttendance();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Check-in failed';
      toast.error(errorMessage);
    }
  };

  const handleForceBook = async (): Promise<void> => {
    if (!forceForm.name.trim() || !forceForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const startISO = new Date(`${forceForm.date}T${forceForm.start}:00`).toISOString();
      const endISO = new Date(`${forceForm.date}T${forceForm.end}:00`).toISOString();

      const { error } = await supabase.from('hub_bookings').insert({
        user_id: session?.session?.user?.id || null,
        package_id: null,
        guest_name: forceForm.name,
        guest_email: forceForm.email,
        guest_phone: forceForm.phone || null,
        booking_date: forceForm.date,
        start_time: startISO,
        end_time: endISO,
        seats_used: forceForm.seats,
        total_price: 0,
        status: 'approved',
        admin_override: true,
        override_by: session?.session?.user?.id || null,
        override_reason: forceForm.reason || 'Admin force book',
      });
      if (error) throw error;
      toast.success('Force booking created!');
      setForceForm({ name: '', email: '', phone: '', date: format(new Date(), 'yyyy-MM-dd'), start: '09:00', end: '17:00', seats: 1, reason: '' });
      setShowForceBook(false);
      fetchBookings();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Force book failed';
      toast.error(errorMessage);
    }
  };

  const handleRefresh = (): void => {
    setHasNewNotifications(false);
    fetchBookings();
    fetchAttendance();
  };

  const handleExportBookings = (): void => {
    const exportData = bookings.map(booking => formatBookingForExport(booking));
    const filename = `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCSV(exportData, filename);
    toast.success('Bookings exported successfully!');
  };

  const handleExportDTI = (): void => {
    if (attendance.length === 0) {
      toast.error('No attendance data to export');
      return;
    }
    const exportData = attendance.map(a => formatAttendanceForDTIExport(a as unknown as Record<string, unknown>));
    const filename = `DTI_SSF_Attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCSV(exportData, filename);
    toast.success('DTI attendance exported!');
  };

  // ── Derived counts ──
  const pending = attendance.filter(a => a.status === 'pending_entrance');
  const active = attendance.filter(a => a.status === 'active');
  const checkedOut = attendance.filter(a => a.status === 'checked_out');

  const todayBookedSeats = bookings
    .filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd') && ['approved', 'active'].includes(b.status))
    .reduce((sum: number, b: { seats_used: number }) => sum + (b.seats_used || 0), 0);

  const floorList = floorView === 'pending' ? pending : floorView === 'active' ? active : checkedOut;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">Secretariat Gatekeeper &amp; Booking Management</p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {hasNewNotifications && (
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-600 animate-bounce" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </div>
            )}
            <button onClick={handleRefresh} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Management Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Link to="/admin/spaces" className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
          <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors mb-3">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <span className="text-sm font-bold text-gray-700">Spaces</span>
        </Link>
        <Link to="/admin/events" className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
          <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors mb-3">
            <CalendarDays className="h-6 w-6 text-purple-600" />
          </div>
          <span className="text-sm font-bold text-gray-700">Events</span>
        </Link>
        <Link to="/admin/seats" className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
          <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors mb-3">
            <Armchair className="h-6 w-6 text-emerald-600" />
          </div>
          <span className="text-sm font-bold text-gray-700">Seats</span>
        </Link>
        <Link to="/admin/gadgets" className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
          <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors mb-3">
            <Package className="h-6 w-6 text-amber-600" />
          </div>
          <span className="text-sm font-bold text-gray-700">Gadgets</span>
        </Link>
        <Link to="/admin/analytics" className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
          <div className="p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors mb-3">
            <BarChart3 className="h-6 w-6 text-rose-600" />
          </div>
          <span className="text-sm font-bold text-gray-700">Analytics</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <AdminStats />
      </div>

      {/* ── Capacity & Floor Summary Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Capacity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-500">Today's Seats</span>
            <Users className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold ${todayBookedSeats >= 28 ? 'text-red-600' : 'text-gray-900'}`}>
              {todayBookedSeats}
            </span>
            <span className="text-lg text-gray-400">/ 28</span>
          </div>
          {todayBookedSeats >= 28 && (
            <p className="text-xs text-red-500 mt-1 font-medium">Capacity reached — Override available</p>
          )}
        </div>

        {/* Active on Floor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-500">Active on Floor</span>
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="text-3xl font-extrabold text-gray-900">{active.length}</span>
          <p className="text-xs text-gray-400 mt-1">DTI logging — no limit</p>
        </div>

        {/* Pending Entrance */}
        <div className={`rounded-2xl shadow-sm border p-5 ${pending.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-500">Pending Entrance</span>
            <Clock className={`h-5 w-5 ${pending.length > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <span className={`text-3xl font-extrabold ${pending.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{pending.length}</span>
          {pending.length > 0 && (
            <p className="text-xs text-amber-600 mt-1 font-medium">Awaiting your confirmation</p>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowManualCheckIn(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-200 transition-all"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Manual Check-In
        </button>
        <button
          onClick={() => setShowForceBook(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-md shadow-red-200 transition-all"
        >
          <Zap className="h-4 w-4 mr-2" />
          Force Book (Override)
        </button>
        <button
          onClick={handleClearAll}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-red-200 hover:bg-red-50 shadow-sm transition-all"
        >
          <Trash2 className="h-4 w-4 mr-2 text-red-400" />
          Clear All
        </button>
        <button
          onClick={handleExportDTI}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-all"
        >
          <Download className="h-4 w-4 mr-2" />
          DTI Export
        </button>
        <button
          onClick={handleExportBookings}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-all"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Bookings
        </button>
      </div>

      {/* ── Main Tab Switcher ── */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('floor')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'floor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Activity className="h-4 w-4 inline mr-1.5" />
          Live Floor ({active.length + pending.length})
          {pending.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{pending.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'bookings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CalendarDays className="h-4 w-4 inline mr-1.5" />Bookings ({bookings.length})
        </button>
      </div>

      {/* ═══ LIVE FLOOR TAB ═══ */}
      {activeTab === 'floor' && (
        <>
          {/* Floor sub-tabs */}
          <div className="flex gap-2 mb-4">
            {([
              { key: 'pending' as const, label: 'Pending', count: pending.length, color: 'amber' },
              { key: 'active' as const, label: 'Active', count: active.length, color: 'emerald' },
              { key: 'checked_out' as const, label: 'Checked Out', count: checkedOut.length, color: 'gray' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFloorView(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  floorView === tab.key
                    ? `bg-${tab.color}-100 text-${tab.color}-700 ring-1 ring-${tab.color}-300`
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Floor list */}
          <div className="space-y-3">
            {floorList.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {floorView === 'pending' ? 'No one waiting for entrance' : floorView === 'active' ? 'No active users on floor' : 'No checkouts today'}
                </p>
              </div>
            ) : (
              floorList.map((a) => (
                <div key={a.id} className={`rounded-xl border p-4 flex items-center gap-4 transition-shadow hover:shadow-sm ${
                  a.status === 'pending_entrance' ? 'bg-amber-50 border-amber-200' : a.status === 'active' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'
                }`}>
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                    a.status === 'pending_entrance' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-violet-500 to-indigo-600'
                  }`}>
                    {a.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{a.full_name}</span>
                      {a.is_walk_in && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Walk-in</span>
                      )}
                      {a.status === 'active' && a.confirmed_at && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                          <Timer className="h-2.5 w-2.5" />
                          {timeElapsed(a.confirmed_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{a.creative_domain}</span>
                      {a.organization && <span>&bull; {a.organization}</span>}
                    </div>
                  </div>

                  {/* Time + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right mr-1">
                      <div className="text-xs text-gray-400">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {format(new Date(a.check_in_time), 'h:mm a')}
                      </div>
                      <div className="text-[10px] text-gray-300 font-mono">{a.mobile_number}</div>
                    </div>

                    {a.status === 'pending_entrance' && (
                      <button
                        onClick={() => handleConfirmEntrance(a.id, a.full_name)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all active:scale-95"
                      >
                        <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                        Confirm
                      </button>
                    )}

                    {a.status === 'active' && (
                      <button
                        onClick={() => handleCheckout(a.id, a.full_name)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all active:scale-95"
                      >
                        <LogOut className="h-3.5 w-3.5 inline mr-1" />
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ═══ BOOKINGS TAB ═══ */}
      {activeTab === 'bookings' && (
        <>
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
        </>
      )}

      {/* ═══ MANUAL CHECK-IN MODAL ═══ */}
      {showManualCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Manual Check-In</h2>
                <p className="text-xs text-gray-500">Walk-in — skips kiosk, directly active</p>
              </div>
              <button onClick={() => setShowManualCheckIn(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Mobile *</label>
                <input type="tel" inputMode="numeric" value={manualForm.mobile} onChange={e => setManualForm(p => ({ ...p, mobile: e.target.value }))} placeholder="09171234567" className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Full Name *</label>
                <input type="text" value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} placeholder="Juan Dela Cruz" className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Creative Domain</label>
                <select value={manualForm.domain} onChange={e => setManualForm(p => ({ ...p, domain: e.target.value }))} className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  {PCIDA_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Organization</label>
                <input type="text" value={manualForm.organization} onChange={e => setManualForm(p => ({ ...p, organization: e.target.value }))} placeholder="Optional" className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <button onClick={handleManualCheckIn} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all">
                <UserPlus className="h-4 w-4 inline mr-2" />
                Check In Walk-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORCE BOOK MODAL ═══ */}
      {showForceBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Force Book</h2>
                <p className="text-xs text-red-500 font-medium">Ignores 28-seat capacity limit</p>
              </div>
              <button onClick={() => setShowForceBook(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Name *</label>
                <input type="text" value={forceForm.name} onChange={e => setForceForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Email *</label>
                <input type="email" value={forceForm.email} onChange={e => setForceForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Date</label>
                  <input type="date" value={forceForm.date} onChange={e => setForceForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-xl border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Seats</label>
                  <input type="number" min={1} max={28} value={forceForm.seats} onChange={e => setForceForm(p => ({ ...p, seats: parseInt(e.target.value) || 1 }))} className="w-full rounded-xl border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Start</label>
                  <input type="time" value={forceForm.start} onChange={e => setForceForm(p => ({ ...p, start: e.target.value }))} className="w-full rounded-xl border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">End</label>
                  <input type="time" value={forceForm.end} onChange={e => setForceForm(p => ({ ...p, end: e.target.value }))} className="w-full rounded-xl border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Override Reason</label>
                <input type="text" value={forceForm.reason} onChange={e => setForceForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. VIP guest, special event" className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
              </div>
              <button onClick={handleForceBook} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-md transition-all">
                <Zap className="h-4 w-4 inline mr-2" />
                Force Approve Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
