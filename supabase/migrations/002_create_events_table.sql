-- =============================================================
-- Migration: Create a dedicated `events` table
-- Purpose:   Decouple public events from the bookings table so
--            that events have their own lifecycle, poster images,
--            and registration data.
-- =============================================================

CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  poster_url      TEXT,                       -- URL to event poster image
  registration_link TEXT,                     -- External registration URL (Forms, Eventbrite, etc.)
  organizer       VARCHAR(255),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  space_id        UUID REFERENCES spaces(id) ON DELETE SET NULL,
  start_time      TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time        TIMESTAMP WITH TIME ZONE NOT NULL,
  is_featured     BOOLEAN DEFAULT false,      -- Highlight on homepage / calendar
  status          TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_start_time   ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status       ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_featured     ON events(is_featured) WHERE is_featured = true;

-- Ensure the shared updated_at helper exists (may already exist from 001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on row change
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS --
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can read published events
CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (status = 'published');

-- Only admins can insert / update / delete events
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed a sample event so the UI is not empty during development
INSERT INTO events (title, description, poster_url, registration_link, organizer, contact_email, space_id, start_time, end_time, is_featured, status)
SELECT
  'Vibe Coding Workshop',
  'A hands-on coding workshop where creatives learn to build interactive web experiences. Bring your laptop and curiosity!',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
  'https://forms.gle/example-registration',
  'Digital Creatives Hub',
  'hello@digitalcreativeshub.com',
  s.id,
  '2025-05-15 14:00:00+08',
  '2025-05-15 17:00:00+08',
  true,
  'published'
FROM spaces s
WHERE s.name = 'Main Event Hall'
LIMIT 1;
