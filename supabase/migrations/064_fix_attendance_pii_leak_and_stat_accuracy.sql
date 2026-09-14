-- =============================================================
-- Migration: Fix hub_attendance PII leak + inflated homepage stats
-- Purpose:
--   1. "Public read own pending" ON hub_attendance (007_attendance_
--      system.sql) is `USING (true)` — despite its name, it was never
--      scoped to "own" or "pending" at all. It was written for a kiosk
--      "waiting for confirmation" screen that polls its own just-
--      inserted row, but that screen was never actually built (no
--      client code reads hub_attendance by id/mobile_number while
--      waiting) — so this has been a fully open policy with no
--      matching feature behind it. Anyone could read every visitor's
--      full name, mobile number, email, gender, sector, organization,
--      and designation directly from the table, same class of bug as
--      the hub_bookings/hub_events leaks fixed in 062 and 061.
--
--   2. Two homepage stats were counting more than they should:
--      - get_public_hub_booking_count() (062) counted every
--        hub_bookings row regardless of status — pending, rejected,
--        and cancelled bookings all inflated "Bookings Made."
--      - Home.tsx's "Happy Creatives" counted unique mobile numbers
--        from every hub_attendance row including 'rejected' (entry
--        denied) and 'pending_entrance' (never let in) — the same
--        "count only genuine outcomes" bug already fixed for the
--        calendar's "Peak" figure in 063.
--
--   This migration closes the leak and adds narrow SECURITY DEFINER
--   functions for the handful of legitimate public reads: the two
--   homepage stats, the calendar's PII-free attendance totals, and a
--   single event's live "people here now" count.
-- =============================================================

-- ── 1. Close the leak ────────────────────────────────────────────────
-- Admins keep full access via the existing "Admins manage attendance"
-- FOR ALL policy — untouched by this migration.
DROP POLICY IF EXISTS "Public read own pending" ON hub_attendance;

-- ── 2. Accurate "Bookings Made" — only genuine outcomes ──────────────
CREATE OR REPLACE FUNCTION get_public_hub_booking_count()
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM hub_bookings WHERE status IN ('approved', 'active', 'completed');
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_hub_booking_count() TO anon, authenticated;

-- ── 3. Accurate "Happy Creatives" — unique genuine visitors ──────────
CREATE OR REPLACE FUNCTION get_public_happy_creatives_count()
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT mobile_number)::integer
  FROM hub_attendance
  WHERE status IN ('active', 'checked_out');
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_happy_creatives_count() TO anon, authenticated;

-- ── 4. PII-free attendance totals for the public calendar ────────────
-- Replaces PublicCalendar.tsx's direct select('check_in_time, status').
CREATE OR REPLACE FUNCTION get_public_attendance_totals(range_start timestamptz, range_end timestamptz)
RETURNS TABLE (check_in_time timestamptz, status text)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_in_time, status::text
  FROM hub_attendance
  WHERE check_in_time >= range_start AND check_in_time <= range_end;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_attendance_totals(timestamptz, timestamptz) TO anon, authenticated;

-- ── 5. Live "people here now" count for one event ────────────────────
-- Replaces EventCards.tsx's head:true count query — same result, no
-- longer dependent on a table-wide SELECT policy anon shouldn't have.
CREATE OR REPLACE FUNCTION get_live_event_attendance_count(p_event_id uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM hub_attendance WHERE event_id = p_event_id AND status = 'active';
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_live_event_attendance_count(uuid) TO anon, authenticated;
