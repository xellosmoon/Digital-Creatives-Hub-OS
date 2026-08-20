-- =============================================================
-- Migration: Add age to hub_attendance
-- Purpose:
--   036_add_age_to_attendance.sql and 037_update_find_returning_user_age.sql
--   already exist in this repo but were never actually applied to the
--   live database — hub_attendance.age does not exist live. Every
--   CheckIn submission unconditionally includes an `age` key, so every
--   check-in has been failing at insert time with PGRST204 ("Could not
--   find the 'age' column"), regardless of which purpose was selected.
--   Verified directly against the live DB with a throwaway insert.
--
--   037's version of find_returning_user is also stale — 039 (which WAS
--   applied live) changed its return shape afterwards (creative_domain
--   became TEXT[], purpose_of_visit was added). Verified the live
--   function's actual current return shape with a real RPC call before
--   writing this. This recreates it as that live shape plus age —
--   CREATE OR REPLACE can't change output columns, so it must be
--   dropped first.
-- =============================================================

ALTER TABLE hub_attendance ADD COLUMN IF NOT EXISTS age INTEGER;
COMMENT ON COLUMN hub_attendance.age IS 'Age of the visitor in years';

DROP FUNCTION IF EXISTS find_returning_user(VARCHAR);

CREATE FUNCTION find_returning_user(p_mobile VARCHAR)
RETURNS TABLE(
  full_name VARCHAR,
  email VARCHAR,
  gender VARCHAR,
  sector VARCHAR,
  organization VARCHAR,
  designation VARCHAR,
  creative_domain TEXT[],
  creative_domains TEXT[],
  purpose_of_visit TEXT[],
  age INTEGER
) AS $$
  SELECT
    full_name,
    email,
    gender,
    sector,
    organization,
    designation,
    ARRAY[creative_domain]::TEXT[] as creative_domain,
    creative_domains,
    purpose_of_visit,
    age
  FROM hub_attendance
  WHERE mobile_number = p_mobile
  ORDER BY check_in_time DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;
