-- Check all bookings in the database
SELECT 
  b.id,
  b.user_id,
  b.space_id,
  b.start_time,
  b.end_time,
  b.status,
  b.guest_email,
  b.guest_name,
  s.name as space_name
FROM bookings b
LEFT JOIN spaces s ON b.space_id = s.id
ORDER BY b.created_at DESC
LIMIT 20;

-- Check if your user has any bookings
SELECT COUNT(*) as total_bookings
FROM bookings
WHERE user_id = 'becf9734-52de-42dc-be34-9735afb105fd';

-- Check total bookings in the system
SELECT COUNT(*) as total_bookings_in_system
FROM bookings;
