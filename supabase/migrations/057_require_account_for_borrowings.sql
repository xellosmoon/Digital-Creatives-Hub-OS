-- =============================================================
-- Migration: Require a real account on every new standalone gadget borrowing
-- Purpose:
--   046_fix_borrowings_guest_insert.sql opened up borrowings INSERT
--   to guests (user_id IS NULL) to match the "no account needed"
--   space-booking flow. Individual accounts are now being soft-launched
--   with gadget borrowing as the first (and for now, only) use case —
--   every request made through the standalone /gadgets flow (BorrowWizard,
--   ManualBorrowModal) must be tied to a real account, whether submitted
--   by the account holder themselves or by an admin on their behalf
--   (e.g. front-desk walk-in assistance).
--
--   The borrowings table is also written to by Bookings.tsx's equipment
--   add-on step (src/pages/Bookings.tsx:372), which reserves gear
--   alongside a guest space booking and always sets booking_id. That
--   path must stay guest-friendly per scope — bookings/check-ins/events
--   are explicitly untouched — so guest inserts are still allowed when
--   booking_id is set, and only the standalone (booking_id IS NULL)
--   path now requires a real user_id.
-- =============================================================

DROP POLICY IF EXISTS "Anyone can create a borrowing" ON borrowings;
CREATE POLICY "Account holders, admins, or booking-linked guests create borrowings" ON borrowings FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR (user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  OR (booking_id IS NOT NULL AND user_id IS NULL)
);
