-- =============================================================
-- Migration: Allow guest (walk-in) equipment reservations
-- Purpose:
--   The Bookings page lets anyone reserve a seat + equipment
--   without an account ("no account needed"), matching the
--   existing "Anyone can create a hub booking" policy on
--   hub_bookings. But borrowings' INSERT policy only allowed
--   auth.uid() = user_id, which is never true for a guest
--   (user_id is null, auth.uid() is null under the anon key) —
--   so every equipment reservation attached to a guest booking
--   has been rejected by RLS (42501) since equipment booking was
--   added, regardless of any application-level bug.
-- =============================================================

DROP POLICY IF EXISTS "Users can create borrowings" ON borrowings;
CREATE POLICY "Anyone can create a borrowing" ON borrowings FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);
