-- =============================================================
-- Migration 074: Let an admin add time to a gadget borrow
-- =============================================================
-- A borrow's hours are the hours that were requested — the clock stops at
-- the scheduled end, not when the admin finally checks the item back in.
-- If the borrower really kept it longer, the admin adds that time
-- explicitly, which is what this does.
--
-- Extending moves end_time later and adds to duration_hours (the total the
-- analytics count) while extra_hours remembers how much of it was added
-- after the fact. Because end_time moves, the table's
-- no_overlapping_item_borrowings constraint still applies: if another
-- request for the same unit starts right after, the extension is refused
-- (23P01) instead of double-booking the unit.
--
-- SECURITY DEFINER + fixed search_path, with its own admin check, since
-- it is callable from the browser — see MIGRATION_CHECKLIST.md.
-- =============================================================

ALTER TABLE borrowings
  ADD COLUMN IF NOT EXISTS extra_hours NUMERIC(8,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN borrowings.extra_hours IS 'Hours an admin added after approval (already included in duration_hours and end_time).';

CREATE OR REPLACE FUNCTION extend_borrowing(p_borrowing_id uuid, p_hours numeric)
RETURNS timestamptz
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_end timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only an admin can add time to a borrow' USING ERRCODE = '42501';
  END IF;
  IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 720 THEN
    RAISE EXCEPTION 'Hours to add must be between 0 and 720';
  END IF;

  UPDATE borrowings
  SET end_time = end_time + (p_hours * interval '1 hour'),
      duration_hours = duration_hours + p_hours,
      extra_hours = extra_hours + p_hours
  WHERE id = p_borrowing_id
    AND status IN ('approved', 'active', 'returned')
  RETURNING end_time INTO new_end;

  IF new_end IS NULL THEN
    RAISE EXCEPTION 'That borrow can''t be extended (not found, pending or cancelled)';
  END IF;
  RETURN new_end;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION extend_borrowing(uuid, numeric) TO authenticated;
