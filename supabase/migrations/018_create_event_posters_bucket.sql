-- =============================================================
-- Migration: Create Supabase Storage bucket for event posters
-- Purpose:   Enable reliable image hosting for event posters
--            with public read access and authenticated upload
-- =============================================================

-- Create storage bucket for event posters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posters',
  'event-posters',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public read access for all users
CREATE POLICY "Public read access for event posters"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-posters');

-- Policy: Authenticated users can upload event posters
CREATE POLICY "Authenticated users can upload event posters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-posters'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update their own uploads
CREATE POLICY "Authenticated users can update their own event posters"
ON storage.objects FOR UPDATE
TO authenticated
WITH CHECK (
  bucket_id = 'event-posters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admins can delete any event poster
CREATE POLICY "Admins can delete any event poster"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-posters'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
