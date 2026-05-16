import { useState, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isAfter, startOfDay, eachDayOfInterval,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Users, Wrench, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEvents } from '../../lib/useEvents';
import type { CalendarEvent } from '../../types';
import type { HubBooking, DailyOccupancy, HubCapacityConfig } from '../../types/hub';
import QuickBookingModal from './QuickBookingModal';
import EventDetailsModal from './EventDetailsModal';
import EventChip from './EventChip';

// ── Hub booking with only the joined package columns we SELECT ──────
interface CalendarHubBooking extends Omit<HubBooking, 'package'> {
  package?: { slug: string; name: string; is_bundle: boolean };
}

// ── Aggregated day-level summary ───────────────────────────────────
interface DaySummary {
  totalSeats: number;       // from config
  bookedSeats: number;      // from daily_occupancy or sum of hub_bookings
  workshopQ2: boolean;
  workshopQ4: boolean;
  coworkingCount: number;   // # of individual coworking bookings
  bundleBookings: CalendarHubBooking[];
  workshopBookings: CalendarHubBooking[];
}

export default function PublicCalendar(): JSX.Element {
  // ── State ────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hubBookings, setHubBookings] = useState<CalendarHubBooking[]>([]);
  const [occupancyMap, setOccupancyMap] = useState<Record<string, DailyOccupancy>>({});
  const [totalSeats, setTotalSeats] = useState(28);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Events from the dedicated `events` table
  const { events, loading: eventsLoading } = useEvents(currentDate);

  const loading = bookingsLoading || eventsLoading;

  // ── Fetch hub bookings + occupancy + capacity config ─────────────
  useEffect(() => {
    fetchHubData();

    // Real-time: refresh when hub_bookings or daily_occupancy change
    const sub = supabase
      .channel('calendar-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_bookings' }, () => fetchHubData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_occupancy' }, () => fetchHubData())
      .subscribe();

    return () => { sub.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchHubData = async (): Promise<void> => {
    setBookingsLoading(true);
    try {
      const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      // Parallel: bookings, occupancy rows, capacity config
      const [bookingsRes, occRes, configRes] = await Promise.all([
        supabase
          .from('hub_bookings')
          .select('*, package:rental_packages(slug, name, is_bundle)')
          .in('status', ['approved', 'active'])
          .gte('booking_date', monthStart)
          .lte('booking_date', monthEnd)
          .order('start_time', { ascending: true }),
        supabase
          .from('daily_occupancy')
          .select('*')
          .gte('occupancy_date', monthStart)
          .lte('occupancy_date', monthEnd),
        supabase
          .from('hub_capacity_config')
          .select('*')
          .limit(1)
          .single(),
      ]);

      setHubBookings((bookingsRes.data as CalendarHubBooking[]) ?? []);

      // Index occupancy by date string for fast lookup
      const occMap: Record<string, DailyOccupancy> = {};
      for (const row of (occRes.data ?? []) as DailyOccupancy[]) {
        occMap[row.occupancy_date] = row;
      }
      setOccupancyMap(occMap);

      const config = configRes.data as HubCapacityConfig | null;
      setTotalSeats((config?.total_seats ?? 28) + (config?.manual_adjustment ?? 0));
    } catch (err) {
      console.error('Error fetching hub data:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // ── Day-level helpers ────────────────────────────────────────────
  const getDaysInMonth = (): Date[] => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDay = (date: Date): CalendarEvent[] =>
    events.filter(ev => isSameDay(new Date(ev.start_time), date));

  /** Build an aggregated summary for a single day. */
  const getDaySummary = (date: Date): DaySummary => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const occ = occupancyMap[dateStr];
    const dayBookings = hubBookings.filter(b => b.booking_date === dateStr);

    // Separate coworking (non-bundle, non-workshop) from bundles & workshops
    const coworkingCount = dayBookings.filter(
      b => !b.is_workshop && !b.package?.is_bundle
    ).length;
    const bundleBookings = dayBookings.filter(
      b => !b.is_workshop && b.package?.is_bundle
    );
    const workshopBookings = dayBookings.filter(b => b.is_workshop);

    return {
      totalSeats,
      bookedSeats: occ?.total_booked_seats ?? dayBookings.reduce((s, b) => s + b.seats_used, 0),
      workshopQ2: occ?.workshop_block_q2 ?? false,
      workshopQ4: occ?.workshop_block_q4 ?? false,
      coworkingCount,
      bundleBookings,
      workshopBookings,
    };
  };

  // ── Month navigation ─────────────────────────────────────────────
  const navigateMonth = (direction: 'prev' | 'next'): void => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // ── Event chip click → open Event Details modal ──────────────────
  const handleEventClick = (ev: CalendarEvent): void => {
    setSelectedEvent(ev);
    setShowEventModal(true);
  };

  // ── Occupancy bar color helper ───────────────────────────────────
  const occBarColor = (pct: number, isFullBlock: boolean): string => {
    if (isFullBlock) return 'bg-red-400';
    if (pct >= 90) return 'bg-red-400';
    if (pct >= 60) return 'bg-orange-400';
    if (pct >= 30) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  // ── JSX ──────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2">
            <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-gray-100 rounded-md">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 hover:bg-gray-100 rounded-md text-sm font-medium">
              Today
            </button>
            <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-gray-100 rounded-md">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-sm font-medium text-gray-700 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {getDaysInMonth().map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const summary   = getDaySummary(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday    = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isFuture   = isAfter(startOfDay(day), startOfDay(new Date())) || isToday;

                const occPct = summary.totalSeats > 0
                  ? Math.round((summary.bookedSeats / summary.totalSeats) * 100)
                  : 0;
                const isFullBlock = summary.workshopQ2 && summary.workshopQ4;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isFuture) {
                        setSelectedDate(day);
                        setShowBookingModal(true);
                      }
                    }}
                    className={`
                      bg-white p-2 min-h-[110px] relative group
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isToday ? 'bg-primary-50' : ''}
                      ${isSelected ? 'ring-2 ring-primary-500' : ''}
                      ${isFuture ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-60'}
                    `}
                  >
                    {/* Day number + add icon */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{format(day, 'd')}</span>
                      {isFuture && (
                        <Plus className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    {/* ── Occupancy mini-bar ── */}
                    {isCurrentMonth && (summary.bookedSeats > 0 || isFullBlock) && (
                      <div className="mb-1">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`${occBarColor(occPct, isFullBlock)} h-1.5 rounded-full transition-all`}
                            style={{ width: `${isFullBlock ? 100 : Math.min(occPct, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-500">
                            {isFullBlock ? 'Full hub blocked' : `${summary.bookedSeats}/${summary.totalSeats}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Day content */}
                    <div className="space-y-0.5">
                      {/* ── Event chips (clickable individually) ── */}
                      {dayEvents.slice(0, 2).map(ev => (
                        <EventChip key={ev.id} event={ev} onClick={handleEventClick} />
                      ))}

                      {/* ── Workshop blocks ── */}
                      {summary.workshopBookings.slice(0, 1).map(wb => (
                        <div key={wb.id} className="px-1 py-0.5 rounded text-[10px] truncate bg-red-100 text-red-800 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          Workshop
                        </div>
                      ))}

                      {/* ── Grouped coworking count ── */}
                      {summary.coworkingCount > 0 && (
                        <div className="px-1 py-0.5 rounded text-[10px] truncate bg-primary-100 text-primary-800">
                          <Users className="inline w-3 h-3 mr-0.5" />
                          {summary.coworkingCount} coworker{summary.coworkingCount > 1 ? 's' : ''}
                        </div>
                      )}

                      {/* ── Bundle bookings ── */}
                      {summary.bundleBookings.slice(0, 1).map(bb => (
                        <div key={bb.id} className="px-1 py-0.5 rounded text-[10px] truncate bg-purple-100 text-purple-800 flex items-center gap-0.5">
                          <Wrench className="w-3 h-3 flex-shrink-0" />
                          {bb.package?.name ?? 'Bundle'}
                        </div>
                      ))}

                      {/* Overflow */}
                      {(() => {
                        const shown = dayEvents.slice(0, 2).length
                          + Math.min(summary.workshopBookings.length, 1)
                          + (summary.coworkingCount > 0 ? 1 : 0)
                          + Math.min(summary.bundleBookings.length, 1);
                        const total = dayEvents.length
                          + summary.workshopBookings.length
                          + (summary.coworkingCount > 0 ? 1 : 0)
                          + summary.bundleBookings.length;
                        return total > shown ? (
                          <div className="text-[10px] text-gray-500 text-center">+{total - shown} more</div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Selected Date Details panel ─────────────────────────────── */}
      {selectedDate && (() => {
        const summary = getDaySummary(selectedDate);
        const dayEvts = getEventsForDay(selectedDate);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayAllBookings = hubBookings.filter(b => b.booking_date === dateStr);
        const isFullBlock = summary.workshopQ2 && summary.workshopQ4;
        const available = isFullBlock ? 0 : Math.max(0, summary.totalSeats - summary.bookedSeats);

        return (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-1">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>

            {/* Seat summary */}
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
              <span className="font-medium text-gray-900">{available} seats available</span>
              <span>of {summary.totalSeats}</span>
              {isFullBlock && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle className="w-3 h-3" /> Full Hub Blocked
                </span>
              )}
            </div>

            <div className="space-y-2">
              {/* Events */}
              {dayEvts.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => handleEventClick(ev)}
                  className="w-full bg-amber-50 rounded-lg p-3 text-left hover:bg-amber-100 transition-colors"
                >
                  <span className="text-sm font-medium text-amber-900">{ev.title}</span>
                  <span className="block text-xs text-amber-700 mt-0.5">
                    {format(new Date(ev.start_time), 'h:mm a')} – {format(new Date(ev.end_time), 'h:mm a')}
                  </span>
                </button>
              ))}

              {/* Hub bookings grouped by type */}
              {dayAllBookings.length === 0 && dayEvts.length === 0 ? (
                <p className="text-gray-500 text-sm">No bookings for this date</p>
              ) : (
                dayAllBookings.map(b => (
                  <div key={b.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                          </span>
                          {b.is_workshop && (
                            <span className="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Workshop</span>
                          )}
                          {b.package?.is_bundle && (
                            <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Bundle</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {b.package?.name ?? 'Coworking'}{b.guest_name ? ` · ${b.guest_name}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        {b.seats_used}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* Quick Booking Modal */}
      {showBookingModal && selectedDate && (
        <QuickBookingModal
          date={selectedDate}
          onClose={() => { setShowBookingModal(false); setSelectedDate(null); }}
        />
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => { setShowEventModal(false); setSelectedEvent(null); }}
          onBookSpace={() => {
            setShowEventModal(false);
            const eventDate = new Date(selectedEvent.start_time);
            setSelectedEvent(null);
            setSelectedDate(eventDate);
            setShowBookingModal(true);
          }}
        />
      )}
    </div>
  );
}
