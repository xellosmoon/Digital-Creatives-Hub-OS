-- Disable RLS completely on hub_gallery to fix timeout issues
-- This allows both authenticated and anonymous users to access gallery data
-- Write operations should be managed through the admin interface or API

ALTER TABLE hub_gallery DISABLE ROW LEVEL SECURITY;
