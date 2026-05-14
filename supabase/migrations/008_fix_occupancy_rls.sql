-- =============================================================
-- Fix: sync_daily_occupancy() trigger blocked by RLS
-- Root cause: trigger runs in the caller's security context, so
--   non-admin users inserting into hub_bookings cannot write to
--   daily_occupancy (only admins have write access).
-- Fix: recreate the function with SECURITY DEFINER so it always
--   runs as the function owner (superuser), bypassing RLS.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_daily_occupancy()
RETURNS TRIGGER
SECURITY DEFINER          -- ← the fix: run as function owner
SET search_path = public  -- best practice with SECURITY DEFINER
AS $$
DECLARE
  target DATE;
BEGIN
  target := COALESCE(NEW.booking_date, OLD.booking_date);

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
