-- ============================================================
-- Migration 021: Add contact fields to hub_team table
-- Allows admin to edit phone and email for team members
-- ============================================================

-- Add phone and email fields to hub_team table
ALTER TABLE hub_team ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE hub_team ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN hub_team.phone IS 'Contact phone number for team member';
COMMENT ON COLUMN hub_team.email IS 'Contact email address for team member';

-- Update existing featured member with contact info if not set
UPDATE hub_team 
SET 
  phone = '0975 670 6143',
  email = 'cdiisiligan@gmail.com'
WHERE is_featured = true 
  AND (phone IS NULL OR email IS NULL);
