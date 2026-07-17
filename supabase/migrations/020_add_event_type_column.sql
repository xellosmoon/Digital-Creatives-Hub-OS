-- =============================================================
-- Migration: Add event_type column to events table
-- Purpose:   Add event categorization for better calendar display
-- =============================================================

-- Add event_type column with CHECK constraint
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_type TEXT
CHECK (event_type IN ('workshop', 'seminar', 'training', 'networking', 'exhibition', 'other'));

-- Set default value for existing events
UPDATE events
SET event_type = 'other'
WHERE event_type IS NULL;

-- Add index for event_type
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Add comment for documentation
COMMENT ON COLUMN events.event_type IS 'Type of event: workshop, seminar, training, networking, exhibition, or other';
