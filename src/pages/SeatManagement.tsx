import { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Save, RefreshCw, Armchair, Monitor, Palette, UserCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { HubCapacityConfig, DailyOccupancy, HubZone, HubBooking, RentalPackage } from '../types/hub';

export default function SeatManagement(): JSX.Element {
  const [config, setConfig] = useState<HubCapacityConfig | null>(null);
  const [occupancy, setOccupancy] = useState<DailyOccupancy | null>(null);
  const [zones, setZones] = useState<HubZone[]>([]);
  const [activeBookings, setActiveBookings] = useState<(HubBooking & { package?: RentalPackage })[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [workshopQ2, setWorkshopQ2] = useState(false);
  const [workshopQ4, setWorkshopQ4] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchAll = async (): Promise<void> => {
    setLoading(true);
    try {
      const [configRes, occupancyRes, zonesRes, bookingsRes, attendanceRes] = await Promise.all([
        supabase.from('hub_capacity_config').select('*').limit(1).single(),
        supabase.from('daily_occupancy').select('*').eq('occupancy_date', selectedDate).maybeSingle(),
        supabase.from('hub_zones').select('*').order('name'),
        supabase
          .from('hub_bookings')
          .select('*, package:rental_packages(*)')
          .eq('booking_date', selectedDate)
          .in('status', ['approved', 'active'])
          .order('start_time'),
        supabase
          .from('hub_attendance')
          .select('*')
          .eq('status', 'active')
          .gte('check_in_time', `${selectedDate}T00:00:00`)
          .lte('check_in_time', `${selectedDate}T23:59:59`),
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
        setAdjustment(configRes.data.manual_adjustment);
        setAdjustmentReason(configRes.data.adjustment_reason || '');
      }

      if (occupancyRes.data) {
        setOccupancy(occupancyRes.data);
        setWorkshopQ2(occupancyRes.data.workshop_block_q2);
        setWorkshopQ4(occupancyRes.data.workshop_block_q4);
      } else {
        setOccupancy(null);
        setWorkshopQ2(false);
        setWorkshopQ4(false);
      }

      setZones(zonesRes.data || []);
      setActiveBookings(bookingsRes.data || []);
      setActiveCheckIns((attendanceRes.data || []).length);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load seat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdjustment = async (): Promise<void> => {
    if (!config) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('hub_capacity_config')
        .update({
          manual_adjustment: adjustment,
          adjustment_reason: adjustmentReason || null,
          updated_by: session?.session?.user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Seat adjustment saved');
      fetchAll();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkshopBlock = async (): Promise<void> => {
    setSaving(true);
    try {
      const { error } = await supabase.from('daily_occupancy').upsert(
        {
          occupancy_date: selectedDate,
          total_booked_seats: occupancy?.total_booked_seats ?? 0,
          workshop_block_q2: workshopQ2,
          workshop_block_q4: workshopQ4,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'occupancy_date' }
      );

      if (error) throw error;
      toast.success('Workshop block updated');
      fetchAll();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workshop block';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const totalSeats = config ? config.total_seats + adjustment : 28;
  const bookedSeats = occupancy?.total_booked_seats ?? activeBookings.reduce((s, b) => s + b.seats_used, 0);
  const actualOccupied = Math.max(bookedSeats, activeCheckIns);
  const isFullBlock = workshopQ2 && workshopQ4;
  const availableSeats = isFullBlock ? 0 : Math.max(0, totalSeats - actualOccupied);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/admin" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seat Management</h1>
          </div>
          <p className="mt-1 text-gray-600 ml-8 dark:text-gray-400">Manage hub capacity, workshop blocks, and view active users</p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Viewing Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Status + Zones */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live capacity card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 dark:text-white">
                <Armchair className="h-5 w-5 text-primary-600" />
                Capacity Overview – {format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')}
              </h2>
              {isFullBlock && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Full Hub Blocked
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center dark:bg-blue-900/20">
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalSeats}</p>
                <p className="text-xs text-blue-500 mt-1 dark:text-blue-400">Total Seats</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center dark:bg-orange-900/20">
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{bookedSeats}</p>
                <p className="text-xs text-orange-500 mt-1 dark:text-orange-400">Booked</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${
                availableSeats === 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
              }`}>
                <p className={`text-3xl font-bold ${
                  availableSeats === 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                }`}>
                  {availableSeats}
                </p>
                <p className={`text-xs mt-1 ${
                  availableSeats === 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'
                }`}>
                  Available
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-slate-700">
              <div
                className={`h-3 rounded-full transition-all ${
                  isFullBlock ? 'bg-red-500' : availableSeats <= 5 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.max(2, (availableSeats / Math.max(1, totalSeats)) * 100)}%` }}
              />
            </div>

            {/* Zones */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {zones.filter(z => z.is_bookable).map(zone => {
                const isBlocked =
                  (zone.name === 'q2_tech' && workshopQ2) ||
                  (zone.name === 'q4_creative' && workshopQ4);

                return (
                  <div
                    key={zone.id}
                    className={`rounded-lg border px-4 py-3 ${
                      isBlocked ? 'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20' : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {zone.name === 'q2_tech' ? (
                        <Monitor className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Palette className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{zone.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {zone.seats} seats {isBlocked && <span className="text-red-600 font-medium dark:text-red-400">– Blocked</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Currently In-Hub */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4 dark:text-white">
              <UserCheck className="h-5 w-5 text-green-600" />
              Currently In-Hub ({activeBookings.length} active booking{activeBookings.length !== 1 ? 's' : ''})
            </h2>

            {activeBookings.length === 0 ? (
              <p className="text-gray-500 text-sm dark:text-gray-400">No active bookings for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Package</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Seats</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {activeBookings.map((booking) => (
                      <tr key={booking.id} className="dark:hover:bg-slate-700/50">
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                          {booking.guest_name || 'Registered User'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {booking.package?.name || '—'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{booking.seats_used}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Admin controls */}
        <div className="space-y-6">
          {/* Seat Adjustment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4 dark:text-white">
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              Seat Adjustment
            </h2>
            <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
              Adjust the total available seats (e.g., broken chairs, special projects).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment (+/-)</label>
                <input
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Base: {config?.total_seats ?? 28} → Effective: {(config?.total_seats ?? 28) + adjustment}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., 2 chairs broken"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                />
              </div>

              <button
                onClick={handleSaveAdjustment}
                disabled={saving}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>

          {/* Workshop / Seminar Toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Workshop / Seminar Block
            </h2>
            <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
              Block zones for workshops. Blocking both Q2 and Q4 sets capacity to 0 (Full Hub event).
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer dark:border-slate-700 dark:hover:bg-slate-700/50">
                <input
                  type="checkbox"
                  checked={workshopQ2}
                  onChange={(e) => setWorkshopQ2(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1 dark:text-white">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    Block Q2 – Tech Zone
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">20 seats</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer dark:border-slate-700 dark:hover:bg-slate-700/50">
                <input
                  type="checkbox"
                  checked={workshopQ4}
                  onChange={(e) => setWorkshopQ4(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1 dark:text-white">
                    <Palette className="h-4 w-4 text-purple-500" />
                    Block Q4 – Creative Zone
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">6 seats</span>
                </div>
              </label>

              {workshopQ2 && workshopQ4 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 font-medium dark:text-red-400 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  Full Hub block – all 28 seats will be unavailable
                </div>
              )}

              <button
                onClick={handleSaveWorkshopBlock}
                disabled={saving}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Workshop Block'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
