-- Add event fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_public_event BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS event_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_description TEXT,
ADD COLUMN IF NOT EXISTS event_poster_url TEXT,
ADD COLUMN IF NOT EXISTS event_registration_link TEXT,
ADD COLUMN IF NOT EXISTS event_organizer VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_featured_event BOOLEAN DEFAULT false;

-- Create index for faster event queries
CREATE INDEX IF NOT EXISTS idx_bookings_public_events 
ON bookings(is_public_event, status, start_time) 
WHERE is_public_event = true AND status = 'approved';

-- Add some comments for clarity
COMMENT ON COLUMN bookings.is_public_event IS 'Whether this booking should be displayed as a public event';
COMMENT ON COLUMN bookings.event_title IS 'Public-facing title for the event';
COMMENT ON COLUMN bookings.event_poster_url IS 'URL to event poster image';
COMMENT ON COLUMN bookings.event_registration_link IS 'External registration link (Facebook, Google Forms, etc)';
COMMENT ON COLUMN bookings.is_featured_event IS 'Whether to feature this event on the homepage';
