-- =============================================================
-- Migration 070: Retire a booking once it has been promoted to an event
-- =============================================================
-- Bug: "Promote to Event" created the calendar event (and, for events
-- with guests, its own EVT-… seat reservation) but left the ORIGINAL
-- booking approved on its original date. So the hub showed the booking's
-- seats as reserved on the old date, the booking still sat in the
-- Approved list, and — even when the dates matched — the same seats were
-- counted twice (booking + event).
--
-- Fix: a promoted booking gets its own terminal status, 'promoted'. The
-- event now owns the reservation. 'promoted' isn't counted as
-- approved/active, so the existing occupancy trigger, get_available_seats
-- and the public calendar all stop counting it automatically.
-- =============================================================

-- ── 1. Allow the new status ──────────────────────────────────────────
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'hub_bookings'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%under_review%'
  LOOP
    EXECUTE format('ALTER TABLE hub_bookings DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE hub_bookings ADD CONSTRAINT hub_bookings_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'active', 'completed', 'cancelled', 'rejected', 'promoted'));

-- ── 2. Clean up bookings that were already promoted ──────────────────
-- events.promoted_booking_id is written together with the event, so it
-- is the more reliable link (promoted_to_event_id is a second step that
-- can fail). Updating the status fires the occupancy trigger, which
-- recomputes the booking's date and frees its seats.
UPDATE hub_bookings b
SET status = 'promoted',
    promoted_to_event_id = COALESCE(b.promoted_to_event_id, e.id),
    updated_at = NOW()
FROM events e
WHERE e.promoted_booking_id = b.id
  AND b.status IN ('approved', 'active');

UPDATE hub_bookings
SET status = 'promoted', updated_at = NOW()
WHERE promoted_to_event_id IS NOT NULL
  AND status IN ('approved', 'active');

-- ── 3. Let the guest's ticket show what their booking became ─────────
-- RETURNS TABLE can't change via CREATE OR REPLACE, so drop and recreate
-- (which also drops the grants — SECURITY DEFINER, search_path and GRANT
-- are all restated; see MIGRATION_CHECKLIST.md). Everything 067/068 added
-- is carried over.
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
  original_end_time timestamptz,
  promoted_event_title text,
  promoted_event_dates jsonb,
  promoted_event_status text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.booking_reference, b.guest_name, b.guest_email, b.guest_phone,
    b.booking_date, b.start_time, b.end_time, b.status,
    b.booking_type, b.gathering_type, b.group_size, p.name,
    b.status_reason, b.status_note, b.status_changed_by,
    b.original_booking_date, b.original_start_time, b.original_end_time,
    ev.title, ev.event_dates, ev.status
  FROM hub_bookings b
  LEFT JOIN rental_packages p ON p.id = b.package_id
  LEFT JOIN events ev ON ev.id = b.promoted_to_event_id
  WHERE
    (p_reference IS NOT NULL AND b.booking_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND b.guest_email = p_email)
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_hub_booking(text, text) TO anon, authenticated;
