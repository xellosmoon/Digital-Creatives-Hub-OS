-- =============================================================
-- Migration: Add organization column to hub_bookings table
-- Purpose:   Track organization name for bookings
-- =============================================================

-- Add organization column to hub_bookings table
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS organization VARCHAR(255);

-- Add comment
COMMENT ON COLUMN hub_bookings.organization IS 'Organization or company name of the booker';
