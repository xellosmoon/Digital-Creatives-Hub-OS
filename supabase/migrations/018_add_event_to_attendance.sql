-- ============================================================
-- Migration 018: Add event_id to hub_attendance
-- Link check-ins to specific events
-- ============================================================

-- Add event_id column to hub_attendance
ALTER TABLE hub_attendance
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Add index for faster event attendance lookups
CREATE INDEX IF NOT EXISTS idx_hub_attendance_event_id ON hub_attendance(event_id);

-- Add comment
COMMENT ON COLUMN hub_attendance.event_id IS 'Optional link to event if attendee is checking in for a specific event';
