-- Grant proper schema permissions to anon role
-- The anon role needs USAGE on the public schema to access tables

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure anon has SELECT on hub_gallery specifically
GRANT SELECT ON hub_gallery TO anon;

-- Ensure authenticated has full access
GRANT ALL ON hub_gallery TO authenticated;
