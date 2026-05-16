-- Create hub_events table for event proposals
CREATE TABLE IF NOT EXISTS hub_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Organizer Details
  organizer_name TEXT NOT NULL,
  organizer_email TEXT NOT NULL,
  organizer_phone TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  
  -- Event Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_guests INTEGER,
  
  -- Event Dates & Times (JSONB array of objects with date, start_time, end_time)
  event_dates JSONB NOT NULL DEFAULT '[{"date": "", "start_time": "", "end_time": ""}]',
  
  -- PCIDA Creative Domains (array)
  creative_domains TEXT[] NOT NULL DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_hub_events_status ON hub_events(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_hub_events_created_at ON hub_events(created_at DESC);

-- Enable RLS
ALTER TABLE hub_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert" ON hub_events;
DROP POLICY IF EXISTS "Allow authenticated read" ON hub_events;
DROP POLICY IF EXISTS "Allow admin full access" ON hub_events;

-- Allow public access for inserting proposals (no login required)
CREATE POLICY "Allow public insert" ON hub_events FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view proposals
CREATE POLICY "Allow authenticated read" ON hub_events FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins full access
CREATE POLICY "Allow admin full access" ON hub_events USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_hub_events_updated_at
  BEFORE UPDATE ON hub_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
