-- =============================================================
-- Migration: Track which group booking was promoted to which event
-- Purpose:
--   BookingApprovalCard.tsx's "Promote to Event" flow creates a new
--   `events` row (linked back via events.promoted_booking_id) but never
--   updates the source hub_bookings row, so it stays status = 'pending'
--   forever — showing up in the admin queue as if it still needs
--   approval, even after it has already become a published event.
--
--   This mirrors published_event_id on hub_events (migration 052) so the
--   same "one button both creates the event AND marks the source row as
--   resolved" pattern can be used for group bookings.
-- =============================================================

ALTER TABLE hub_bookings
  ADD COLUMN IF NOT EXISTS promoted_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL;

COMMENT ON COLUMN hub_bookings.promoted_to_event_id IS 'The events row this booking was promoted to via "Promote to Event", once the admin completes the pre-filled publish flow. NULL means not promoted.';

CREATE INDEX IF NOT EXISTS idx_hub_bookings_promoted_to_event ON hub_bookings(promoted_to_event_id) WHERE promoted_to_event_id IS NOT NULL;
