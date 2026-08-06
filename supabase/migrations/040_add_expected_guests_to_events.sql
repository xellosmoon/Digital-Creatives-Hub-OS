-- =============================================================
-- Migration: Add expected_guests column to events table
-- Purpose:   Track expected attendee count for seat reservation
-- =============================================================

-- Add expected_guests column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS expected_guests INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN events.expected_guests IS 'Expected number of attendees for seat reservation in hub_bookings';
