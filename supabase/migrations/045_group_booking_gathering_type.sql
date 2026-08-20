-- =============================================================
-- Migration: Group booking gathering type + fix borrowings FK
-- Purpose:
--   1. borrowings.booking_id was pointed at the legacy `bookings`
--      table (added back in 014_link_equipment_to_bookings.sql,
--      before hub_bookings existed as the real booking table).
--      Every equipment reservation made through the current
--      Bookings flow has been silently failing its FK check since
--      hub_bookings.id values don't exist in `bookings`.
--   2. Add gathering_type so a Group Booking can be classified
--      (Meeting/Workshop/Seminar/Other), which the admin can then
--      use to name a "Promote to Event" calendar entry sensibly
--      (e.g. "Devcon Iligan Meeting").
-- =============================================================

ALTER TABLE borrowings DROP CONSTRAINT IF EXISTS borrowings_booking_id_fkey;
ALTER TABLE borrowings
  ADD CONSTRAINT borrowings_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES hub_bookings(id) ON DELETE SET NULL;

ALTER TABLE hub_bookings
  ADD COLUMN IF NOT EXISTS gathering_type TEXT
  CHECK (gathering_type IN ('Meeting', 'Workshop', 'Seminar', 'Other'));

COMMENT ON COLUMN hub_bookings.gathering_type IS 'For group bookings: the kind of internal gathering (Meeting/Workshop/Seminar/Other). Used to suggest a title when an admin promotes the booking to a calendar event.';
