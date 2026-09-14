-- =============================================================
-- Migration: Explicit event category + hide pending bookings publicly
-- Purpose:
--   1. The public calendar colored/grouped events by guessing a category
--      from keywords in the title/description (getEventCategory() in
--      PublicCalendar.tsx, duplicated again in EventDetailsModal.tsx and
--      EventPopover.tsx). An admin publishing an event never chose a
--      category anywhere, so the color it landed on looked arbitrary —
--      because it was: it depended on whether their title happened to
--      contain a word like "tech" or "community". This adds a real
--      `category` column the admin picks explicitly when creating or
--      editing an event, so the color is a deliberate choice, not a
--      guess. Existing events are backfilled using that same keyword
--      heuristic so they keep the category they already display today.
--
--   2. The public calendar showed a "X Pending" badge for bookings still
--      awaiting admin review — meaningless (and mildly confusing) to an
--      anonymous visitor, since it's purely an internal admin-workflow
--      state. get_public_calendar_bookings (062_fix_public_pii_exposure)
--      is redefined to stop returning 'pending' rows at all.
-- =============================================================

-- ── 1. Explicit event category ───────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill in the same precedence order the old keyword heuristic used.
UPDATE events SET category = 'workshops'
WHERE category IS NULL AND (
  title ILIKE '%workshop%' OR title ILIKE '%training%' OR description ILIKE '%workshop%'
);

UPDATE events SET category = 'tech_dev'
WHERE category IS NULL AND (
  title ILIKE '%tech%' OR title ILIKE '%dev%' OR title ILIKE '%code%' OR description ILIKE '%tech%'
);

UPDATE events SET category = 'community'
WHERE category IS NULL AND (
  title ILIKE '%community%' OR title ILIKE '%social%' OR description ILIKE '%social%'
);

UPDATE events SET category = 'other' WHERE category IS NULL;

ALTER TABLE events ALTER COLUMN category SET DEFAULT 'other';
ALTER TABLE events ALTER COLUMN category SET NOT NULL;
ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('tech_dev', 'workshops', 'community', 'other'));

-- ── 2. Stop returning pending bookings on the public calendar ────────
-- CREATE OR REPLACE FUNCTION replaces the whole function including its
-- security attributes — SECURITY DEFINER and SET search_path are
-- restated here on purpose (see MIGRATION_CHECKLIST.md).
CREATE OR REPLACE FUNCTION get_public_calendar_bookings(range_start date, range_end date)
RETURNS TABLE (
  id uuid,
  booking_date date,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  is_workshop boolean,
  seats_used integer,
  package_id uuid,
  package_slug text,
  package_name text,
  package_is_bundle boolean
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.booking_date, b.start_time, b.end_time, b.status, b.is_workshop, b.seats_used,
    b.package_id, p.slug, p.name, p.is_bundle
  FROM hub_bookings b
  LEFT JOIN rental_packages p ON p.id = b.package_id
  WHERE b.status IN ('approved', 'active')
    AND b.booking_date BETWEEN range_start AND range_end;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_calendar_bookings(date, date) TO anon, authenticated;
