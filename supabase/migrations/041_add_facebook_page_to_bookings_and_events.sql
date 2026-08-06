-- =============================================================
-- Migration: Add facebook_page column to bookings and events
-- Purpose:   Track Facebook page/name for easier contact
-- =============================================================

-- Add facebook_page column to hub_bookings table
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS facebook_page VARCHAR(255);

-- Add comment
COMMENT ON COLUMN hub_bookings.facebook_page IS 'Facebook page or profile name for easier contact';

-- Add facebook_page column to hub_events table
ALTER TABLE hub_events 
ADD COLUMN IF NOT EXISTS facebook_page VARCHAR(255);

-- Add comment
COMMENT ON COLUMN hub_events.facebook_page IS 'Facebook page or profile name for easier contact';
