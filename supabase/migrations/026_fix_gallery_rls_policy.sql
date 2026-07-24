-- Drop existing policies to recreate them with correct permissions
DROP POLICY IF EXISTS "Admins can view gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Public can view active gallery images" ON hub_gallery;

-- Recreate policy to allow both anon and authenticated users to view active images
CREATE POLICY "Public can view active gallery images"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
