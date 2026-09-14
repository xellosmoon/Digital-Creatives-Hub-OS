-- =============================================================
-- Migration: Restore SECURITY DEFINER on sync_daily_occupancy()
-- Purpose:
--   008_fix_occupancy_rls.sql made sync_daily_occupancy() SECURITY
--   DEFINER because the trigger writes to daily_occupancy, which only
--   admins can write to under RLS — without it, a guest (no account)
--   submitting a group booking on hub_bookings gets the trigger's
--   write blocked with "new row violates row-level security policy
--   for table daily_occupancy".
--
--   056_sync_occupancy_on_delete.sql replaced the function to also
--   handle DELETE, but CREATE OR REPLACE FUNCTION redefines the whole
--   function including its security attributes — it didn't re-declare
--   SECURITY DEFINER, so guest group bookings from Facebook's mobile
--   browser (and any other unauthenticated group booking) started
--   hitting this RLS error again on submit.
--
--   This reissues the exact same function body as 056 (DELETE-aware),
--   with SECURITY DEFINER restored.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_daily_occupancy()
RETURNS TRIGGER
SECURITY DEFINER          -- ← restored: run as function owner, bypass RLS
SET search_path = public  -- best practice with SECURITY DEFINER
AS $$
DECLARE
  target DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.booking_date;
  ELSE
    target := NEW.booking_date;
  END IF;

  INSERT INTO daily_occupancy (occupancy_date, total_booked_seats)
  VALUES (
    target,
    (SELECT COALESCE(SUM(seats_used), 0)
     FROM hub_bookings
     WHERE booking_date = target
       AND status IN ('approved', 'active'))
  )
  ON CONFLICT (occupancy_date) DO UPDATE
  SET total_booked_seats = (
    SELECT COALESCE(SUM(seats_used), 0)
    FROM hub_bookings
    WHERE booking_date = target
      AND status IN ('approved', 'active')
  ),
  updated_at = NOW();

  -- Sync workshop blocks
  UPDATE daily_occupancy
  SET
    workshop_block_q2 = EXISTS (
      SELECT 1 FROM hub_bookings
      WHERE booking_date = target
        AND is_workshop = true
        AND 'q2_tech' = ANY(workshop_zones)
        AND status IN ('approved', 'active')
    ),
    workshop_block_q4 = EXISTS (
      SELECT 1 FROM hub_bookings
      WHERE booking_date = target
        AND is_workshop = true
        AND 'q4_creative' = ANY(workshop_zones)
        AND status IN ('approved', 'active')
    )
  WHERE occupancy_date = target;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
