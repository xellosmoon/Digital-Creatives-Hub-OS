-- Add organization column to events table
-- This allows storing the organization name separately from the individual organizer name

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'organization'
  ) THEN
    ALTER TABLE events ADD COLUMN organization VARCHAR(255);
  END IF;
END $$;
