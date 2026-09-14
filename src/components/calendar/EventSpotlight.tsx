import { format } from 'date-fns';
import { Sparkles, ArrowRight, Calendar } from 'lucide-react';
import type { CalendarEvent } from '../../types';
import { getEventCategoryLabel, getEventCategoryStyle } from '../../lib/eventCategories';

interface EventDate {
  date: string;
  start_time: string;
  end_time: string;
}

/** For a multi-date event, the hero should show whichever date is coming
 *  up next — not necessarily the first one on record, which may have
 *  already passed for a series that's still partway through. */
function nextUpcomingDate(event: CalendarEvent): Date {
  const now = new Date();
  const dates = (event.event_dates as EventDate[] | null) ?? [];
  const upcoming = dates
    .filter((d) => d.date)
    .map((d) => new Date(`${d.date}T${d.start_time || '00:00'}`))
    .filter((d) => d >= now)
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0] ?? new Date(event.start_time);
}

interface EventSpotlightProps {
  event: CalendarEvent;
  onSelect: () => void;
}

/** The hero banner above the calendar grid — the next upcoming featured
 *  event, big and image-led, so there's something worth opening the
 *  calendar for before a visitor even looks at a single date. */
export default function EventSpotlight({ event, onSelect }: EventSpotlightProps): JSX.Element {
  const style = getEventCategoryStyle(event.category);
  const dateLabel = format(nextUpcomingDate(event), 'EEEE, MMMM d');

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative w-full text-left rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 mb-6"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
      {event.poster_url && (
        <img
          src={event.poster_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/30 rounded-full blur-3xl" />
      </div>

      <div className="relative px-6 py-8 sm:px-10 sm:py-10 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> Featured
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold">
            {getEventCategoryLabel(event.category)}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight max-w-2xl drop-shadow-sm">
          {event.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90 text-sm font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> {dateLabel}
          </span>
          {(event.organization || event.organizer) && (
            <span>Hosted by {event.organization || event.organizer}</span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 mt-2 text-white font-bold group-hover:gap-2.5 transition-all">
          View Details <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}
