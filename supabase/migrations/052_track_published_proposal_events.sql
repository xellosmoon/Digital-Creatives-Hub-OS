-- =============================================================
-- Migration: Track which event proposal became which published event
-- Purpose:
--   EventManagement.tsx's "Approve & Publish" button never actually
--   published anything — handleApproveProposal() only flipped
--   hub_events.status to 'approved' and reserved seats in hub_bookings;
--   it never inserted a row into `events`, so the event never appeared
--   on the public calendar. The admin had to separately use "New Event"
--   and manually re-enter everything via the "Load from Approved
--   Proposal" dropdown.
--
--   That dropdown is also why approved proposals pile up indefinitely —
--   nothing ever marked a proposal as already turned into a real event,
--   so every proposal ever approved stays in the picker forever, even
--   after it's long since been published (or was published from a
--   different, disconnected flow).
--
--   This adds the same kind of linkage `events.promoted_booking_id`
--   already provides for group bookings, so the frontend rework (one
--   button opens the real event form pre-filled, submitting it both
--   creates the event AND marks the source proposal as done) has
--   somewhere to record that link.
-- =============================================================

ALTER TABLE hub_events
  ADD COLUMN IF NOT EXISTS published_event_id UUID REFERENCES events(id) ON DELETE SET NULL;

COMMENT ON COLUMN hub_events.published_event_id IS 'The events row this proposal was published as, once an admin completes the pre-filled Publish flow. NULL means still awaiting publish.';

CREATE INDEX IF NOT EXISTS idx_hub_events_published_event ON hub_events(published_event_id) WHERE published_event_id IS NOT NULL;
