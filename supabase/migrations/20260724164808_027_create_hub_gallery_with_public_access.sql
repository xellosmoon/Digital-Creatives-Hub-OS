-- Create hub_gallery table for managing homepage gallery images
CREATE TABLE IF NOT EXISTS hub_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  badge TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_gallery_display_order ON hub_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_hub_gallery_is_active ON hub_gallery(is_active);

ALTER TABLE hub_gallery ENABLE ROW LEVEL SECURITY;

-- Public SELECT: both anonymous and authenticated users can view active images
CREATE POLICY "Public can view active gallery images"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin-only write policies
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

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_hub_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hub_gallery_updated_at
  BEFORE UPDATE ON hub_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_hub_gallery_updated_at();
