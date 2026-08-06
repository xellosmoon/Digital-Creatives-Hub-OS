import { useState, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isAfter, startOfDay, eachDayOfInterval,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Users, Wrench, AlertTriangle, Calendar,
  BookOpen, Sparkles, CalendarClock, History,
} from 'lucide-react';

interface EventDate {
  date: string;
  start_time: string;
  end_time: string;
}
import { supabase } from '../../lib/supabase';
import { useEvents } from '../../lib/useEvents';
import type { CalendarEvent } from '../../types';
import type { HubBooking, DailyOccupancy, HubCapacityConfig } from '../../types/hub';
import QuickBookingModal from './QuickBookingModal';
import EventDetailsModal from './EventDetailsModal';
import EventPopover from './EventPopover';

// ── Categories for UI filters ──────────────────────────────────────
const EVENT_CATEGORIES = ['All', 'Coworking', 'Workshops', 'Tech & Dev', 'Community'];

// ── Hub booking with only the joined package columns we SELECT ──────
interface CalendarHubBooking extends Omit<HubBooking, 'package'> {
  package?: { slug: string; name: string; is_bundle: boolean };
}

// ── Aggregated day-level summary ───────────────────────────────────
interface DaySummary {
  totalSeats: number;       // from config
  bookedSeats: number;      // from daily_occupancy or sum of hub_bookings
  activeCheckIns: number;   // # of active check-ins from hub_attendance
  totalAttendance: number;  // all check-ins that day (any status) — for historic peak
  workshopQ2: boolean;
  workshopQ4: boolean;
  coworkingCount: number;   // # of individual coworking bookings
  pendingCount: number;      // # of pending bookings
  bundleBookings: CalendarHubBooking[];
  workshopBookings: CalendarHubBooking[];
}

