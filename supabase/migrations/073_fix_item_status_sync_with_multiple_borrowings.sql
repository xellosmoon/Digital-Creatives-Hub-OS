-- =============================================================
-- Migration 073: Keep a unit "borrowed" while any loan of it is still live
-- =============================================================
-- Bug: approving two gadgets showed only one under Borrowed. The trigger
-- that mirrors a borrowing onto the unit's status treated every return or
-- cancellation as "this unit is free now" — even when ANOTHER approved or
-- active loan of the same unit was still running (the table allows several
-- loans of one unit as long as their time windows don't overlap). One
-- cancelled/returned loan therefore flipped a unit that was still out back
-- to "available".
--
-- Fix: only free the unit when no other approved/active loan of it remains.
-- Also restated as SECURITY DEFINER with a fixed search_path so it works
-- no matter who triggers the change (guest cancel, admin, etc.) — see
-- MIGRATION_CHECKLIST.md — and a one-off repair for units already wrong.
-- =============================================================

CREATE OR REPLACE FUNCTION sync_item_status_on_borrowing()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' OR NEW.status = 'active' THEN
    UPDATE items SET status = 'borrowed' WHERE id = NEW.item_id;
  ELSIF NEW.status = 'returned' OR NEW.status = 'cancelled' THEN
    UPDATE items SET status = 'available'
    WHERE id = NEW.item_id
      AND status = 'borrowed'
      AND NOT EXISTS (
        SELECT 1 FROM borrowings b
        WHERE b.item_id = NEW.item_id
          AND b.id <> NEW.id
          AND b.status IN ('approved', 'active')
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Repair: units with a live loan that got reset to 'available'.
-- (Never touches maintenance/broken flags.)
UPDATE items i
SET status = 'borrowed'
WHERE i.status = 'available'
  AND EXISTS (
    SELECT 1 FROM borrowings b
    WHERE b.item_id = i.id AND b.status IN ('approved', 'active')
  );
