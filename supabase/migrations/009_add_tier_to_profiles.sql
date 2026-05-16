-- ============================================================
-- 009: Add Tier Column to Profiles Table
-- Restricts full accounts to paid subscribers only
-- ============================================================

-- Add tier column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'SUBSCRIBER' 
CHECK (tier IN ('WALK_IN', 'SUBSCRIBER'));

-- Update existing profiles to SUBSCRIBER (assuming existing users are members)
UPDATE profiles 
SET tier = 'SUBSCRIBER' 
WHERE tier IS NULL;

-- Add phone_number column if it doesn't exist (for linking walk-ins)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

-- Create index on phone_number for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);

-- Add index on tier for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);

-- Update RLS policies to allow creating walk-in profiles without auth
CREATE POLICY "Anyone can create walk-in profile" ON profiles
  FOR INSERT
  WITH CHECK (
    tier = 'WALK_IN' AND 
    phone_number IS NOT NULL AND
    auth.uid() IS NULL
  );

-- Update existing policy to allow walk-in profile creation
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR
    (tier = 'WALK_IN' AND phone_number IS NOT NULL)
  );

-- Function to find or create walk-in profile by phone number
CREATE OR REPLACE FUNCTION get_or_create_walk_in_profile(
  p_phone_number VARCHAR,
  p_full_name VARCHAR,
  p_email VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Try to find existing profile by phone number
  SELECT id INTO profile_id
  FROM profiles
  WHERE phone_number = p_phone_number
  LIMIT 1;
  
  -- If not found, create a new walk-in profile
  IF profile_id IS NULL THEN
    INSERT INTO profiles (id, full_name, phone_number, tier, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      p_full_name,
      p_phone_number,
      'WALK_IN',
      'user',
      NOW(),
      NOW()
    )
    RETURNING id INTO profile_id;
  ELSE
    -- Update existing profile with new info
    UPDATE profiles
    SET 
      full_name = COALESCE(p_full_name, full_name),
      updated_at = NOW()
    WHERE id = profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
