-- First, check the column types
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('start_time', 'end_time');

-- Check current data
SELECT 
  booking_reference,
  start_time,
  end_time,
  pg_typeof(start_time) as start_type,
  pg_typeof(end_time) as end_type
FROM bookings
WHERE status = 'approved';

-- If the columns are TIME type, we need to alter them to TIMESTAMP
-- First, add temporary columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP WITH TIME ZONE;

-- Set the datetime values for May 10 and 11
UPDATE bookings
SET 
  start_datetime = '2026-05-10 17:00:00+00',
  end_datetime = '2026-05-10 20:00:00+00'
WHERE booking_reference = '8T0X5OUD';

UPDATE bookings
SET 
  start_datetime = '2026-05-11 08:00:00+00',
  end_datetime = '2026-05-11 12:00:00+00'
WHERE booking_reference = '0N978JDC';

-- Drop old columns and rename new ones
ALTER TABLE bookings 
DROP COLUMN start_time,
DROP COLUMN end_time;

ALTER TABLE bookings 
RENAME COLUMN start_datetime TO start_time;

ALTER TABLE bookings 
RENAME COLUMN end_datetime TO end_time;

-- Verify the fix
SELECT 
  booking_reference,
  start_time,
  end_time,
  status
FROM bookings
WHERE status = 'approved';
