import { format } from 'date-fns';
import { supabase } from './supabase';
import { cleanDates, type ScheduleDate } from './scheduleChange';
import { normalizeEventCategory, getEventCategoryLabel, EVENT_CATEGORY_OPTIONS, type EventCategory } from './eventCategories';

/**
 * Event report: one row per calendar event, with real attendance from the
 * check-in kiosk. Replaces two older exports that read columns events don't
 * have (blank organizer/location), picked events by when they were *created*
 * instead of when they *happen*, ignored multi-day schedules, and never
 * counted who actually showed up.
 */

export type EventTiming = 'upcoming' | 'happening' | 'completed';

export interface EventReportRow {
  id: string;
  title: string;
  category: EventCategory;
  status: 'published' | 'cancelled';
  dates: ScheduleDate[];
  firstDate: string;
  lastDate: string;
  timing: EventTiming;
  organizer: string;
  organization: string;
  contactEmail: string;
  contactPhone: string;
  expectedGuests: number | null;
  /** Genuine check-ins (active / checked-out) tied to this event. */
  checkIns: number;
  /** Distinct people (by mobile number) among those check-ins. */
  uniqueAttendees: number;
  /** Those mobile numbers themselves, so a period-wide distinct count can be
   *  taken without double-counting someone who came to two events. */
  attendeeMobiles: string[];
  isFeatured: boolean;
  registrationLink: string;
}

export interface EventReportRange {
  /** Inclusive, 'yyyy-MM-dd'. null = no lower bound. */
  start: string | null;
  /** Inclusive, 'yyyy-MM-dd'. null = no upper bound. */
  end: string | null;
}

export interface EventReportSummary {
  totalEvents: number;
  completed: number;
  upcoming: number;
  happening: number;
  cancelled: number;
  expectedGuests: number;
  checkIns: number;
  uniqueAttendees: number;
  byCategory: { category: EventCategory; label: string; events: number; checkIns: number }[];
}

interface RawEvent {
  id: string;
  title: string;
  category: string | null;
  status: string;
  start_time: string;
  end_time: string;
  event_dates: ScheduleDate[] | null;
  organizer: string | null;
  organization: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  expected_guests: number | null;
  expected_attendees: number | null;
  is_featured: boolean | null;
  registration_link: string | null;
}

interface AttendanceRow {
  event_id: string;
  mobile_number: string | null;
}

type PageResult = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/** PostgREST silently caps a request at 1000 rows — a busy event season
 *  would quietly under-report if the whole table were read in one call. */
async function fetchAll<T>(page: (from: number, to: number) => PageResult): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

/** The dates an event runs on. Multi-day events keep every day in
 *  event_dates; older rows only have start_time/end_time. */
function datesFor(ev: RawEvent): ScheduleDate[] {
  const fromList = cleanDates(ev.event_dates);
  if (fromList.length > 0) return fromList;
  const start = new Date(ev.start_time);
  const end = new Date(ev.end_time);
  return [{ date: format(start, 'yyyy-MM-dd'), start_time: format(start, 'HH:mm'), end_time: format(end, 'HH:mm') }];
}

function timingFor(firstDate: string, lastDate: string): EventTiming {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (lastDate < today) return 'completed';
  if (firstDate > today) return 'upcoming';
  return 'happening';
}

export async function fetchEventReport(range: EventReportRange): Promise<EventReportRow[]> {
  const events = await fetchAll<RawEvent>((from, to) =>
    supabase.from('events').select('*').in('status', ['published', 'cancelled']).order('start_time').range(from, to),
  );

  // An event is "in" the period if any day it runs on falls inside it.
  const inRange = events
    .map((ev) => ({ ev, dates: datesFor(ev) }))
    .filter(({ dates }) =>
      dates.some((d) => (range.start === null || d.date >= range.start) && (range.end === null || d.date <= range.end)),
    );

  // Attendance: only the people who were actually let in. 'pending_entrance'
  // and 'rejected' check-ins never occupied the floor, same rule the
  // calendar's "Peak" figure uses.
  const attendanceByEvent = new Map<string, AttendanceRow[]>();
  const ids = inRange.map(({ ev }) => ev.id);
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const rows = await fetchAll<AttendanceRow>((from, to) =>
      supabase
        .from('hub_attendance')
        .select('event_id, mobile_number')
        .in('event_id', chunk)
        .in('status', ['active', 'checked_out'])
        .order('id')
        .range(from, to),
    );
    for (const r of rows) {
      const list = attendanceByEvent.get(r.event_id) ?? [];
      list.push(r);
      attendanceByEvent.set(r.event_id, list);
    }
  }

  return inRange
    .map(({ ev, dates }): EventReportRow => {
      const att = attendanceByEvent.get(ev.id) ?? [];
      const mobiles = [...new Set(att.map((a) => a.mobile_number).filter((m): m is string => !!m))];
      const firstDate = dates[0].date;
      const lastDate = dates[dates.length - 1].date;
      return {
        id: ev.id,
        title: ev.title,
        category: normalizeEventCategory(ev.category),
        status: ev.status === 'cancelled' ? 'cancelled' : 'published',
        dates,
        firstDate,
        lastDate,
        timing: timingFor(firstDate, lastDate),
        organizer: ev.organizer ?? '',
        organization: ev.organization ?? '',
        contactEmail: ev.contact_email ?? '',
        contactPhone: ev.contact_phone ?? '',
        expectedGuests: ev.expected_guests ?? ev.expected_attendees ?? null,
        checkIns: att.length,
        uniqueAttendees: mobiles.length,
        attendeeMobiles: mobiles,
        isFeatured: !!ev.is_featured,
        registrationLink: ev.registration_link ?? '',
      };
    })
    // Newest first — what a manager scanning a report wants on top.
    .sort((a, b) => b.firstDate.localeCompare(a.firstDate));
}

