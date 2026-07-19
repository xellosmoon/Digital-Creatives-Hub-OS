-- Update existing events with organization from proposals
-- This migration dynamically matches events to proposals based on title and updates the organization field

UPDATE events e
SET organization = he.organization
FROM hub_events he
WHERE e.title = he.title
  AND he.organization IS NOT NULL
  AND he.organization != ''
  AND (e.organization IS NULL OR e.organization = '');
