-- Re-enable RLS on hub_gallery with proper public access policy
-- This ensures both authenticated and anonymous users see the same gallery images

-- First, re-enable RLS if it was disabled
ALTER TABLE hub_gallery ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable public read access" ON hub_gallery;
DROP POLICY IF EXISTS "Anyone can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Public can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can insert gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can update gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON hub_gallery;

-- Create a policy that allows both anon and authenticated users to view active images
-- This ensures consistent gallery display regardless of login status
CREATE POLICY "Public can view active gallery images"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Disable write operations for now to prevent RLS issues
-- You can re-enable these later once the profiles table is properly configured
CREATE POLICY "No insert allowed" ON hub_gallery FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No update allowed" ON hub_gallery FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No delete allowed" ON hub_gallery FOR DELETE TO anon, authenticated USING (false);
