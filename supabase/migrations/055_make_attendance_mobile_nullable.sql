-- =============================================================
-- Migration: Allow hub_attendance.mobile_number to be NULL
-- Purpose:
--   The admin's "Manual Check-In" (walk-in) form in AdminDashboard.tsx
--   requires a mobile number before it will submit, with no way to
--   check someone in who doesn't want to share their phone number.
--   mobile_number has been NOT NULL since hub_attendance was created
--   (007_attendance_system.sql). This relaxes that so the admin can
--   leave it blank for a walk-in, while the self-service kiosk
--   check-in flow (CheckIn.tsx) keeps requiring it as before — that
--   validation lives in the frontend, not this constraint.
-- =============================================================

ALTER TABLE hub_attendance
  ALTER COLUMN mobile_number DROP NOT NULL;
