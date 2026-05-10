-- Make a user an admin
-- Replace 'your-email@example.com' with your actual email

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'your-email@example.com';
