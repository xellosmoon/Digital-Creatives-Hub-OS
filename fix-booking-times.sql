-- Check the current values
SELECT 
  id,
  booking_reference,
  start_time,
  end_time,
  status,
  created_at
FROM bookings
WHERE status = 'approved';

-- Fix the bookings by adding today's date to the time
-- For booking 8T0X5OUD (17:00:00 to 20:00:00)
UPDATE bookings
SET 
  start_time = CURRENT_DATE + TIME '17:00:00',
  end_time = CURRENT_DATE + TIME '20:00:00'
WHERE booking_reference = '8T0X5OUD';

-- For booking 0N978JDC (08:00:00 to 12:00:00) - set for tomorrow
UPDATE bookings
SET 
  start_time = CURRENT_DATE + INTERVAL '1 day' + TIME '08:00:00',
  end_time = CURRENT_DATE + INTERVAL '1 day' + TIME '12:00:00'
WHERE booking_reference = '0N978JDC';

-- Verify the fix
SELECT 
  booking_reference,
  start_time,
  end_time,
  status
FROM bookings
WHERE status = 'approved';
