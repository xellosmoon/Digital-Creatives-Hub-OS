-- Remove space_id foreign key constraint from events table
-- Since spaces are deprecated and replaced with hub_zones/quadrants
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_space_id_fkey;

-- Make space_id nullable (it will be ignored for now)
ALTER TABLE events ALTER COLUMN space_id DROP NOT NULL;
