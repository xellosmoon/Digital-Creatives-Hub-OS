import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User, X } from 'lucide-react';
import type { CalendarEvent } from '../../types';

interface EventPopoverProps {
  event: CalendarEvent;
  onClose: () => void;
  onBookSpace: () => void;
  categoryName: string;
}

export default function EventPopover({
  event,
  onClose,
  onBookSpace,
  categoryName,
}: EventPopoverProps): JSX.Element {
  // Determine Category Style based on the computed categoryName
  const getCategoryStyles = () => {
    switch (categoryName) {
      case 'Tech & Dev':
        return 'bg-cyan-500/10 text-cyan-700 border-cyan-300/50';
      case 'Workshops':
        return 'bg-amber-500/10 text-amber-700 border-amber-300/50';
      case 'Community':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-300/50';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-300/50';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6 transition-all"
        onClick={(e) => e.stopPropagation()} // prevent clicks inside popover from closing it
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100/80 transition-colors text-slate-400 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryStyles()} mb-3`}>
            {categoryName}
          </div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight pr-8">
            {event.title}
          </h2>
        </div>

        {/* Body Details */}
        <div className="space-y-3 mb-6 text-sm text-slate-600">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">
                {format(new Date(event.start_time), 'EEEE, MMMM d')}
              </p>
              <p>
                {format(new Date(event.start_time), 'h:mm a')} –{' '}
                {format(new Date(event.end_time), 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="font-medium text-slate-900">
              {event.space?.name || 'Digital Creatives Hub'}
            </p>
          </div>

          {/* Host */}
          {(event.organization || event.organizer) && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-400 shrink-0" />
              <p>Hosted by <span className="font-medium text-slate-900">{event.organization || event.organizer}</span></p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <p className="text-slate-700 leading-relaxed line-clamp-3">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onBookSpace}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl py-3 px-4 font-semibold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Book Seat
          </button>
        </div>
      </div>
    </div>
  );
}
