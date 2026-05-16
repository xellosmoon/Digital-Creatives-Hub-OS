-- ============================================================
-- DCIH Equipment + Space Booking Integration
-- Migration: 014_link_equipment_to_bookings.sql
-- ============================================================
-- Allows equipment to be reserved alongside space bookings
-- Adds booking_id to borrowings table for linking

-- -----------------------------------------------
-- 1. ADD booking_id to BORROWINGS
--    Optional link to space bookings
-- -----------------------------------------------
ALTER TABLE borrowings
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- -----------------------------------------------
-- 2. ADD INDEX for booking lookups
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_borrowings_booking_id ON borrowings(booking_id);

-- -----------------------------------------------
-- 3. ADD COMMENT for documentation
-- -----------------------------------------------
COMMENT ON COLUMN borrowings.booking_id IS 'Optional link to space booking. When set, equipment borrowing times must be within the booking time range (validated at application level).';
