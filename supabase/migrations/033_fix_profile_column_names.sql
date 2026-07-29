-- Fix profile column names to match frontend expectations
-- The frontend expects 'phone' but the database has 'phone_number'

-- Rename phone_number to phone to match frontend expectations
-- PostgreSQL RENAME COLUMN doesn't support IF EXISTS, so we check first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE profiles RENAME COLUMN phone_number TO phone;
    END IF;
END $$;

-- Ensure email column exists (it might not exist in some schema versions)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Ensure tier column exists (should exist from migration 009)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'SUBSCRIBER' CHECK (tier IN ('WALK_IN', 'SUBSCRIBER'));

-- Update existing profiles to have email from auth.users if missing
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;
