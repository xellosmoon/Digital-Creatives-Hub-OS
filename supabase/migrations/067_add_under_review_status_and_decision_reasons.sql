-- =============================================================
-- Migration: "Under review" status, decision reasons, guest cancellation
-- Purpose:
--   1. Bookings and event proposals only had pending -> approved/rejected,
--      so a guest had no way to tell "nobody has looked at this yet" from
--      "an admin is working on it right now". Adds an 'under_review'
--      status between the two for both tables.
--   2. hub_events (event proposals) had no 'cancelled' status at all, so a
--      proposal withdrawn by its organizer would have been
--      indistinguishable from one an admin turned down.
--   3. Rejecting or cancelling used to store nothing about why. Adds
--      status_reason (a preset label), status_note (optional free text)
--      and status_changed_by ('guest' | 'admin') to both tables so the
--      guest sees why on their ticket and admins can report on it.
--   4. Guests can now cancel their own booking/proposal from the ticket,
--      via SECURITY DEFINER functions that require the reference AND the
--      email to match (same "prove you know it" model as the lookup).
--   5. Cancelling or rejecting a booking never released the equipment
--      reserved alongside it (borrowings.booking_id) — those rows stayed
--      pending/approved, holding the physical units. A trigger now
--      cancels them whenever a booking is cancelled/rejected, whether an
--      admin or a guest did it.
-- =============================================================

-- ── 1. Allow the new statuses ───────────────────────────────────────
-- Constraint names weren't set explicitly when these tables were created,
-- so find the status CHECK by its definition instead of guessing a name.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'hub_bookings'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%pending%'
  LOOP
    EXECUTE format('ALTER TABLE hub_bookings DROP CONSTRAINT %I', c.conname);
  END LOOP;

  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'hub_events'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%pending_review%'
  LOOP
    EXECUTE format('ALTER TABLE hub_events DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE hub_bookings ADD CONSTRAINT hub_bookings_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'active', 'completed', 'cancelled', 'rejected'));

ALTER TABLE hub_events ADD CONSTRAINT hub_events_status_check
  CHECK (status IN ('pending_review', 'under_review', 'approved', 'rejected', 'archived', 'cancelled'));

-- ── 2. Why a request was rejected/cancelled, and by whom ────────────
ALTER TABLE hub_bookings
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_note TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_by TEXT CHECK (status_changed_by IN ('guest', 'admin'));

ALTER TABLE hub_events
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_note TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_by TEXT CHECK (status_changed_by IN ('guest', 'admin'));

-- ── 3. Release reserved equipment when a booking is closed out ──────
-- SECURITY DEFINER because a guest's cancel (via cancel_hub_booking
-- below) has no direct write access to borrowings, and an admin's
-- booking update shouldn't depend on which borrowings policies apply.
CREATE OR REPLACE FUNCTION cancel_borrowings_on_booking_close()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE borrowings
    SET status = 'cancelled'
    WHERE booking_id = NEW.id AND status IN ('pending', 'approved');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cancel_borrowings_on_booking_close ON hub_bookings;
CREATE TRIGGER trg_cancel_borrowings_on_booking_close
  AFTER UPDATE OF status ON hub_bookings
  FOR EACH ROW EXECUTE FUNCTION cancel_borrowings_on_booking_close();

-- ── 4. Guest self-cancellation ──────────────────────────────────────
-- A booking can be cancelled by its guest until it's been completed, but
-- not once an admin has promoted it into a published calendar event
-- (that needs an admin to take the event down too). A proposal can only
-- be withdrawn before it's approved — approving it publishes an event.

CREATE OR REPLACE FUNCTION cancel_hub_booking(p_reference text, p_email text, p_reason text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE hub_bookings
  SET status = 'cancelled',
      status_reason = NULLIF(trim(p_reason), ''),
      status_note = NULLIF(trim(p_note), ''),
      status_changed_by = 'guest',
      updated_at = NOW()
  WHERE booking_reference = upper(p_reference)
    AND lower(guest_email) = lower(p_email)
    AND status IN ('pending', 'under_review', 'approved')
    AND promoted_to_event_id IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cancel_hub_booking(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION cancel_event_proposal(p_reference text, p_email text, p_reason text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE hub_events
  SET status = 'cancelled',
      status_reason = NULLIF(trim(p_reason), ''),
      status_note = NULLIF(trim(p_note), ''),
      status_changed_by = 'guest',
      updated_at = NOW()
  WHERE proposal_reference = upper(p_reference)
    AND lower(organizer_email) = lower(p_email)
    AND status IN ('pending_review', 'under_review');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cancel_event_proposal(text, text, text, text) TO anon, authenticated;

-- ── 5. Lookups now also return the decision reason ──────────────────
-- A function's RETURNS TABLE shape can't change via CREATE OR REPLACE, so
-- these are dropped and recreated — which also drops their grants, so
-- SECURITY DEFINER, search_path and GRANT are all restated (see
-- MIGRATION_CHECKLIST.md).

DROP FUNCTION IF EXISTS lookup_hub_booking(text, text);
CREATE FUNCTION lookup_hub_booking(p_reference text, p_email text)
RETURNS TABLE (
  booking_reference text,
  guest_name text,
  guest_email text,
  guest_phone text,
  booking_date date,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  booking_type text,
  gathering_type text,
  group_size integer,
  package_name text,
  status_reason text,
  status_note text,
  status_changed_by text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.booking_reference, b.guest_name, b.guest_email, b.guest_phone,
    b.booking_date, b.start_time, b.end_time, b.status,
    b.booking_type, b.gathering_type, b.group_size, p.name,
    b.status_reason, b.status_note, b.status_changed_by
  FROM hub_bookings b
  LEFT JOIN rental_packages p ON p.id = b.package_id
  WHERE
    (p_reference IS NOT NULL AND b.booking_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND b.guest_email = p_email)
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_hub_booking(text, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS lookup_event_proposal(text, text);
CREATE FUNCTION lookup_event_proposal(p_reference text, p_email text)
RETURNS TABLE (
  proposal_reference text,
  organizer_name text,
  organizer_email text,
  organizer_phone text,
  title text,
  event_dates jsonb,
  status text,
  facebook_page text,
  status_reason text,
  status_note text,
  status_changed_by text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.proposal_reference, e.organizer_name, e.organizer_email, e.organizer_phone,
    e.title, e.event_dates, e.status, e.facebook_page,
    e.status_reason, e.status_note, e.status_changed_by
  FROM hub_events e
  WHERE
    (p_reference IS NOT NULL AND e.proposal_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND e.organizer_email = p_email)
  ORDER BY e.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_event_proposal(text, text) TO anon, authenticated;
