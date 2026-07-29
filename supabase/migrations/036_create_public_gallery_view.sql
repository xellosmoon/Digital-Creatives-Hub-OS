-- Create a public view for gallery images that bypasses RLS
-- This ensures both anon and authenticated users can access gallery data

CREATE OR REPLACE VIEW public_gallery AS
SELECT id, title, category, badge, cloudinary_public_id, cloudinary_url, is_active
FROM hub_gallery
WHERE is_active = true;

-- Grant permissions on the view
GRANT SELECT ON public_gallery TO anon;
GRANT SELECT ON public_gallery TO authenticated;
