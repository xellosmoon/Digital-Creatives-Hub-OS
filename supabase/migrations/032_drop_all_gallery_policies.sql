-- Drop all remaining policies on hub_gallery to clean up
-- Since RLS is disabled, policies shouldn't be needed but let's remove them anyway

DROP POLICY IF EXISTS "Public can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "No insert allowed" ON hub_gallery;
DROP POLICY IF EXISTS "No update allowed" ON hub_gallery;
DROP POLICY IF EXISTS "No delete allowed" ON hub_gallery;
