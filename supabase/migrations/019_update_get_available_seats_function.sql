-- ============================================================
-- Migration 019: Update get_available_seats to include active check-ins
-- ============================================================
-- This updates the get_available_seats function to count active check-ins
-- from hub_attendance table in addition to hub_bookings, ensuring that
-- live floor occupancy is reflected in seat availability calculations.

CREATE OR REPLACE FUNCTION get_available_seats(target_date DATE)
RETURNS INTEGER AS $$
DECLARE
  cfg RECORD;
  booked INTEGER;
  active_checkins INTEGER;
  workshop_full BOOLEAN;
BEGIN
  SELECT total_seats, manual_adjustment INTO cfg
  FROM hub_capacity_config LIMIT 1;

  -- Check if full-hub workshop is active
  SELECT
    (COALESCE(workshop_block_q2, false) AND COALESCE(workshop_block_q4, false))
  INTO workshop_full
  FROM daily_occupancy
  WHERE occupancy_date = target_date;

  IF workshop_full IS TRUE THEN
    RETURN 0;
  END IF;

  -- Count seats from approved/active bookings
  SELECT COALESCE(SUM(seats_used), 0) INTO booked
  FROM hub_bookings
  WHERE booking_date = target_date
    AND status IN ('approved', 'active');

  -- Count active check-ins from hub_attendance
  SELECT COUNT(*) INTO active_checkins
  FROM hub_attendance
  WHERE status = 'active'
    AND check_in_time::DATE = target_date;

  RETURN GREATEST(0, cfg.total_seats + cfg.manual_adjustment - GREATEST(booked, active_checkins));
END;
$$ LANGUAGE plpgsql;
