-- ============================================================
-- 038: Add Facebook Link to Bookings and Events
-- ============================================================

-- Add facebook_link to hub_bookings
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS facebook_link VARCHAR(255);

-- Add facebook_link to events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS facebook_link VARCHAR(255);

-- Add facebook_link to hub_events
ALTER TABLE hub_events 
ADD COLUMN IF NOT EXISTS facebook_link VARCHAR(255);
