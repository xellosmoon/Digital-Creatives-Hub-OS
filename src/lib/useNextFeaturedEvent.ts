import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { CalendarEvent } from '../types';

interface EventDate {
  date: string;
  start_time: string;
  end_time: string;
}

/** True once every date this event covers is in the past. A multi-date
 *  event's own start_time/end_time only reflect its first date (see
 *  EventFormModal.tsx), so a festival whose day 1 already passed but
 *  still has day 2 ahead needs checking against event_dates instead. */
function hasEndedByNow(event: CalendarEvent, now: Date): boolean {
  // Some rows carry a placeholder event_dates entry with every field
  // blank (`{date: '', start_time: '', end_time: ''}`) rather than
  // actually being empty — filter those out before trusting the array,
  // otherwise `.every()` on a single blank entry evaluates to false and
  // the event looks like it never ends.
  const dates = ((event.event_dates as EventDate[] | null) ?? []).filter((d) => d.date);
  if (dates.length > 0) {
    return dates.every((d) => new Date(`${d.date}T${d.end_time || '23:59'}`) < now);
  }
  return new Date(event.end_time) < now;
}

/** The next upcoming featured event, for the calendar's hero spotlight.
 *  Fetches a handful of candidates (not just one) since the soonest-
 *  starting featured row in the DB might already be a multi-date event
 *  that's technically still running or fully past. */
export function useNextFeaturedEvent(): { event: CalendarEvent | null; loading: boolean } {
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchNext = async (): Promise<void> => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .eq('is_featured', true)
          .order('start_time', { ascending: true })
          .limit(10);
        if (error) throw error;

        const now = new Date();
        const next = ((data as CalendarEvent[]) ?? []).find((ev) => !hasEndedByNow(ev, now)) ?? null;
        if (!cancelled) setEvent(next);
      } catch (err) {
        console.error('Error fetching featured event:', err);
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNext();

    const sub = supabase
      .channel('featured-event-spotlight')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchNext())
      .subscribe();

    return () => { cancelled = true; sub.unsubscribe(); };
  }, []);

  return { event, loading };
}
