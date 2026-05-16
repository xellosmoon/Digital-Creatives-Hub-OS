-- Add admin_contacted column to hub_bookings table
-- This tracks whether an admin has contacted the guest about their booking

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hub_bookings' 
    AND column_name = 'admin_contacted'
  ) THEN
    ALTER TABLE hub_bookings ADD COLUMN admin_contacted BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Add a column to track when the admin contacted the guest
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hub_bookings' 
    AND column_name = 'admin_contacted_at'
  ) THEN
    ALTER TABLE hub_bookings ADD COLUMN admin_contacted_at TIMESTAMPTZ;
  END IF;
END $$;
