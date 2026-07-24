-- ============================================================
-- Migration 023: Widen hub_attendance.creative_domain
-- Public check-in lets a visitor select MULTIPLE PCIDA domains,
-- which are stored joined as "A, B, C". VARCHAR(100) overflowed
-- (Postgres 22001) and surfaced as a generic "check-in failed".
-- ============================================================

ALTER TABLE hub_attendance
  ALTER COLUMN creative_domain TYPE TEXT;
