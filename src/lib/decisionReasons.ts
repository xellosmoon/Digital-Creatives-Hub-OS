/**
 * Preset reasons for closing out a booking or event proposal — shown to the
 * admin when they reject/cancel, and to a guest when they cancel their own.
 * Stored as the label itself (status_reason) plus an optional free-text
 * status_note, so the guest's ticket and any admin report read the same
 * way without needing a lookup table.
 */

export const OTHER_REASON = 'Other';

export const BOOKING_ADMIN_REASONS: string[] = [
  'Fully booked for that date/time',
  'Schedule conflict with another event',
  'Hub is closed or unavailable that day',
  'Requested equipment is unavailable',
  'Details were incomplete or unclear',
  "We couldn't reach you to confirm",
  'Duplicate request',
  OTHER_REASON,
];

export const PROPOSAL_ADMIN_REASONS: string[] = [
  'Schedule conflict with another event',
  'Venue is unavailable on those dates',
  "Doesn't fit the Hub's programs",
  'We need more details about the event',
  "We couldn't reach you to confirm",
  'Duplicate proposal',
  OTHER_REASON,
];

export const GUEST_CANCEL_REASONS: string[] = [
  'My plans changed',
  'Booked by mistake',
  'Found another option',
  OTHER_REASON,
];

export interface DecisionReason {
  reason: string;
  note: string;
}

export type StatusChangedBy = 'guest' | 'admin';

/** Fields a booking/proposal row carries once it's been closed out. */
export interface StatusDecision {
  status_reason?: string | null;
  status_note?: string | null;
  status_changed_by?: StatusChangedBy | null;
}

/** One readable line for a ticket/card: "Fully booked — note text". */
export function describeDecision(d: StatusDecision): string | null {
  const parts = [d.status_reason, d.status_note].filter((p): p is string => !!p && p.trim().length > 0);
  return parts.length > 0 ? parts.join(' — ') : null;
}
