import { Calendar as CalendarIcon, Star } from 'lucide-react';
import type { CalendarEvent } from '../../types';

interface EventChipProps {
  event: CalendarEvent;
  /** Called when this specific event chip is clicked. */
  onClick: (event: CalendarEvent) => void;
}

/**
 * A compact pill rendered inside a calendar day cell.
 * Clicking the chip opens the Event Details modal; we stop propagation
 * so the parent cell's "open quick booking" handler does NOT fire.
 */
export default function EventChip({ event, onClick }: EventChipProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // prevent date-cell click from firing
        onClick(event);
      }}
      className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate
                 bg-amber-100 text-amber-800 font-medium
                 hover:bg-amber-200 transition-colors cursor-pointer
                 flex items-center gap-1"
      title={event.title}
    >
      {/* Featured events get a star indicator */}
      {event.is_featured ? (
        <Star className="w-3 h-3 flex-shrink-0 fill-amber-500 text-amber-500" />
      ) : (
        <CalendarIcon className="w-3 h-3 flex-shrink-0" />
      )}
      <span className="truncate">{event.title}</span>
    </button>
  );
}
