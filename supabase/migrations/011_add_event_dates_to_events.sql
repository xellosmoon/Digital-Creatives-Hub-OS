-- Add event_dates column to events table for multiple dates/times support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'event_dates'
  ) THEN
    ALTER TABLE events ADD COLUMN event_dates JSONB NOT NULL DEFAULT '[{"date": "", "start_time": "", "end_time": ""}]';
  END IF;
END $$;
