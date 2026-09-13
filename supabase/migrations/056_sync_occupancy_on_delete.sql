-- =============================================================
-- Migration: Recompute daily_occupancy when a hub_bookings row is deleted
-- Purpose:
--   sync_daily_occupancy() only ran on INSERT and UPDATE
--   (005_hub_capacity_packages.sql) — there was never an AFTER DELETE
--   trigger. AdminEventCard.tsx's "Cancel" and "Delete" actions both
--   DELETE the EVT-<eventId> shadow hub_bookings rows an event's
--   "Expected Guests" reserved, so daily_occupancy.total_booked_seats
--   (what PublicCalendar.tsx actually displays as "Reserved: X/Y") was
--   never decremented — the calendar kept showing the old reserved
--   count until some unrelated insert/update on that date happened to
--   force a recompute.
--
--   The function itself can't just be reused as-is for a DELETE trigger:
--   it unconditionally reads NEW.booking_date first via
--   COALESCE(NEW.booking_date, OLD.booking_date), and NEW is unassigned
--   during a DELETE, which raises "record 'new' is not assigned yet".
--   This rewrites it to branch on TG_OP instead.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_daily_occupancy()
RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS trg_sync_occupancy_delete ON hub_bookings;
CREATE TRIGGER trg_sync_occupancy_delete
  AFTER DELETE ON hub_bookings
  FOR EACH ROW EXECUTE FUNCTION sync_daily_occupancy();
