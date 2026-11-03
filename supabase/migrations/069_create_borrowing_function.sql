-- =============================================================
-- Migration: Let guests actually submit a gadget borrow request
-- Purpose:
--   066 re-opened the INSERT policy on borrowings to guests (user_id
--   NULL), but BorrowWizard saves a request with
--   `.insert(...).select('borrowing_reference').single()` — it reads the
--   new row straight back to print the real reference number on the
--   Receiving Form. Postgres applies the SELECT policy to a row returned
--   from an INSERT, and borrowings' SELECT policy is "own rows or admin"
--   (003), which a guest (no account, no auth.uid()) never satisfies. So
--   every guest submission was refused with an RLS error, which the
--   wizard reported as "No units could be reserved."
--
--   Same fix as proposals/bookings in 062: a narrow SECURITY DEFINER
--   function does the insert and returns only the reference number — the
--   guest never gets read access to the table.
--
--   Unlike a plain insert, this does NOT trust the caller about identity:
--   user_id is always the caller's own auth.uid() (NULL for a guest), so a
--   guest can't file a request under someone else's account. Status is
--   always 'pending'. Everything else enforced by the table itself still
--   applies — notably the no_overlapping_item_borrowings exclusion
--   constraint, which makes a double-booked unit fail (23P01).
-- =============================================================

CREATE OR REPLACE FUNCTION create_borrowing(payload jsonb)
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref text;
BEGIN
  INSERT INTO borrowings (
    user_id, item_id, asset_id, usage_type, destination_location,
    start_time, end_time, duration_hours, matched_tier_hours, total_price,
    status, purpose, borrower_name, borrower_office, borrower_contact,
    device_operator_name, late_fee_rate, late_fee_unit
  ) VALUES (
    auth.uid(),
    (payload->>'item_id')::uuid,
    (payload->>'asset_id')::uuid,
    payload->>'usage_type',
    payload->>'destination_location',
    (payload->>'start_time')::timestamptz,
    (payload->>'end_time')::timestamptz,
    (payload->>'duration_hours')::numeric,
    (payload->>'matched_tier_hours')::numeric,
    COALESCE((payload->>'total_price')::numeric, 0),
    'pending',
    payload->>'purpose',
    payload->>'borrower_name',
    payload->>'borrower_office',
    payload->>'borrower_contact',
    payload->>'device_operator_name',
    (payload->>'late_fee_rate')::numeric,
    payload->>'late_fee_unit'
  )
  RETURNING borrowing_reference INTO ref;

  RETURN ref;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_borrowing(jsonb) TO anon, authenticated;
