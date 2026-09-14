-- Make your account an admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'rc.romarez@my.smciligan.edu.ph'
   OR id = 'becf9734-52de-42dc-be34-9735afb105fd';

-- Verify you're now an admin
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'rc.romarez@my.smciligan.edu.ph';

-- If no profile exists, create one as admin
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'becf9734-52de-42dc-be34-9735afb105fd',
  'rc.romarez@my.smciligan.edu.ph',
  'Reyche Romarez',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- Final check
SELECT * FROM profiles WHERE role = 'admin';
