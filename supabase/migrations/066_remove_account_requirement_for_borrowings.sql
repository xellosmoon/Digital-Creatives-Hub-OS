-- =============================================================
-- Migration: Remove the account requirement for gadget borrowing
-- Purpose:
--   057_require_account_for_borrowings.sql soft-launched real user
--   accounts by requiring one on every standalone gadget borrowing
--   (the booking-linked equipment add-on in Bookings.tsx stayed
--   guest-friendly throughout). Accounts turned out to be a real cost
--   rather than a one-time setup step — every signup sends a
--   confirmation email, and Supabase's shared email sender has a very
--   low rate limit until a paid custom SMTP provider is wired up (see
--   the "email rate limit exceeded" incident this covers) — so gating
--   a whole feature behind account creation isn't worth it right now.
--
--   This restores the pre-057 open INSERT policy (any guest with
--   user_id left null, same as a guest space booking), while keeping
--   the two paths 057 preserved for logged-in use: a real account
--   holder submitting as themselves, and an admin attaching a known
--   account on a borrower's behalf (ManualBorrowModal.tsx).
-- =============================================================

DROP POLICY IF EXISTS "Account holders, admins, or booking-linked guests create borrowings" ON borrowings;
CREATE POLICY "Anyone can create a borrowing" ON borrowings FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR user_id IS NULL
  OR (user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
);
