-- =============================================================
-- Migration: Gadget Receiving Form + double-booking protection
-- Purpose:
--   1. Add the fields needed to render the physical "Receiving Form"
--      (borrower identity, device operator, late-fee terms, return
--      condition/remarks) directly from a borrowing row, instead of
--      stuffing them into the free-text `notes` column the way
--      ManualBorrowModal currently does for walk-ins.
--   2. Close a real double-booking hole: BorrowingModal/ManualBorrowModal/
--      Bookings.tsx all pick the first item whose `status='available'`
--      from a client-side snapshot — none of them check whether the
--      chosen time window overlaps another pending/approved/active
--      borrowing of that same physical unit, and neither does the admin
--      "Approve" action. This adds a server-side lookup function plus a
--      hard DB constraint so a race (or a missed client check) can't
--      silently double-book the same item.
--   3. Fix sync_item_status_on_borrowing(): it currently forces an
--      item back to 'available' on any 'returned'/'cancelled' borrowing
--      update, even if an admin had manually flagged that item
--      'maintenance'/'broken' in the meantime — silently undoing the flag.
-- =============================================================

-- -----------------------------------------------
-- 1. Borrower / receiving-form fields on BORROWINGS
-- -----------------------------------------------
ALTER TABLE borrowings
  ADD COLUMN IF NOT EXISTS borrower_name TEXT,
  ADD COLUMN IF NOT EXISTS borrower_office TEXT,
  ADD COLUMN IF NOT EXISTS borrower_contact TEXT,
  ADD COLUMN IF NOT EXISTS device_operator_name TEXT,
  ADD COLUMN IF NOT EXISTS late_fee_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS late_fee_unit TEXT CHECK (late_fee_unit IN ('hour', 'day')),
  ADD COLUMN IF NOT EXISTS return_condition TEXT CHECK (return_condition IN ('good', 'minor_issues', 'damaged_missing')),
  ADD COLUMN IF NOT EXISTS return_remarks TEXT,
  ADD COLUMN IF NOT EXISTS received_by TEXT;

COMMENT ON COLUMN borrowings.borrower_name IS 'Receiving Form: "Name of Borrower" — captured even for guest (user_id IS NULL) borrowings.';
COMMENT ON COLUMN borrowings.borrower_office IS 'Receiving Form: "Office/Agency/Business".';
COMMENT ON COLUMN borrowings.borrower_contact IS 'Receiving Form: "Contact Number".';
COMMENT ON COLUMN borrowings.device_operator_name IS 'Receiving Form: "Device Operator''s Name" — defaults to borrower_name when the same person operates the device.';
COMMENT ON COLUMN borrowings.late_fee_rate IS 'Receiving Form: "late charge of PHP ___ per hour/day" — snapshotted from assets.default_late_fee_rate at request time.';
COMMENT ON COLUMN borrowings.return_condition IS 'Receiving Form return section checkbox.';

-- -----------------------------------------------
-- 2. Receiving-form fields on ASSETS
-- -----------------------------------------------
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS included_items TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_late_fee_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS default_late_fee_unit TEXT CHECK (default_late_fee_unit IN ('hour', 'day'));

COMMENT ON COLUMN assets.included_items IS 'Receiving Form: "List of Included Items" printed for every unit of this asset (e.g. charger, tripod, memory card).';

-- -----------------------------------------------
-- 3. Server-side conflict-aware item lookup
--    SECURITY DEFINER: the "Users view own borrowings" RLS policy
--    restricts a caller to their own rows, which would make an
--    invoker-rights version of this check blind to other users'
--    conflicting borrowings. This only ever returns item ids (no
--    borrower data), so bypassing RLS here is safe.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION get_available_items(
  p_asset_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(item_id UUID) AS $$
  SELECT i.id
  FROM items i
  WHERE i.asset_id = p_asset_id
    AND i.status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM borrowings b
      WHERE b.item_id = i.id
        AND b.status IN ('pending', 'approved', 'active')
        AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange(p_start, p_end, '[)')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------
-- 4. Hard DB-level guard against double-booking a unit
--    Final safety net for the race between the lookup above and the
--    actual INSERT. Requires btree_gist for the UUID equality term.
-- -----------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE borrowings
  ADD CONSTRAINT no_overlapping_item_borrowings
  EXCLUDE USING gist (
    item_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status IN ('pending', 'approved', 'active'));

-- -----------------------------------------------
-- 5. Don't let a return clobber a manually-set maintenance/broken flag
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION sync_item_status_on_borrowing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' OR NEW.status = 'active' THEN
    UPDATE items SET status = 'borrowed' WHERE id = NEW.item_id;
  ELSIF NEW.status = 'returned' OR NEW.status = 'cancelled' THEN
    UPDATE items SET status = 'available' WHERE id = NEW.item_id AND status = 'borrowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
