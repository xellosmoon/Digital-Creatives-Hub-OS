-- ============================================================
-- 015: Booking Enhancements - Group Bookings & Purpose Field
-- ============================================================

-- Add purpose field to hub_attendance table
ALTER TABLE hub_attendance ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add group booking fields to hub_bookings table
ALTER TABLE hub_bookings ADD COLUMN IF NOT EXISTS group_size INTEGER;
ALTER TABLE hub_bookings ADD COLUMN IF NOT EXISTS booking_type TEXT 
  CHECK (booking_type IN ('individual', 'group', 'event'));

-- Set default booking_type for existing records
UPDATE hub_bookings SET booking_type = 'individual' WHERE booking_type IS NULL;

-- Add index for booking_type
CREATE INDEX IF NOT EXISTS idx_hub_bookings_type ON hub_bookings(booking_type);

-- Add comments for documentation
COMMENT ON COLUMN hub_attendance.purpose IS 'Purpose of visit: explore, coworking, meeting, equipment, content creation, research, collaboration, event, virtual office, other';
COMMENT ON COLUMN hub_bookings.group_size IS 'Number of people in group booking (null for individual bookings)';
COMMENT ON COLUMN hub_bookings.booking_type IS 'Type of booking: individual, group, or event';
