-- =============================================================
-- Migration: Tell guests when their schedule was changed
-- Purpose:
--   Admins sometimes change a schedule after talking to the guest (phone
--   call, then edit). The guest's ticket didn't reflect that cleanly:
--     - Event proposals: approving opens the event form, and the admin's
--       edited dates go into the new calendar event — but the proposal
--       row (what the ticket reads) keeps the dates originally submitted.
--       The ticket showed the old schedule with an "Approved" badge while
--       the calendar showed the new one.
--     - Bookings: an admin edit changes the booking row directly, so the
--       ticket showed the new time, but nothing said it had changed.
--
--   Proposals: the lookup now also returns the published event's title,
--   dates and status (joined via published_event_id), so the ticket can
--   show the real final schedule — and keeps following later edits.
--
--   Bookings: a trigger remembers the schedule as it was first booked the
--   moment an admin (or anyone) changes the date/time, so the ticket can
--   say "Schedule updated — originally ...". Editing it back to the
--   original clears the note.
-- =============================================================

-- ── 1. Remember a booking's original schedule ───────────────────────
ALTER TABLE hub_bookings
  ADD COLUMN IF NOT EXISTS original_booking_date DATE,
  ADD COLUMN IF NOT EXISTS original_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_end_time TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION track_booking_reschedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_date IS DISTINCT FROM OLD.booking_date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    -- First change: remember what the guest originally booked. Later
    -- changes keep that first value, so the note always says "originally".
    IF OLD.original_start_time IS NULL THEN
      NEW.original_booking_date := OLD.booking_date;
      NEW.original_start_time := OLD.start_time;
      NEW.original_end_time := OLD.end_time;
    END IF;
    -- Changed back to the original: nothing to report anymore.
    IF NEW.booking_date = NEW.original_booking_date
       AND NEW.start_time = NEW.original_start_time
       AND NEW.end_time = NEW.original_end_time THEN
      NEW.original_booking_date := NULL;
      NEW.original_start_time := NULL;
      NEW.original_end_time := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_booking_reschedule ON hub_bookings;
CREATE TRIGGER trg_track_booking_reschedule
  BEFORE UPDATE OF booking_date, start_time, end_time ON hub_bookings
  FOR EACH ROW EXECUTE FUNCTION track_booking_reschedule();

-- ── 2. Lookups return the schedule info ─────────────────────────────
-- RETURNS TABLE can't change via CREATE OR REPLACE, so drop and recreate
-- (which also drops the grants — SECURITY DEFINER, search_path and GRANT
-- are all restated; see MIGRATION_CHECKLIST.md). Everything 067 added to
-- these functions (status_reason/note/changed_by) is carried over.

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
  status_changed_by text,
  original_booking_date date,
  original_start_time timestamptz,
  original_end_time timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.booking_reference, b.guest_name, b.guest_email, b.guest_phone,
    b.booking_date, b.start_time, b.end_time, b.status,
    b.booking_type, b.gathering_type, b.group_size, p.name,
    b.status_reason, b.status_note, b.status_changed_by,
    b.original_booking_date, b.original_start_time, b.original_end_time
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
  status_changed_by text,
  published_title text,
  published_event_dates jsonb,
  published_event_status text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.proposal_reference, e.organizer_name, e.organizer_email, e.organizer_phone,
    e.title, e.event_dates, e.status, e.facebook_page,
    e.status_reason, e.status_note, e.status_changed_by,
    ev.title, ev.event_dates, ev.status
  FROM hub_events e
  LEFT JOIN events ev ON ev.id = e.published_event_id
  WHERE
    (p_reference IS NOT NULL AND e.proposal_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND e.organizer_email = p_email)
  ORDER BY e.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_event_proposal(text, text) TO anon, authenticated;
