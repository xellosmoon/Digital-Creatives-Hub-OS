-- Set the first booking to May 10, 2026 at 5:00 PM
UPDATE bookings
SET 
  start_time = '2026-05-10 17:00:00+00',
  end_time = '2026-05-10 20:00:00+00'
WHERE booking_reference = '8T0X5OUD';

-- Set the second booking to May 11, 2026 at 8:00 AM  
UPDATE bookings
SET 
  start_time = '2026-05-11 08:00:00+00',
  end_time = '2026-05-11 12:00:00+00'
WHERE booking_reference = '0N978JDC';

-- Verify the updates
SELECT 
  booking_reference,
  start_time,
  end_time,
  start_time::date as booking_date,
  status
FROM bookings
WHERE status = 'approved'
ORDER BY start_time;
