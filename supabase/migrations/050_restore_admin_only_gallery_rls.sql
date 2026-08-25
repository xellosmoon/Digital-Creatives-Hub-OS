-- =============================================================
-- Migration: Restore admin-only write access to hub_gallery
-- Purpose:
--   025_create_hub_gallery_table.sql originally locked hub_gallery down
--   correctly: public can read active images, only admins can
--   insert/update/delete. A long chain of follow-up migrations
--   (026 through 035) fought a real access-from-the-browser bug by
--   progressively loosening things, and 034_completely_reset_gallery_rls.sql
--   gave up entirely — it disabled row level security on hub_gallery and
--   granted ALL privileges to the `authenticated` role, then
--   035_grant_schema_permissions.sql reinforced that with another
--   `GRANT ALL ... TO authenticated`. The practical effect, still live
--   today: ANY logged-in user — not just admins — can insert, update, or
--   delete gallery rows directly, since nothing at the database level is
--   actually checking for the admin role anymore.
--
--   049_gallery_to_supabase_storage.sql fixed the real underlying bug
--   this whole chain was chasing (base64 blobs bloating the table), so
--   there's no functional reason left to keep RLS off. This migration
--   restores the original admin-only policy shape, plus a SELECT policy
--   so the admin panel (GalleryManagement.tsx, which lists both active
--   and hidden images) can see inactive rows — a gap 025's own policy
--   never covered, likely part of what the later migrations were
--   actually reacting to.
-- =============================================================

-- -----------------------------------------------
-- 1. Drop every policy name this table has ever had, across the whole
--    history above, so this migration is safe to run regardless of which
--    of those actually made it onto the live database.
-- -----------------------------------------------
DROP POLICY IF EXISTS "Admins can view gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Public can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Anyone can view active gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Enable public read access" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can insert gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can update gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON hub_gallery;
DROP POLICY IF EXISTS "No insert allowed" ON hub_gallery;
DROP POLICY IF EXISTS "No update allowed" ON hub_gallery;
DROP POLICY IF EXISTS "No delete allowed" ON hub_gallery;
DROP POLICY IF EXISTS "Admins can view all gallery images" ON hub_gallery;

-- -----------------------------------------------
-- 2. Re-enable RLS and pull back the blanket grants from 034/035 — RLS is
--    the actual enforcement layer, but Postgres also requires the coarse
--    table-level grant to line up, so both need fixing together.
-- -----------------------------------------------
ALTER TABLE hub_gallery ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON hub_gallery FROM authenticated;
REVOKE ALL ON hub_gallery FROM anon;

GRANT SELECT ON hub_gallery TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON hub_gallery TO authenticated;

-- -----------------------------------------------
-- 3. Clean policies. Two SELECT policies on the same role are OR'd
--    together by Postgres, so a non-admin authenticated user still only
--    sees active rows (2nd policy), while an admin sees everything
--    (1st policy alone already covers all rows for them).
-- -----------------------------------------------
CREATE POLICY "Admins can view all gallery images"
  ON hub_gallery FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Public can view active gallery images"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert gallery images"
  ON hub_gallery FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update gallery images"
  ON hub_gallery FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can delete gallery images"
  ON hub_gallery FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
