import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from './supabase';
import type { CalendarEvent } from '../types';

/**
 * Custom hook that fetches published events for a given month from the
 * dedicated `events` table.  It also sets up a real-time subscription so
 * the calendar updates automatically when events are created or modified.
 */
export function useEvents(currentDate: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();

    // Real-time subscription — refresh when any event row changes
    const subscription = supabase
      .channel('public-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  /** Fetch published events within the visible month window. */
  async function fetchEvents() {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate).toISOString();
      const monthEnd = endOfMonth(currentDate).toISOString();

      const { data, error } = await supabase
        .from('events')
        .select('*, space:spaces(id, name, type)')
        .eq('status', 'published')
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents((data as CalendarEvent[]) ?? []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }

  return { events, loading, refetch: fetchEvents };
}
