import { Calendar as CalendarIcon, Star } from 'lucide-react';
import type { CalendarEvent } from '../../types';

interface EventChipProps {
  event: CalendarEvent;
  /** Called when this specific event chip is clicked. */
  onClick: (event: CalendarEvent) => void;
  /** Called when hovering over the chip (for preview popover) */
  onHover?: (event: CalendarEvent, rect: DOMRect) => void;
  /** Called when hover ends */
  onHoverEnd?: () => void;
}

/**
 * A minimal icon badge rendered inside a calendar day cell.
 * Replaces text cramming with clean, premium icon indicators.
 * Clicking opens the Event Details modal; hover shows preview popover.
 */
export default function EventChip({ event, onClick, onHover, onHoverEnd }: EventChipProps): JSX.Element {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (onHover) {
      const rect = e.currentTarget.getBoundingClientRect();
      onHover(event, rect);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // prevent date-cell click from firing
        onClick(event);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100
                 hover:bg-amber-200 transition-all cursor-pointer
                 hover:scale-105 active:scale-95"
      title={event.title}
      aria-label={`View event: ${event.title}`}
    >
      {/* Featured events get a star indicator */}
      {event.is_featured ? (
        <Star className="w-3 h-3 flex-shrink-0 fill-amber-500 text-amber-500" />
      ) : (
        <CalendarIcon className="w-3 h-3 flex-shrink-0 text-amber-600" />
      )}
    </button>
  );
}
