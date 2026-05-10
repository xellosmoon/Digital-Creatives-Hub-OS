-- First, find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then create your admin profile (replace the ID and email)
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'YOUR-USER-ID-HERE',  -- Copy the ID from the query above
  'your-email@example.com',
  'Your Name',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- Verify it worked
SELECT * FROM profiles WHERE email = 'your-email@example.com';
