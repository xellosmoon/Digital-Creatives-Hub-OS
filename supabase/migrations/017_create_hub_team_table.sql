-- ============================================================
-- Migration 017: Create hub_team table
-- About Us page dynamic team members
-- ============================================================

CREATE TABLE IF NOT EXISTS hub_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designations JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- designations format: [{"position": "Head", "department": "Center for Digital Iligan"}, ...]

-- RLS
ALTER TABLE hub_team ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "hub_team_public_read" ON hub_team;
DROP POLICY IF EXISTS "hub_team_authenticated_write" ON hub_team;
DROP POLICY IF EXISTS "hub_team_insert" ON hub_team;
DROP POLICY IF EXISTS "hub_team_update" ON hub_team;
DROP POLICY IF EXISTS "hub_team_delete" ON hub_team;

-- Public can read
CREATE POLICY "hub_team_public_read" ON hub_team
  FOR SELECT USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "hub_team_insert" ON hub_team
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "hub_team_update" ON hub_team
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "hub_team_delete" ON hub_team
  FOR DELETE 
  TO authenticated
  USING (true);

-- Seed the Hub Consultant (only if not already exists)
INSERT INTO hub_team (name, designations, bio, is_featured, sort_order)
SELECT
  'Jhonny Paul H. Lagura',
  '[
    {"position": "Head", "department": "Center for Digital Iligan, Innovation and Sustainability"},
    {"position": "Hub Consultant & Project Steward", "department": "Digital Creatives Hub Iligan"}
  ]'::jsonb,
  'Leading the Digital Creatives Hub Iligan as an official DTI Shared Service Facility, empowering local creatives and digital entrepreneurs.',
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM hub_team WHERE name = 'Jhonny Paul H. Lagura'
);
