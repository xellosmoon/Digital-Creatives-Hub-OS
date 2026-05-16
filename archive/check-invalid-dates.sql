-- Check bookings with invalid or null dates
SELECT 
  id,
  booking_reference,
  start_time,
  end_time,
  status,
  guest_name,
  created_at
FROM bookings
WHERE booking_reference IN ('8T0X5OUD', '0N978JDC');

-- Check all approved bookings
SELECT 
  id,
  booking_reference,
  start_time,
  end_time,
  status,
  space_id
FROM bookings
WHERE status = 'approved'
ORDER BY created_at DESC;

-- Fix the invalid dates (set them to a valid future date for testing)
UPDATE bookings
SET 
  start_time = NOW() + INTERVAL '1 day',
  end_time = NOW() + INTERVAL '1 day' + INTERVAL '2 hours'
WHERE start_time IS NULL 
   OR end_time IS NULL
   OR booking_reference IN ('8T0X5OUD', '0N978JDC');
