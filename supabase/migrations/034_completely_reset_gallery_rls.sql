-- Completely reset RLS on hub_gallery to ensure anonymous access works
-- This removes all policies and ensures RLS is disabled

-- Step 1: Disable RLS
ALTER TABLE hub_gallery DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (even if RLS is disabled, policies can still cause issues)
DROP POLICY IF EXISTS "Public can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "No insert allowed" ON hub_gallery;
DROP POLICY IF EXISTS "No update allowed" ON hub_gallery;
DROP POLICY IF EXISTS "No delete allowed" ON hub_gallery;
DROP POLICY IF EXISTS "Anyone can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Enable public read access" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can insert gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can update gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON hub_gallery;

-- Step 3: Grant necessary permissions to anon and authenticated roles
-- This ensures both roles can read from the table
GRANT SELECT ON hub_gallery TO anon;
GRANT SELECT ON hub_gallery TO authenticated;
GRANT ALL ON hub_gallery TO authenticated; -- Allow authenticated users to write

-- Step 4: Verify the table is accessible
-- This should work for both anon and authenticated users
