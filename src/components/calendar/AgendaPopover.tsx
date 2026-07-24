import { format, isPast, isToday } from 'date-fns';
import { Calendar, Clock, User, ExternalLink } from 'lucide-react';
import type { CalendarEvent } from '../../types';

interface AgendaPopoverProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onBookSpace: (date: Date) => void;
  onViewDetails: (event: CalendarEvent) => void;
  onProposeEvent: () => void;
}

/**
 * Agenda popover showing mini-cards for all events on a selected date.
 * Replaces the quick-booking modal with a rich event agenda view.
 */
export default function AgendaPopover({
  selectedDate,
  events,
  onClose,
  onBookSpace,
  onViewDetails,
  onProposeEvent,
}: AgendaPopoverProps): JSX.Element {
  const isEventPast = (event: CalendarEvent): boolean => {
    return isPast(new Date(event.start_time)) && !isToday(new Date(event.start_time));
  };

  const getButtonConfig = (event: CalendarEvent): { label: string; action: () => void } => {
    if (isEventPast(event)) {
      if (event.facebook_post_url) {
        return {
          label: '📸 Highlights',
          action: () => window.open(event.facebook_post_url!, '_blank'),
        };
      }
      return {
        label: '📋 View Details',
        action: () => onViewDetails(event),
      };
    }
    return {
      label: '🗓️ Book a Seat',
      action: () => onBookSpace(selectedDate),
    };
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-80 sm:w-96 p-4 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Agenda for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Event Cards */}
        {events.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {events.map((event) => {
              const buttonConfig = getButtonConfig(event);

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-colors"
                >
                  {/* Title */}
                  <h4 className="text-sm font-bold text-blue-900 mb-1">{event.title}</h4>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>
                      {format(new Date(event.start_time), 'h:mm a')} –{' '}
                      {format(new Date(event.end_time), 'h:mm a')}
                    </span>
                  </div>

                  {(event.organization || event.organizer) && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span>Hosted by {event.organization || event.organizer}</span>
                    </div>
                  )}

                  {/* Contextual Button */}
                  <button
                    onClick={buttonConfig.action}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1"
                  >
                    {buttonConfig.label}
                    {buttonConfig.label.includes('Highlights') && <ExternalLink className="w-3 h-3" />}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">No events today</p>
            <button
              onClick={onProposeEvent}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Propose an Event →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
