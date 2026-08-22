import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Edit, Trash2, Star, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '../../types';
import EventFormModal from './EventFormModal';

interface AdminEventCardProps {
  event: CalendarEvent;
  onUpdate: () => void;
}

/**
 * Card rendered in the admin events list.
 * Shows a summary of the event with edit / delete / preview actions.
 */
export default function AdminEventCard({ event, onUpdate }: AdminEventCardProps): JSX.Element {
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Delete handler ──────────────────────────────────────────────
  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      toast.success('Event deleted');
      onUpdate();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete event';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // ── Status badge color ──────────────────────────────────────────
  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    draft: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5 flex gap-5">
        {/* Poster thumbnail */}
        <div className="flex-shrink-0 w-28 h-28 rounded-md overflow-hidden bg-gray-100 dark:bg-slate-700">
          {event.poster_url ? (
            <img
              src={event.poster_url}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <Calendar className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                {event.title}
                {event.is_featured && (
                  <Star className="w-4 h-4 flex-shrink-0 fill-amber-400 text-amber-400" />
                )}
              </h3>
              {event.organizer && (
                <p className="text-sm text-gray-500 dark:text-gray-400">by {event.organizer}</p>
              )}
            </div>
            <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[event.status] ?? ''}`}>
              {event.status}
            </span>
          </div>

          {/* Date / Time */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              {format(new Date(event.start_time), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              {format(new Date(event.start_time), 'h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
            </span>
            {event.space?.name && (
              <span className="text-gray-500 dark:text-gray-400">@ {event.space.name}</span>
            )}
          </div>

          {/* Registration link indicator */}
          {event.registration_link && (
            <a
              href={event.registration_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Registration link
            </a>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Edit className="w-4 h-4 mr-1" /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-1" /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <EventFormModal
          event={event}
          onClose={() => setShowEditModal(false)}
          onSaved={onUpdate}
        />
      )}
    </>
  );
}
