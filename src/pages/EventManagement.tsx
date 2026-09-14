import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Filter, ArrowLeft, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../types';
import AdminEventCard from '../components/admin/AdminEventCard';
import EventFormModal from '../components/admin/EventFormModal';
import EventProposalCard, { EventProposalEmptyState, prefillFromProposal, type EventProposalData } from '../components/admin/EventProposalCard';
import { format } from 'date-fns';
import { exportToCSV, formatEventForExport } from '../utils/csvExport';

type StatusFilter = 'all' | 'proposed' | 'approved' | 'published' | 'draft' | 'cancelled';

type EventProposal = EventProposalData;

/**
 * Admin page for managing events (CRUD).
 * Accessible at /admin/events — protected by the ProtectedRoute wrapper.
 */
export default function EventManagement(): JSX.Element {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ── Fetch all events (admins see all statuses) ─────────────────
  const fetchEvents = async (): Promise<void> => {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: false });

      if (filter !== 'all' && filter !== 'proposed') {
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

  // ── Fetch event proposals ─────────────────
  const fetchProposals = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('hub_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProposals((data as EventProposal[]) ?? []);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    }
  };

  // ── Publish a proposal ─────────────────
  // "Approve & Publish" used to just flip hub_events.status to 'approved'
  // and reserve seats — it never actually created a row in `events`, so
  // nothing showed up on the public calendar and the admin had to
  // separately use "New Event" and re-type everything. Now it opens the
  // real event form pre-filled from the proposal; EventFormModal handles
  // both creating the event and reserving seats (it already does that
  // generically whenever expected_guests > 0), and onProposalPublished
  // below just records the link back once that succeeds.
  const [promotingProposal, setPromotingProposal] = useState<EventProposal | null>(null);

  const onProposalPublished = async (eventId: string): Promise<void> => {
    if (!promotingProposal) return;
    try {
      const { error } = await supabase
        .from('hub_events')
        .update({ status: 'approved', published_event_id: eventId })
        .eq('id', promotingProposal.id);
      if (error) throw error;
      toast.success('Proposal published as an event');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Event was created, but failed to link it back to the proposal';
      toast.error(errorMessage);
    } finally {
      setPromotingProposal(null);
      fetchProposals();
      fetchEvents();
    }
  };

  // ── Reject proposal ─────────────────
  const handleRejectProposal = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to reject this proposal?')) return;
    try {
      const { error } = await supabase
        .from('hub_events')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Event proposal rejected');
      fetchProposals();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject proposal';
      toast.error(errorMessage);
    }
  };

  // ── Export all events ─────────────────
  const handleExportEvents = async (): Promise<void> => {
    try {
      toast.loading('Fetching all historical event data...', { id: 'export-events' });
      
      // Fetch ALL event records (not just filtered)
      const { data: allEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!allEvents || allEvents.length === 0) {
        toast.dismiss('export-events');
        toast.error('No event data to export');
        return;
      }
      
      const exportData = allEvents.map(event => formatEventForExport(event));
      const filename = `Events_AllRecords_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      exportToCSV(exportData, filename);
      
      toast.dismiss('export-events');
      toast.success(`Exported ${allEvents.length} event records!`);
    } catch (err) {
      toast.dismiss('export-events');
      console.error('Export error:', err);
      toast.error('Failed to export event data');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/admin" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Events</h1>
            </div>
            <p className="mt-1 text-gray-600 ml-8 dark:text-gray-400">
              Create, edit, and publish events that appear on the public calendar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchEvents}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
            <button
              onClick={handleExportEvents}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" /> Export All
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
        <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        <nav className="flex gap-2">
          {(['all', 'proposed', 'approved', 'published', 'draft', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter === s
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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
        ) : filter === 'proposed' || filter === 'approved' ? (
          // Show proposals. The 'approved' tab only holds ones that were
          // approved under the old flow but never actually got published —
          // once published (published_event_id set) they drop off both
          // tabs instead of piling up in them forever.
          (filter === 'proposed'
            ? proposals.filter(p => p.status === 'pending_review')
            : proposals.filter(p => p.status === 'approved' && !p.published_event_id)
          ).length === 0 ? (
            <EventProposalEmptyState message={filter === 'proposed' ? 'No pending event proposals found' : 'No approved proposals awaiting publish'} />
          ) : (
            (filter === 'proposed'
              ? proposals.filter(p => p.status === 'pending_review')
              : proposals.filter(p => p.status === 'approved' && !p.published_event_id)
            ).map((proposal) => (
              <EventProposalCard
                key={proposal.id}
                proposal={proposal}
                onApprove={() => setPromotingProposal(proposal)}
                onReject={() => handleRejectProposal(proposal.id)}
              />
            ))
          )
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg dark:bg-slate-800">
            <p className="text-gray-500 mb-4 dark:text-gray-400">
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

      {/* Publish-a-proposal modal — same form, pre-filled */}
      {promotingProposal && (
        <EventFormModal
          event={null}
          prefill={prefillFromProposal(promotingProposal)}
          onClose={() => setPromotingProposal(null)}
          onSaved={onProposalPublished}
        />
      )}
    </div>
  );
}
