import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Filter, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../types';
import AdminEventCard from '../components/admin/AdminEventCard';
import EventFormModal from '../components/admin/EventFormModal';

type StatusFilter = 'all' | 'proposed' | 'published' | 'draft' | 'cancelled';

/**
 * Admin page for managing events (CRUD).
 * Accessible at /admin/events — protected by the ProtectedRoute wrapper.
 */
export default function EventManagement() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  // ── Fetch all events (admins see all statuses) ─────────────────
  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*, space:spaces(id, name, type)')
        .order('start_time', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents((data as CalendarEvent[]) ?? []);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/admin" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
            </div>
            <p className="mt-1 text-gray-600 ml-8">
              Create, edit, and publish events that appear on the public calendar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchEvents}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" /> New Event
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-400" />
        <nav className="flex gap-2">
          {(['all', 'proposed', 'published', 'draft', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter === s
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Events list */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">
              {filter !== 'all'
                ? `No ${filter} events found`
                : 'No events yet — create your first one!'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Event
            </button>
          </div>
        ) : (
          events.map((ev) => (
            <AdminEventCard key={ev.id} event={ev} onUpdate={fetchEvents} />
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <EventFormModal
          event={null}
          onClose={() => setShowCreateModal(false)}
          onSaved={fetchEvents}
        />
      )}
    </div>
  );
}