export function summarizeEvents(rows: EventReportRow[]): EventReportSummary {
  const active = rows.filter((r) => r.status !== 'cancelled');
  const byCategory = EVENT_CATEGORY_OPTIONS.map((opt) => {
    const inCat = active.filter((r) => r.category === opt.value);
    return {
      category: opt.value,
      label: getEventCategoryLabel(opt.value),
      events: inCat.length,
      checkIns: inCat.reduce((s, r) => s + r.checkIns, 0),
    };
  }).filter((c) => c.events > 0);

  return {
    totalEvents: active.length,
    completed: active.filter((r) => r.timing === 'completed').length,
    upcoming: active.filter((r) => r.timing === 'upcoming').length,
    happening: active.filter((r) => r.timing === 'happening').length,
    cancelled: rows.length - active.length,
    expectedGuests: active.reduce((s, r) => s + (r.expectedGuests ?? 0), 0),
    checkIns: active.reduce((s, r) => s + r.checkIns, 0),
    uniqueAttendees: new Set(active.flatMap((r) => r.attendeeMobiles)).size,
    byCategory,
  };
}

// ── Display helpers ────────────────────────────────────────────────

export function formatDateLines(dates: ScheduleDate[]): string[] {
  return dates.map((d) => {
    const day = format(new Date(`${d.date}T00:00`), 'MMM d, yyyy');
    if (!d.start_time) return day;
    const t = (v: string): string => format(new Date(`${d.date}T${v.slice(0, 5)}`), 'h:mm a');
    return `${day}, ${t(d.start_time)}–${t(d.end_time)}`;
  });
}

export function timingLabel(t: EventTiming): string {
  return t === 'completed' ? 'Completed' : t === 'upcoming' ? 'Upcoming' : 'Happening now';
}

export function rangeLabel(range: EventReportRange): string {
  if (range.start === null && range.end === null) return 'All time';
  const f = (s: string): string => format(new Date(`${s}T00:00`), 'MMM d, yyyy');
  if (range.start && range.end) return `${f(range.start)} – ${f(range.end)}`;
  return range.start ? `From ${f(range.start)}` : `Up to ${f(range.end as string)}`;
}

// ── CSV ────────────────────────────────────────────────────────────

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Event titles routinely contain emoji and styled unicode — the BOM makes
 *  Excel read the file as UTF-8 instead of mangling them. */
export function downloadEventReportCsv(rows: EventReportRow[], range: EventReportRange, filename: string): void {
  const summary = summarizeEvents(rows);
  const lines: unknown[][] = [
    ['Digital Creatives Hub — Event Report'],
    ['Period', rangeLabel(range)],
    ['Generated', format(new Date(), 'MMM d, yyyy h:mm a')],
    [],
    [
      'Event', 'Category', 'Status', 'Timing', 'Dates', 'Days', 'Organizer', 'Organization',
      'Contact Email', 'Contact Phone', 'Expected Guests', 'Check-ins', 'Unique Attendees',
      'Attendance vs Expected', 'Featured', 'Registration Link',
    ],
    ...rows.map((r) => {
      const upcoming = r.timing === 'upcoming';
      const pct = r.expectedGuests && !upcoming ? `${Math.round((r.uniqueAttendees / r.expectedGuests) * 100)}%` : '';
      return [
        r.title, getEventCategoryLabel(r.category), r.status === 'cancelled' ? 'Cancelled' : 'Published',
        timingLabel(r.timing), formatDateLines(r.dates).join('; '), r.dates.length,
        r.organizer, r.organization, r.contactEmail, r.contactPhone, r.expectedGuests ?? '',
        // No check-ins can exist yet for an event that hasn't happened — a
        // blank is honest where a 0 would read as "nobody came".
        upcoming ? '' : r.checkIns, upcoming ? '' : r.uniqueAttendees,
        pct, r.isFeatured ? 'Yes' : 'No', r.registrationLink,
      ];
    }),
    [],
    ['SUMMARY (cancelled events excluded from totals)'],
    ['Events', summary.totalEvents],
    ['Completed', summary.completed],
    ['Upcoming', summary.upcoming],
    ['Happening now', summary.happening],
    ['Cancelled', summary.cancelled],
    ['Total expected guests', summary.expectedGuests],
    ['Total check-ins', summary.checkIns],
    ['Unique people (counted once across all events)', summary.uniqueAttendees],
    [],
    ['BY CATEGORY', 'Events', 'Check-ins'],
    ...summary.byCategory.map((c) => [c.label, c.events, c.checkIns]),
    [],
    ['Note: check-ins only count visitors who selected this event at the check-in kiosk.'],
  ];

  const csv = lines.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
