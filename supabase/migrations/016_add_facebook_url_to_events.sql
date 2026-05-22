-- =============================================================
-- Migration: Add facebook_post_url to events table
-- Purpose:   Allow events to link back to their Facebook posts
-- =============================================================

-- Add facebook_post_url column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS facebook_post_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.facebook_post_url IS 'URL to the original Facebook post for this event';
