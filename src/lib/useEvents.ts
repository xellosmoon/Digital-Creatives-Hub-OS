import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from './supabase';
import type { CalendarEvent } from '../types';

interface EventDate {
  date: string;
  start_time: string;
  end_time: string;
}

/**
 * Custom hook that fetches published events for a given month from the
 * dedicated `events` table.  It also sets up a real-time subscription so
 * the calendar updates automatically when events are created or modified.
 */
export function useEvents(currentDate: Date): { events: CalendarEvent[]; loading: boolean; refetch: () => Promise<void> } {
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
  async function fetchEvents(): Promise<void> {
    setLoading(true);
    try {
      const gridStart = startOfWeek(startOfMonth(currentDate));
      const gridEnd = endOfWeek(endOfMonth(currentDate));

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Filter client-side to include multi-date events that span the visible month
      const filteredEvents = (data as CalendarEvent[]).filter(ev => {
        // Check if event has any date in the visible range
        if (ev.event_dates && Array.isArray(ev.event_dates) && ev.event_dates.length > 0) {
          return ev.event_dates.some((d: EventDate) => {
            const eventDate = new Date(d.date);
            return eventDate >= gridStart && eventDate <= gridEnd;
          });
        }
        // Fallback to start_time for single-date events
        const eventStart = new Date(ev.start_time);
        return eventStart >= gridStart && eventStart <= gridEnd;
      });

      setEvents(filteredEvents ?? []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }

  return { events, loading, refetch: fetchEvents };
}
