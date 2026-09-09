-- =============================================================
-- Migration: Allow hub_bookings.package_id to be NULL
-- Purpose:
--   hub_bookings.package_id has been NOT NULL since it was created
--   (005_hub_capacity_packages.sql), but two admin flows have always
--   inserted package_id: null for bookings that aren't tied to a rental
--   package:
--     - EventFormModal.tsx's seat-reservation rows for an event's
--       "Expected Guests" (comment: "Event bookings don't use packages")
--     - AdminDashboard.tsx's "Force Book" walk-in flow
--   Both inserts have been failing with a not-null constraint violation
--   the whole time, which is why an event's expected guests never
--   actually counted as reserved seats even once approved and published.
-- =============================================================

ALTER TABLE hub_bookings
  ALTER COLUMN package_id DROP NOT NULL;
