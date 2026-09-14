-- =============================================================
-- Migration: Add a lookup reference to event proposals
-- Purpose:
--   hub_events (event proposals) has never had anything like
--   hub_bookings.booking_reference — after submitting a proposal, an
--   organizer has no way to check its status themselves; the only path
--   is waiting for an admin email that may or may not arrive. This adds
--   the same kind of 6-character reference hub_bookings already uses
--   (reusing generate_booking_reference(), defined in
--   005_hub_capacity_packages.sql), so proposals can be looked up the
--   same way bookings are, through the same /booking-lookup page.
--
--   The SELECT policy is loosened to match hub_bookings' existing
--   model (public read, since organizer_email is always present) —
--   this doesn't introduce a new class of exposure beyond what's
--   already accepted for hub_bookings, it just extends the same
--   tradeoff to event proposals for consistency.
-- =============================================================

ALTER TABLE hub_events ADD COLUMN IF NOT EXISTS proposal_reference TEXT;

CREATE OR REPLACE FUNCTION trigger_generate_proposal_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.proposal_reference IS NULL THEN
    NEW.proposal_reference := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_proposal_reference ON hub_events;
CREATE TRIGGER trg_generate_proposal_reference
  BEFORE INSERT ON hub_events
  FOR EACH ROW EXECUTE FUNCTION trigger_generate_proposal_reference();

-- Backfill existing proposals so old rows are also look-up-able.
UPDATE hub_events SET proposal_reference = generate_booking_reference() WHERE proposal_reference IS NULL;

CREATE INDEX IF NOT EXISTS idx_hub_events_proposal_reference ON hub_events(proposal_reference);

-- Public lookup by reference/email, same tradeoff hub_bookings already made.
DROP POLICY IF EXISTS "Allow authenticated read" ON hub_events;
CREATE POLICY "Anyone can view event proposals" ON hub_events FOR SELECT USING (true);
