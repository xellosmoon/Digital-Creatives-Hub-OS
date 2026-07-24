-- ============================================================
-- Migration 024: Add 'rejected' to attendance_status enum
-- The Secretariat "Reject Check-In" action sets
-- hub_attendance.status = 'rejected', but the enum only had
-- 'pending_entrance' | 'active' | 'checked_out', so the update
-- failed (22P02 invalid input value) and surfaced as
-- "Reject failed".
-- ============================================================

ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'rejected';
