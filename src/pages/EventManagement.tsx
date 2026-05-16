import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Filter, ArrowLeft, Check, XCircle, Edit, Calendar, Users, Mail, Phone, Building2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../types';
import AdminEventCard from '../components/admin/AdminEventCard';
import EventFormModal from '../components/admin/EventFormModal';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'proposed' | 'approved' | 'published' | 'draft' | 'cancelled';

interface EventProposal {
  id: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  organization: string | null;
  role: string | null;
  title: string;
  description: string;
  expected_guests: number | null;
  creative_domains: string[];
  event_dates: any;
  status: string;
  created_at: string;
}

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

  // ── Approve proposal ─────────────────
  const handleApproveProposal = async (id: string): Promise<void> => {
    try {
      // Update proposal status to approved
      const { error } = await supabase
        .from('hub_events')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Event proposal approved! Use "New Event" to add to calendar.');
      fetchProposals();
      fetchEvents();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve proposal';
      toast.error(errorMessage);
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
          {(['all', 'proposed', 'approved', 'published', 'draft', 'cancelled'] as const).map((s) => (
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
        ) : filter === 'proposed' || filter === 'approved' ? (
          // Show proposals
          (filter === 'proposed' ? proposals.filter(p => p.status === 'pending_review') : proposals.filter(p => p.status === 'approved')).length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 mb-4">{filter === 'proposed' ? 'No pending event proposals found' : 'No approved proposals found'}</p>
            </div>
          ) : (
            (filter === 'proposed' ? proposals.filter(p => p.status === 'pending_review') : proposals.filter(p => p.status === 'approved')).map((proposal) => (
              <div key={proposal.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{proposal.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{proposal.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {proposal.creative_domains.map((domain) => (
                        <span key={domain} className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    proposal.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                    proposal.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {proposal.status === 'pending_review' ? 'Pending' : proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium">Organizer</p>
                    <p className="text-gray-900">{proposal.organizer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Email</p>
                    <p className="text-gray-900">{proposal.organizer_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Phone</p>
                    <p className="text-gray-900">{proposal.organizer_phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Expected Guests</p>
                    <p className="text-gray-900">{proposal.expected_guests || 'N/A'}</p>
                  </div>
                  {proposal.organization && (
                    <div>
                      <p className="text-gray-500 font-medium">Organization</p>
                      <p className="text-gray-900">{proposal.organization}</p>
                    </div>
                  )}
                  {proposal.role && (
                    <div>
                      <p className="text-gray-500 font-medium">Role</p>
                      <p className="text-gray-900">{proposal.role}</p>
                    </div>
                  )}
                </div>

                {/* Event Dates */}
                <div className="mb-4">
                  <p className="text-gray-500 font-medium text-xs mb-2">Event Dates & Times</p>
                  <div className="space-y-1">
                    {Array.isArray(proposal.event_dates) && proposal.event_dates.map((eventDate: any, index: number) => {
                      if (!eventDate.date) return null;
                      try {
                        const dateObj = new Date(eventDate.date);
                        if (isNaN(dateObj.getTime())) return null;
                        return (
                          <div key={index} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                            {format(dateObj, 'EEE, MMM d, yyyy')} • {eventDate.start_time} - {eventDate.end_time}
                          </div>
                        );
                      } catch (e) {
                        console.warn('Invalid date:', eventDate.date);
                        return null;
                      }
                    })}
                  </div>
                </div>

                {proposal.status === 'pending_review' && (
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleApproveProposal(proposal.id)}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve & Publish
                    </button>
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )
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
