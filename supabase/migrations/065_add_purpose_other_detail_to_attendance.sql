-- =============================================================
-- Migration: Capture the actual reason when a visitor picks "Other"
-- Purpose:
--   The Check-In kiosk's "Purpose of Visit" step includes an "Other"
--   option, but selecting it never asked what "Other" actually meant —
--   the checked-in record just says "Other" with no further detail.
--   Adds a free-text column for that detail; CheckIn.tsx now requires
--   it whenever "Other" is one of the selected purposes.
-- =============================================================

ALTER TABLE hub_attendance ADD COLUMN IF NOT EXISTS purpose_other_detail TEXT;
