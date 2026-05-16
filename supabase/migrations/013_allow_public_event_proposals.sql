-- Allow public inserts for event proposals
-- This enables non-authenticated users to submit event proposals

-- Enable RLS on hub_events table
ALTER TABLE hub_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert event proposals
CREATE POLICY allow_public_event_proposals
  ON hub_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow anyone to read event proposals
CREATE POLICY allow_public_read_events
  ON hub_events
  FOR SELECT
  TO public
  USING (true);
