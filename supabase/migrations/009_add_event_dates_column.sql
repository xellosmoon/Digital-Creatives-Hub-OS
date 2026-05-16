-- Add event_dates column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hub_events' 
    AND column_name = 'event_dates'
  ) THEN
    ALTER TABLE hub_events ADD COLUMN event_dates JSONB NOT NULL DEFAULT '[{"date": "", "start_time": "", "end_time": ""}]';
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert" ON hub_events;
DROP POLICY IF EXISTS "Allow authenticated read" ON hub_events;
DROP POLICY IF EXISTS "Allow admin full access" ON hub_events;

-- Allow public (anonymous) access for inserting proposals (no login required)
CREATE POLICY "Allow public insert" ON hub_events FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view proposals
CREATE POLICY "Allow authenticated read" ON hub_events FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins full access (SELECT, UPDATE, DELETE)
CREATE POLICY "Allow admin full access" ON hub_events FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

