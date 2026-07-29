-- Drop all existing policies on hub_gallery
DROP POLICY IF EXISTS "Public can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can insert gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can update gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON hub_gallery;

-- Simple policy: Anyone (anon or authenticated) can view active images
CREATE POLICY "Anyone can view active gallery images"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin-only policies for write operations
CREATE POLICY "Admins can insert gallery images"
  ON hub_gallery FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update gallery images"
  ON hub_gallery FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gallery images"
  ON hub_gallery FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
