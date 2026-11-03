/**
 * Decides whether a guest's ticket should say "Schedule updated" — shared
 * by the booking and event-proposal tickets so both judge it the same way.
 */

export interface ScheduleDate {
  date: string;
  start_time: string;
  end_time: string;
}

// Times arrive as "14:00" from the forms but could be "14:00:00" from the
// database — compare only HH:mm so formatting alone never counts as a change.
const key = (d: ScheduleDate): string =>
  `${d.date}|${(d.start_time ?? '').slice(0, 5)}|${(d.end_time ?? '').slice(0, 5)}`;

/** Drops the blank placeholder entries some rows carry
 *  (`{date: '', start_time: '', end_time: ''}`) and sorts, so two lists
 *  with the same dates compare equal regardless of order. */
export function cleanDates(dates: ScheduleDate[] | null | undefined): ScheduleDate[] {
  return (dates ?? []).filter((d) => d && d.date).sort((a, b) => key(a).localeCompare(key(b)));
}

/** The schedule the organizer should actually plan around: the published
 *  calendar event's dates once approved, otherwise what they submitted. */
export function finalProposalDates(
  original: ScheduleDate[] | null | undefined,
  published: ScheduleDate[] | null | undefined,
): ScheduleDate[] {
  const pub = cleanDates(published);
  return pub.length > 0 ? pub : cleanDates(original);
}

/** True when an admin's published event has different dates than the
 *  proposal as originally submitted. */
export function proposalScheduleChanged(
  original: ScheduleDate[] | null | undefined,
  published: ScheduleDate[] | null | undefined,
): boolean {
  const pub = cleanDates(published);
  if (pub.length === 0) return false;
  const orig = cleanDates(original);
  return pub.length !== orig.length || pub.some((d, i) => key(d) !== key(orig[i]));
}

export interface BookingSchedule {
  booking_date: string;
  start_time: string;
  end_time: string;
  original_booking_date?: string | null;
  original_start_time?: string | null;
  original_end_time?: string | null;
}

/** True when the booking's date/time differs from what was first booked. */
export function bookingScheduleChanged(b: BookingSchedule): boolean {
  if (!b.original_booking_date || !b.original_start_time || !b.original_end_time) return false;
  return (
    b.original_booking_date !== b.booking_date ||
    new Date(b.original_start_time).getTime() !== new Date(b.start_time).getTime() ||
    new Date(b.original_end_time).getTime() !== new Date(b.end_time).getTime()
  );
}
