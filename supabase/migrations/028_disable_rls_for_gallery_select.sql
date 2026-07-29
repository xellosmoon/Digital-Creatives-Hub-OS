-- Disable RLS for SELECT on hub_gallery to allow public access
-- Keep RLS enabled for INSERT, UPDATE, DELETE for admin control

DROP POLICY IF EXISTS "Anyone can view active gallery images" ON hub_gallery;

-- Create a policy that bypasses RLS for SELECT
ALTER TABLE hub_gallery ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all SELECT operations (bypassing RLS)
CREATE POLICY "Enable public read access"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (true);