export default function PublicCalendar(): JSX.Element {
  // ── State ────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hubBookings, setHubBookings] = useState<CalendarHubBooking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<CalendarHubBooking[]>([]);
  const [occupancyMap, setOccupancyMap] = useState<Record<string, DailyOccupancy>>({});
  const [activeCheckInsMap, setActiveCheckInsMap] = useState<Record<string, number>>({});
  const [attendanceTotalsMap, setAttendanceTotalsMap] = useState<Record<string, number>>({});
  const [totalSeats, setTotalSeats] = useState(28);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // New UI states
  const [activeFilter, setActiveFilter] = useState('All');
  const [popoverEvent, setPopoverEvent] = useState<CalendarEvent | null>(null);

  // Helper to determine category from event fields
  const getEventCategory = (ev: CalendarEvent): string => {
    const title = (ev.title || '').toLowerCase();
    const desc = (ev.description || '').toLowerCase();
    if (title.includes('workshop') || title.includes('training') || desc.includes('workshop')) return 'Workshops';
    if (title.includes('tech') || title.includes('dev') || title.includes('code') || desc.includes('tech')) return 'Tech & Dev';
    if (title.includes('community') || title.includes('social') || desc.includes('social')) return 'Community';
    return 'Events';
  };

  // Events from the dedicated `events` table
  const { events, loading: eventsLoading } = useEvents(currentDate);

  const loading = bookingsLoading || eventsLoading;

  // ── Fetch hub bookings + occupancy + capacity config ─────────────
  useEffect(() => {
    fetchHubData();

    // Real-time: refresh when hub_bookings, daily_occupancy, or hub_attendance change
    const sub = supabase
      .channel('calendar-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_bookings' }, () => fetchHubData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_occupancy' }, () => fetchHubData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_attendance' }, () => fetchHubData())
      .subscribe();

    return () => { sub.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchHubData = async (): Promise<void> => {
    setBookingsLoading(true);
    try {
      const gridStart = startOfWeek(startOfMonth(currentDate));
      const gridEnd = endOfWeek(endOfMonth(currentDate));
      const gridStartStr = format(gridStart, 'yyyy-MM-dd');
      const gridEndStr = format(gridEnd, 'yyyy-MM-dd');

      const gridStartISO = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate(), 0, 0, 0, 0).toISOString();
      const gridEndISO = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate(), 23, 59, 59, 999).toISOString();

      // Parallel: bookings, pending bookings, occupancy rows, capacity config, active check-ins
      const [bookingsRes, pendingRes, occRes, configRes, attendanceRes] = await Promise.all([
        supabase
          .from('hub_bookings')
          .select('*, package:rental_packages(slug, name, is_bundle)')
          .in('status', ['approved', 'active'])
          .gte('booking_date', gridStartStr)
          .lte('booking_date', gridEndStr)
          .order('start_time', { ascending: true }),
        supabase
          .from('hub_bookings')
          .select('*, package:rental_packages(slug, name, is_bundle)')
          .eq('status', 'pending')
          .gte('booking_date', gridStartStr)
          .lte('booking_date', gridEndStr)
          .order('start_time', { ascending: true }),
        supabase
          .from('daily_occupancy')
          .select('*')
          .gte('occupancy_date', gridStartStr)
          .lte('occupancy_date', gridEndStr),
        supabase
          .from('hub_capacity_config')
          .select('*')
          .limit(1)
          .single(),
        supabase
          .from('hub_attendance')
          .select('check_in_time, status')
          .gte('check_in_time', gridStartISO)
          .lte('check_in_time', gridEndISO),
      ]);

      setHubBookings((bookingsRes.data as CalendarHubBooking[]) ?? []);
      setPendingBookings((pendingRes.data as CalendarHubBooking[]) ?? []);

      // Index occupancy by date string for fast lookup
      const occMap: Record<string, DailyOccupancy> = {};
      for (const row of (occRes.data ?? []) as DailyOccupancy[]) {
        occMap[row.occupancy_date] = row;
      }
      setOccupancyMap(occMap);

      // Index attendance by date: active check-ins (live) and all-status totals (historic peak)
      const checkInsMap: Record<string, number> = {};
      const attendanceTotals: Record<string, number> = {};
      for (const row of (attendanceRes.data ?? [])) {
        const dateStr = format(new Date(row.check_in_time), 'yyyy-MM-dd');
        attendanceTotals[dateStr] = (attendanceTotals[dateStr] || 0) + 1;
        if (row.status === 'active') {
          checkInsMap[dateStr] = (checkInsMap[dateStr] || 0) + 1;
        }
      }
      setActiveCheckInsMap(checkInsMap);
      setAttendanceTotalsMap(attendanceTotals);

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

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(ev => {
      if (ev.event_dates && Array.isArray(ev.event_dates) && ev.event_dates.length > 0) {
        return ev.event_dates.some((d: EventDate) => d.date === dateStr);
      }
      return isSameDay(new Date(ev.start_time), date);
    });
  };

  /** Build an aggregated summary for a single day. */
  const getDaySummary = (date: Date): DaySummary => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const occ = occupancyMap[dateStr];
    const dayBookings = hubBookings.filter(b => b.booking_date === dateStr);
    const dayPending = pendingBookings.filter(b => b.booking_date === dateStr);
    const activeCheckIns = activeCheckInsMap[dateStr] ?? 0;
    const totalAttendance = attendanceTotalsMap[dateStr] ?? 0;

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
      activeCheckIns,
      totalAttendance,
      workshopQ2: occ?.workshop_block_q2 ?? false,
      workshopQ4: occ?.workshop_block_q4 ?? false,
      coworkingCount,
      pendingCount: dayPending.length,
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

      {/* Category Filter Bar */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {EVENT_CATEGORIES.map(category => {
          const isActive = activeFilter === category;
          return (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ease-out whitespace-nowrap ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 border border-slate-200/50'
              }`}
            >
              {category}
            </button>
          );
        })}
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

                const bookedPct = summary.totalSeats > 0
                  ? Math.round((summary.bookedSeats / summary.totalSeats) * 100)
                  : 0;
                const livePct = summary.totalSeats > 0
                  ? Math.round((summary.activeCheckIns / summary.totalSeats) * 100)
                  : 0;
                const isFullBlock = summary.workshopQ2 && summary.workshopQ4;

                const occPct = Math.max(bookedPct, livePct);

                // Heatmap logic
                let heatmapClass = 'border-slate-200/60';
                if (occPct > 75 || isFullBlock) {
                  heatmapClass = 'border-amber-400/80 shadow-[0_0_16px_rgba(251,191,36,0.25)] z-10 relative';
                } else if (occPct >= 40) {
                  heatmapClass = 'border-indigo-300/80 shadow-[0_0_12px_rgba(99,102,241,0.15)] z-10 relative';
                }

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
                      bg-white p-2 min-h-[110px] relative group border
                      ${heatmapClass}
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isToday ? 'bg-primary-50' : ''}
                      ${isSelected ? 'ring-2 ring-primary-500' : ''}
                      transition-all duration-200 ease-out
                      ${isFuture ? 'cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:z-20 hover:shadow-xl hover:border-indigo-400/80 hover:bg-white' : 'cursor-not-allowed opacity-60'}
                    `}
                  >
                    {/* Day number + add icon */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm transition-colors group-hover:text-indigo-600 group-hover:font-bold">{format(day, 'd')}</span>
                      {isFuture && (
                        <Plus className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    {/* ── Occupancy mini-bars ── */}
                    {isCurrentMonth && (() => {
                      const isPast = !isFuture; // isFuture is isAfter(...) || isToday
                      const isStrictlyFuture = isAfter(startOfDay(day), startOfDay(new Date()));

                      // Past Days: Frozen Peak
                      if (isPast) {
                        const historicHigh = Math.max(summary.bookedSeats, summary.totalAttendance);
                        if (historicHigh === 0 && !isFullBlock) return null;
                        const histPct = summary.totalSeats > 0
                          ? Math.round((historicHigh / summary.totalSeats) * 100)
                          : 0;
                        return (
                          <div className="mb-1 space-y-1">
                            <div title={isFullBlock ? 'Full hub blocked' : `${historicHigh} attendees at peak`}>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 h-1.5 rounded-full transition-all opacity-80"
                                  style={{ width: `${isFullBlock ? 100 : Math.min(histPct, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <History className="w-3 h-3 text-gray-400" />
                                <span className="text-[10px] text-gray-500">
                                  Peak: {isFullBlock ? 'Full hub blocked' : `${historicHigh}/${summary.totalSeats}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Today & Future Days: Dynamic Reserved + Checked In
                      const showReserved = (summary.bookedSeats > 0 || isFullBlock);
                      const showCheckedIn = summary.activeCheckIns > 0 && !isStrictlyFuture;

                      if (!showReserved && !showCheckedIn) return null;

                      return (
                        <div className="mb-1 space-y-1">
                          {/* Reserved Bar (Indigo) */}
                          {showReserved && (
                            <div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`${isFullBlock ? 'bg-red-400' : 'bg-indigo-400'} h-1.5 rounded-full transition-all`}
                                  style={{ width: `${isFullBlock ? 100 : Math.min(bookedPct, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <CalendarClock className="w-3 h-3 text-indigo-400" />
                                <span className="text-[10px] text-gray-500">
                                  Reserved: {isFullBlock ? 'Full hub blocked' : `${summary.bookedSeats}/${summary.totalSeats}`}
                                </span>
                              </div>
                            </div>
                          )}
                          {/* Checked In Bar (Gradient) */}
                          {showCheckedIn && (
                            <div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(livePct, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-[10px] text-gray-500">
                                  Creatives at the Hub: {summary.activeCheckIns}/{summary.totalSeats}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Day content - horizontal badge row */}
                    <div className="mt-2 flex flex-row items-center gap-1.5 flex-wrap">
                      {/* ── Event badges with text ── */}
                      {dayEvents.slice(0, 3).map(ev => {
                        const category = getEventCategory(ev);
                        
                        // Handle filter visibility
                        const isVisible = activeFilter === 'All' || activeFilter === category || (activeFilter === 'Workshops' && category === 'Workshops') || (activeFilter === 'Tech & Dev' && category === 'Tech & Dev') || (activeFilter === 'Community' && category === 'Community');
                        const visibilityClass = isVisible ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none';

                        let bgColor = 'bg-blue-50 border-blue-200';
                        let textColor = 'text-blue-600';
                        if (category === 'Tech & Dev') {
                          bgColor = 'bg-cyan-500/10 border-cyan-300/50';
                          textColor = 'text-cyan-700';
                        } else if (category === 'Workshops') {
                          bgColor = 'bg-amber-500/10 border-amber-300/50';
                          textColor = 'text-amber-700';
                        } else if (category === 'Community') {
                          bgColor = 'bg-emerald-500/10 border-emerald-300/50';
                          textColor = 'text-emerald-700';
                        }

                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopoverEvent(ev);
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${bgColor} hover:scale-105 hover:shadow-sm transition-all duration-300 ease-out cursor-pointer ${visibilityClass}`}
                            title={ev.title}
                          >
                            {category === 'Workshops' ? (
                              <BookOpen className={`w-4 h-4 flex-shrink-0 ${textColor}`} style={{ display: 'block' }} />
                            ) : ev.is_featured ? (
                              <Sparkles className={`w-4 h-4 flex-shrink-0 ${textColor}`} style={{ display: 'block' }} />
                            ) : (
                              <Calendar className={`w-4 h-4 flex-shrink-0 ${textColor}`} style={{ display: 'block' }} />
                            )}
                            <span className={`text-xs font-medium ${textColor} truncate max-w-[100px]`}>
                              {ev.title}
                            </span>
                          </div>
                        );
                      })}

                      {/* ── Overflow counter ── */}
                      {dayEvents.length > 3 && (
                        <div className={`flex items-center justify-center px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 transition-all duration-300 ${activeFilter !== 'All' ? 'opacity-20 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}

                      {/* ── Workshop booking indicator ── */}
                      {summary.workshopBookings.length > 0 && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 border border-red-200 hover:scale-105 transition-all duration-300 ease-out cursor-pointer ${activeFilter === 'All' || activeFilter === 'Workshops' ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none'}`}
                          title={`${summary.workshopBookings.length} workshop booking${summary.workshopBookings.length > 1 ? 's' : ''}`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-xs font-medium text-red-700">
                            {summary.workshopBookings.length} Workshop{summary.workshopBookings.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* ── Bundle booking indicator ── */}
                      {summary.bundleBookings.length > 0 && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 border border-purple-200 hover:scale-105 transition-all duration-300 ease-out cursor-pointer ${activeFilter === 'All' || activeFilter === 'Coworking' ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none'}`}
                          title={`${summary.bundleBookings.length} bundle booking${summary.bundleBookings.length > 1 ? 's' : ''}`}
                        >
                          <Wrench className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-xs font-medium text-purple-700">
                            {summary.bundleBookings.length} Bundle{summary.bundleBookings.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* ── Regular coworking indicator (non-workshop, non-bundle) ── */}
                      {summary.coworkingCount > 0 && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-300 hover:scale-105 transition-all duration-300 ease-out cursor-pointer ${activeFilter === 'All' || activeFilter === 'Coworking' ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none'}`}
                          title={`${summary.coworkingCount} coworking booking${summary.coworkingCount > 1 ? 's' : ''}`}
                        >
                          <Users className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-xs font-medium text-slate-700">
                            {summary.coworkingCount} Coworking{summary.coworkingCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* ── Pending bookings indicator ── */}
                      {summary.pendingCount > 0 && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 border border-yellow-300 hover:scale-105 transition-all duration-300 ease-out cursor-pointer ${activeFilter === 'All' ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none'}`}
                          title={`${summary.pendingCount} pending booking${summary.pendingCount > 1 ? 's' : ''} awaiting approval`}
                        >
                          <Clock className="w-3.5 h-3.5 text-yellow-600" />
                          <span className="text-xs font-medium text-yellow-800">
                            {summary.pendingCount} Pending{summary.pendingCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

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
        const actualOccupied = Math.max(summary.bookedSeats, summary.activeCheckIns);
        const available = isFullBlock ? 0 : Math.max(0, summary.totalSeats - actualOccupied);

        return (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-1">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>

            {/* Seat summary */}
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
              <span className="font-medium text-gray-900">{available} seats available</span>
              <span>of {summary.totalSeats}</span>
              {summary.bookedSeats > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                  <CalendarClock className="w-3 h-3" /> {summary.bookedSeats} Slots Reserved
                </span>
              )}
              {summary.activeCheckIns > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                  <Users className="w-3 h-3" /> {summary.activeCheckIns} Creators on the Floor
                </span>
              )}
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
                        {b.purpose && Array.isArray(b.purpose) && b.purpose.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {b.purpose.slice(0, 2).join(', ')}
                            {b.purpose.length > 2 && ` +${b.purpose.length - 2} more`}
                          </p>
                        )}
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

      {/* Event Popover */}
      {popoverEvent && (
        <EventPopover
          event={popoverEvent}
          categoryName={getEventCategory(popoverEvent)}
          onClose={() => setPopoverEvent(null)}
          onBookSpace={() => {
            setPopoverEvent(null);
            const eventDate = new Date(popoverEvent.start_time);
            setSelectedDate(eventDate);
            setShowBookingModal(true);
          }}
        />
      )}
    </div>
  );
}
