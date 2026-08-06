-- =============================================================
-- Migration: Add promoted_booking_id column to events table
-- Purpose:   Support promoting bookings to events
-- =============================================================

-- Add promoted_booking_id column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS promoted_booking_id UUID REFERENCES hub_bookings(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN events.promoted_booking_id IS 'Reference to the original hub_booking that was promoted to this event';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_promoted_booking ON events(promoted_booking_id) WHERE promoted_booking_id IS NOT NULL;
