-- =============================================================
-- Migration: Widen facebook_link / facebook_page columns to TEXT
-- Purpose:
--   hub_bookings.facebook_link, events.facebook_link,
--   hub_events.facebook_link (038_add_facebook_link.sql) and
--   hub_bookings.facebook_page, hub_events.facebook_page
--   (041_add_facebook_page_to_bookings_and_events.sql) were created
--   as VARCHAR(255). Facebook's mobile "Share" sheet frequently
--   generates URLs well past 255 characters once tracking params
--   (mibextid, rdid, share_url, etc.) are appended, which throws
--   Postgres error 22001 "value too long for type character
--   varying(255)" on insert. The public Bookings.tsx and
--   ProposeEvent.tsx forms require this field for group bookings /
--   event proposals, so any guest who pastes one of these long
--   share links has every submission rejected outright — surfaced
--   to them only as a generic "Booking failed" toast since
--   PostgrestError isn't an Error instance (see Bookings.tsx
--   handleSubmit's catch block).
-- =============================================================

ALTER TABLE hub_bookings ALTER COLUMN facebook_link TYPE TEXT;
ALTER TABLE hub_bookings ALTER COLUMN facebook_page TYPE TEXT;
ALTER TABLE events ALTER COLUMN facebook_link TYPE TEXT;
ALTER TABLE hub_events ALTER COLUMN facebook_link TYPE TEXT;
ALTER TABLE hub_events ALTER COLUMN facebook_page TYPE TEXT;
