/**
 * Single source of truth for event categories — colors, labels, and the
 * one place that reads `events.category`. Previously each of
 * PublicCalendar.tsx, EventDetailsModal.tsx, and EventPopover.tsx
 * independently guessed a category from keywords in the event's title,
 * so a color could differ between the calendar grid and the details
 * modal and an admin had no way to actually choose one. Events now carry
 * a real `category` column (062_add_event_category_and_hide_pending.sql)
 * set explicitly in EventFormModal.tsx.
 */

export type EventCategory = 'tech_dev' | 'workshops' | 'community' | 'other';

export const EVENT_CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: 'tech_dev', label: 'Tech & Dev' },
  { value: 'workshops', label: 'Workshops' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
];

interface CategoryStyle {
  /** Small dot used for the day-cell category hints. */
  dot: string;
  /** Background + border for pill-shaped badges/chips. */
  chip: string;
  text: string;
  /** For headers, hero accents, and full-bleed panels. */
  gradient: string;
}

const CATEGORY_STYLES: Record<EventCategory, CategoryStyle> = {
  tech_dev: {
    dot: 'bg-cyan-500',
    chip: 'bg-cyan-500/10 border-cyan-300/50',
    text: 'text-cyan-700',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
  },
  workshops: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 border-amber-300/50',
    text: 'text-amber-700',
    gradient: 'from-orange-500 via-amber-500 to-red-500',
  },
  community: {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 border-emerald-300/50',
    text: 'text-emerald-700',
    gradient: 'from-emerald-500 via-teal-500 to-green-500',
  },
  other: {
    dot: 'bg-blue-500',
    chip: 'bg-blue-50 border-blue-200',
    text: 'text-blue-600',
    gradient: 'from-blue-500 via-cyan-500 to-indigo-500',
  },
};

/** Narrows an event's raw `category` column to a known value, defaulting
 *  to 'other' for anything unexpected (should only matter for rows from
 *  before the column existed, if a migration was ever skipped). */
export function normalizeEventCategory(category: string | null | undefined): EventCategory {
  if (category === 'tech_dev' || category === 'workshops' || category === 'community') return category;
  return 'other';
}

export function getEventCategoryLabel(category: string | null | undefined): string {
  return EVENT_CATEGORY_OPTIONS.find((o) => o.value === normalizeEventCategory(category))!.label;
}

export function getEventCategoryStyle(category: string | null | undefined): CategoryStyle {
  return CATEGORY_STYLES[normalizeEventCategory(category)];
}
