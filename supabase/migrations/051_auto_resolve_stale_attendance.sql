-- =============================================================
-- Migration: Auto-resolve stale check-ins on a rolling schedule
-- Purpose:
--   The Analytics dashboard surfaced that 79 of 80 'active' rows and all
--   83 'pending_entrance' rows in hub_attendance predate today — every
--   check-in that isn't personally confirmed and checked out by staff
--   piles up forever. Two causes:
--
--   1. `pending_entrance` requires a Secretariat staff member to
--      personally tap "Confirm" before someone counts as on the floor.
--      In practice this basically never happens, so live-attendance
--      features (the homepage event badge, Analytics' "Active Now") have
--      been undercounting real visits this whole time.
--   2. The only cleanup tools were `nightly_checkout_all()` (a
--      calendar-day boundary, never actually scheduled anywhere — dead
--      code, verified via full-codebase search) and the admin's manual
--      "Check Out Everyone" button (`clear_all_active()`), which is
--      scoped to `check_in_time::DATE = CURRENT_DATE` — it can only ever
--      clear *today's* stragglers, never reach back to fix older ones,
--      and depends on staff remembering to click it.
--
--   The hub is moving toward 24/7 operation, so a midnight cutoff is the
--   wrong model going forward regardless — a real overnight session
--   shouldn't be force-closed just because the calendar rolled over.
--   This replaces the day-boundary logic with rolling, duration-based
--   thresholds measured from each row's own timestamps:
--
--   - A kiosk check-in means the visitor is already physically on-site,
--     so `pending_entrance` auto-promotes to `active` after 5 minutes if
--     no staff member acts on it — confirmed_by is left NULL (rather than
--     set to a staff id) specifically so this is distinguishable from a
--     real personal confirmation.
--   - `active` auto-closes after 12 hours untouched — long enough that a
--     genuine long or overnight session isn't cut short, short enough
--     that a forgotten checkout doesn't linger for weeks. checked_out_by
--     is likewise left NULL to mark it as system-driven, not staff-driven.
--
--   AdminDashboard.tsx's Live Floor list now shows a "Not personally
--   verified" / "Auto checked-out" badge on any row resolved this way, so
--   staff can still tell at a glance which ones they should double-check
--   in person — the point isn't to hide the gap, just to stop the system
--   getting stuck on it.
-- =============================================================

-- -----------------------------------------------
-- 1. Superseded by auto_resolve_stale_attendance() below — never actually
--    scheduled anywhere, and its calendar-day boundary is the wrong model
--    for a hub moving toward 24/7 operation.
-- -----------------------------------------------
DROP FUNCTION IF EXISTS nightly_checkout_all();

-- -----------------------------------------------
-- 2. Rolling, duration-based cleanup
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION auto_resolve_stale_attendance()
RETURNS TABLE(auto_confirmed INTEGER, auto_checked_out INTEGER) AS $$
DECLARE
  confirmed_count INTEGER;
  checked_out_count INTEGER;
BEGIN
  UPDATE hub_attendance
  SET status = 'active',
      confirmed_at = now(),
      notes = COALESCE(notes || ' | ', '') || 'Auto-confirmed (no staff action within 5 min)'
  WHERE status = 'pending_entrance'
    AND check_in_time < now() - interval '5 minutes';
  GET DIAGNOSTICS confirmed_count = ROW_COUNT;

  UPDATE hub_attendance
  SET status = 'checked_out',
      check_out_time = now(),
      notes = COALESCE(notes || ' | ', '') || 'Auto checked-out (active 12h+ with no staff checkout)'
  WHERE status = 'active'
    AND COALESCE(confirmed_at, check_in_time) < now() - interval '12 hours';
  GET DIAGNOSTICS checked_out_count = ROW_COUNT;

  RETURN QUERY SELECT confirmed_count, checked_out_count;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- -----------------------------------------------
-- 3. Schedule it — every 2 minutes, so the 5-minute pending_entrance
--    grace period is honored fairly tightly (worst case ~7 minutes).
-- -----------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'auto-resolve-stale-attendance',
  '*/2 * * * *',
  $$SELECT auto_resolve_stale_attendance();$$
);

-- -----------------------------------------------
-- 4. Clear the current backlog immediately rather than waiting for the
--    first scheduled run.
-- -----------------------------------------------
SELECT auto_resolve_stale_attendance();
