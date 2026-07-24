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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hub_gallery_display_order ON hub_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_hub_gallery_is_active ON hub_gallery(is_active);

-- Add comments for documentation
COMMENT ON TABLE hub_gallery IS 'Stores gallery images for the homepage marquee';
COMMENT ON COLUMN hub_gallery.title IS 'Image title/description';
COMMENT ON COLUMN hub_gallery.category IS 'Category for grouping (e.g., Coworking, Workshops, Media)';
COMMENT ON COLUMN hub_gallery.badge IS 'Display badge text with emoji (e.g., ☕ Coworking Lounge)';
COMMENT ON COLUMN hub_gallery.cloudinary_public_id IS 'Cloudinary public ID for image management';
COMMENT ON COLUMN hub_gallery.cloudinary_url IS 'Full URL to the optimized image';
COMMENT ON COLUMN hub_gallery.display_order IS 'Order for displaying images (lower numbers first)';
COMMENT ON COLUMN hub_gallery.is_active IS 'Whether the image should be displayed in the marquee';

-- Enable RLS
ALTER TABLE hub_gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage gallery images
CREATE POLICY "Public can view active gallery images"
  ON hub_gallery FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hub_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER hub_gallery_updated_at
  BEFORE UPDATE ON hub_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_hub_gallery_updated_at();

-- Insert sample data
INSERT INTO hub_gallery (title, category, badge, cloudinary_public_id, cloudinary_url, display_order, is_active)
VALUES
  ('Morning Collaboration', 'Coworking', '☕ Coworking Lounge', 'samples/coffee-shop', 'https://res.cloudinary.com/demo/image/upload/samples/coffee-shop.jpg', 1, true),
  ('Focus Session', 'Productivity', '💻 Deep Work Zone', 'samples/office-work', 'https://res.cloudinary.com/demo/image/upload/samples/office-work.jpg', 2, true),
  ('Team Brainstorm', 'Meetings', '🎯 Meeting Room', 'samples/meeting-room', 'https://res.cloudinary.com/demo/image/upload/samples/meeting-room.jpg', 3, true),
  ('Podcast Recording', 'Media', '🎙️ Podcast Studio', 'samples/podcast-studio', 'https://res.cloudinary.com/demo/image/upload/samples/podcast-studio.jpg', 4, true),
  ('Design Sprint', 'Workshops', '🎨 Design Sprint', 'samples/design-workshop', 'https://res.cloudinary.com/demo/image/upload/samples/design-workshop.jpg', 5, true),
  ('Community Hub', 'Community', '👥 Community Space', 'samples/coworking-space', 'https://res.cloudinary.com/demo/image/upload/samples/coworking-space.jpg', 6, true),
  ('Creative Session', 'Studio', '✨ Creative Studio', 'samples/creative-studio', 'https://res.cloudinary.com/demo/image/upload/samples/creative-studio.jpg', 7, true),
  ('Workshop Event', 'Events', '🎪 Event Space', 'samples/event-space', 'https://res.cloudinary.com/demo/image/upload/samples/event-space.jpg', 8, true)
ON CONFLICT DO NOTHING;
