-- =============================================================
-- Migration: Add age to hub_attendance (idempotent re-run of 036/037)
-- Purpose:
--   036_add_age_to_attendance.sql and 037_update_find_returning_user_age.sql
--   already exist in this repo but were never actually applied to the
--   live database — hub_attendance.age does not exist live. Every
--   CheckIn submission unconditionally includes an `age` key, so every
--   check-in has been failing at insert time with PGRST204 ("Could not
--   find the 'age' column"), regardless of which purpose was selected.
--   Verified directly against the live DB with a throwaway insert.
--   This redoes both prior migrations with IF NOT EXISTS / CREATE OR
--   REPLACE so it's safe to run regardless of the current state.
-- =============================================================

ALTER TABLE hub_attendance ADD COLUMN IF NOT EXISTS age INTEGER;
COMMENT ON COLUMN hub_attendance.age IS 'Age of the visitor in years';

CREATE OR REPLACE FUNCTION find_returning_user(p_mobile VARCHAR)
RETURNS TABLE(
  full_name VARCHAR,
  email VARCHAR,
  gender VARCHAR,
  age INTEGER,
  sector VARCHAR,
  organization VARCHAR,
  designation VARCHAR,
  creative_domain VARCHAR,
  creative_domains TEXT[]
) AS $$
  SELECT
    full_name, email, gender, age, sector, organization, designation, creative_domain, creative_domains
  FROM hub_attendance
  WHERE mobile_number = p_mobile
  ORDER BY check_in_time DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;
