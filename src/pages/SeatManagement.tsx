import { useState, useEffect } from 'react';
import { Users, Settings, AlertTriangle, Save, RefreshCw, Armchair, Monitor, Palette, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { HubCapacityConfig, DailyOccupancy, HubZone, HubBooking, RentalPackage } from '../types/hub';

export default function SeatManagement() {
  const [config, setConfig] = useState<HubCapacityConfig | null>(null);
  const [occupancy, setOccupancy] = useState<DailyOccupancy | null>(null);
  const [zones, setZones] = useState<HubZone[]>([]);
  const [activeBookings, setActiveBookings] = useState<(HubBooking & { package?: RentalPackage })[]>([]);
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
  }, [selectedDate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [configRes, occupancyRes, zonesRes, bookingsRes] = await Promise.all([
        supabase.from('hub_capacity_config').select('*').limit(1).single(),
        supabase.from('daily_occupancy').select('*').eq('occupancy_date', selectedDate).maybeSingle(),
        supabase.from('hub_zones').select('*').order('name'),
        supabase
          .from('hub_bookings')
          .select('*, package:rental_packages(*)')
          .eq('booking_date', selectedDate)
          .in('status', ['approved', 'active'])
          .order('start_time'),
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
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load seat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdjustment = async () => {
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkshopBlock = async () => {
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to save workshop block');
    } finally {
      setSaving(false);
    }
  };

  const totalSeats = config ? config.total_seats + adjustment : 28;
  const bookedSeats = occupancy?.total_booked_seats ?? activeBookings.reduce((s, b) => s + b.seats_used, 0);
  const isFullBlock = workshopQ2 && workshopQ4;
  const availableSeats = isFullBlock ? 0 : Math.max(0, totalSeats - bookedSeats);

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
          <h1 className="text-3xl font-bold text-gray-900">Seat Management</h1>
          <p className="mt-2 text-gray-600">Manage hub capacity, workshop blocks, and view active users</p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Viewing Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Status + Zones */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live capacity card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Armchair className="h-5 w-5 text-primary-600" />
                Capacity Overview – {format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')}
              </h2>
              {isFullBlock && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Full Hub Blocked
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{totalSeats}</p>
                <p className="text-xs text-blue-500 mt-1">Total Seats</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-orange-700">{bookedSeats}</p>
                <p className="text-xs text-orange-500 mt-1">Booked</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${
                availableSeats === 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <p className={`text-3xl font-bold ${
                  availableSeats === 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {availableSeats}
                </p>
                <p className={`text-xs mt-1 ${
                  availableSeats === 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  Available
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
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
                      isBlocked ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {zone.name === 'q2_tech' ? (
                        <Monitor className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Palette className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900">{zone.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {zone.seats} seats {isBlocked && <span className="text-red-600 font-medium">– Blocked</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Currently In-Hub */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-green-600" />
              Currently In-Hub ({activeBookings.length} active booking{activeBookings.length !== 1 ? 's' : ''})
            </h2>

            {activeBookings.length === 0 ? (
              <p className="text-gray-500 text-sm">No active bookings for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {booking.guest_name || 'Registered User'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {booking.package?.name || '—'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{booking.seats_used}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-gray-600" />
              Seat Adjustment
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Adjust the total available seats (e.g., broken chairs, special projects).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Adjustment (+/-)</label>
                <input
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Base: {config?.total_seats ?? 28} → Effective: {(config?.total_seats ?? 28) + adjustment}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., 2 chairs broken"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Workshop / Seminar Block
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Block zones for workshops. Blocking both Q2 and Q4 sets capacity to 0 (Full Hub event).
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workshopQ2}
                  onChange={(e) => setWorkshopQ2(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    Block Q2 – Tech Zone
                  </span>
                  <span className="text-xs text-gray-500">20 seats</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workshopQ4}
                  onChange={(e) => setWorkshopQ4(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Palette className="h-4 w-4 text-purple-500" />
                    Block Q4 – Creative Zone
                  </span>
                  <span className="text-xs text-gray-500">6 seats</span>
                </div>
              </label>

              {workshopQ2 && workshopQ4 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 font-medium">
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
