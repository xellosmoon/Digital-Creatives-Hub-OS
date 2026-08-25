-- =============================================================
-- Migration: Move gallery images off base64-in-column to Supabase Storage
-- Purpose:
--   GalleryManagement.tsx's upload flow was left in a "demo mode" stub
--   (explicitly commented "In production, integrate with Cloudinary upload
--   API") that base64-encodes the raw file and stores it directly in
--   hub_gallery.cloudinary_url instead of uploading it anywhere. With ~12
--   rows each carrying a multi-hundred-KB embedded image, `SELECT * FROM
--   public_gallery` (used by the homepage "Life at the Hub" marquee) blows
--   the database's statement_timeout on every real page load — verified
--   live against the project: `limit=1` succeeds in ~1s, no limit fails
--   every time with Postgres error 57014 "canceling statement due to
--   statement timeout". HubGalleryMarquee.tsx silently swallows that
--   failure and falls back to generic stock photos, so the section reads
--   as "working" while never actually showing a real hub photo.
--
--   Cloudinary was never actually configured (no cloud name/keys in
--   .env.local), and the one real Cloudinary helper (src/lib/cloudinary.ts,
--   now deleted) embedded a server-only API secret via
--   VITE_CLOUDINARY_API_SECRET, which would ship straight into client-side
--   JS — unsafe regardless. Moving to Supabase Storage uses credentials
--   this project already has configured, with no new third-party account.
-- =============================================================

-- -----------------------------------------------
-- 1. Rename columns to reflect what they now hold — nothing points at
--    Cloudinary anywhere in the app after this migration.
-- -----------------------------------------------
ALTER TABLE hub_gallery RENAME COLUMN cloudinary_url TO image_url;
ALTER TABLE hub_gallery RENAME COLUMN cloudinary_public_id TO storage_path;

-- -----------------------------------------------
-- 2. Recreate the public view against the renamed columns.
--    CREATE OR REPLACE VIEW cannot rename existing output columns, so the
--    view must be dropped and recreated.
-- -----------------------------------------------
DROP VIEW IF EXISTS public_gallery;

CREATE VIEW public_gallery AS
SELECT id, title, category, badge, storage_path, image_url, is_active
FROM hub_gallery
WHERE is_active = true;

GRANT SELECT ON public_gallery TO anon;
GRANT SELECT ON public_gallery TO authenticated;

-- -----------------------------------------------
-- 3. Public storage bucket for gallery images.
-- -----------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view gallery images (they're public marketing photos);
-- only admins can upload/replace/remove them.
CREATE POLICY "Public can view gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');

CREATE POLICY "Admins can upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update gallery images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'gallery'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete gallery images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gallery'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------
-- 4. Clean up the existing rows that hold base64 data instead of a real
--    URL. The original files were never kept anywhere, so these can't be
--    migrated automatically — deactivate them (rather than delete) so an
--    admin can see what needs a real photo re-uploaded via the fixed form,
--    and clear the embedded data so the bloat that caused the timeout is
--    actually gone from every future query, not just the public view.
-- -----------------------------------------------
UPDATE hub_gallery
SET is_active = false,
    image_url = '',
    storage_path = ''
WHERE image_url LIKE 'data:%';
