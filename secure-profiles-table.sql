-- Update the handle_new_user function to ALWAYS create users with 'user' role
-- This prevents any attempt to register as admin

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'full_name',
    'user'  -- ALWAYS 'user', never 'admin'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a check constraint to ensure role is valid
ALTER TABLE profiles 
ADD CONSTRAINT valid_role 
CHECK (role IN ('user', 'admin'));

-- Create a policy that prevents users from changing their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    -- Users can update everything except role
    (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Only admins can update roles
CREATE POLICY "Only admins can update roles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (true);

-- Verify the constraint
SELECT conname, contype, consrc 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass;
