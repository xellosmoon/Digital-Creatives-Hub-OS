-- Show all bookings with user and guest info
SELECT 
  id,
  user_id,
  guest_email,
  guest_name,
  start_time,
  status,
  created_at
FROM bookings
ORDER BY created_at DESC;

-- Check if any bookings match your email
SELECT * FROM bookings
WHERE guest_email = 'rc.romarez@my.smciligan.edu.ph'
   OR user_id = 'becf9734-52de-42dc-be34-9735afb105fd';
