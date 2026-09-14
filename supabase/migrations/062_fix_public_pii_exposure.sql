-- =============================================================
-- Migration: Fix public PII exposure on hub_bookings / hub_events
-- Purpose:
--   "Users can view own hub bookings" (005_hub_capacity_packages.sql)
--   included `OR guest_email IS NOT NULL` — true for almost every guest
--   booking, so it didn't actually scope rows to the requester at all.
--   Combined with the public /calendar page selecting hub_bookings with
--   no additional filtering, any anonymous visitor could read every
--   guest's name, email, and phone number straight off the calendar.
--
--   061_add_proposal_reference_to_hub_events.sql then copied this exact
--   mistake on purpose (see its own comment), loosening hub_events to
--   `USING (true)` — an even more direct exposure of every organizer's
--   contact details to anyone, logged in or not.
--
--   Both policies exist so two legitimate flows keep working without an
--   account: (1) a guest reading back the booking/proposal they just
--   submitted, so the post-submit ticket can render, and (2) anyone
--   later looking that same booking/proposal up by its reference code
--   or email on /booking-lookup. Neither of those actually requires
--   open SELECT on the table — both are "prove you already know the
--   reference or email" lookups, which is exactly what a SECURITY
--   DEFINER function scoped to those two inputs can do without ever
--   exposing the rest of the table. The public calendar's need is even
--   narrower: occupancy/category info with no guest PII at all.
--
--   So this migration: (a) closes both leaky SELECT policies back to
--   owner/admin-only, (b) adds narrow SECURITY DEFINER functions for
--   guest-submitted create+return, reference/email lookup, and the
--   PII-free public calendar read, and (c) points every call site that
--   relied on the old open policies at those functions instead.
-- =============================================================

-- ── 1. Close the leaky SELECT policies ──────────────────────────────
-- Admins keep full access via the existing FOR ALL admin policies on
-- both tables ("Admins can manage all hub bookings" / "Allow admin full
-- access") — neither of those is touched here.

DROP POLICY IF EXISTS "Users can view own hub bookings" ON hub_bookings;
CREATE POLICY "Users can view own hub bookings"
  ON hub_bookings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view event proposals" ON hub_events;

-- ── 2. Undocumented column used by the current Bookings.tsx insert ──
-- `designation` was added to hub_bookings outside of a migration at
-- some point (only hub_attendance/hub_team had it on record here) —
-- adding it as IF NOT EXISTS just brings the migration history back in
-- sync with the live schema; it's a no-op if the column already exists.
ALTER TABLE hub_bookings ADD COLUMN IF NOT EXISTS designation TEXT;

-- ── 3. Guest-submitted create+return, bypassing RLS deliberately ────
-- Each function is scoped to exactly the columns the guest form sends;
-- status is always forced server-side, never taken from the payload.

CREATE OR REPLACE FUNCTION create_hub_booking(payload jsonb)
RETURNS hub_bookings
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row hub_bookings;
BEGIN
  INSERT INTO hub_bookings (
    user_id, package_id, guest_name, guest_email, guest_phone,
    booking_date, start_time, end_time, seats_used, total_price,
    status, purpose, booking_type, group_size, gathering_type,
    notes, organization, designation, facebook_link
  ) VALUES (
    (payload->>'user_id')::uuid,
    (payload->>'package_id')::uuid,
    payload->>'guest_name',
    payload->>'guest_email',
    payload->>'guest_phone',
    (payload->>'booking_date')::date,
    (payload->>'start_time')::timestamptz,
    (payload->>'end_time')::timestamptz,
    (payload->>'seats_used')::integer,
    (payload->>'total_price')::numeric,
    'pending',
    CASE WHEN payload->'purpose' IS NULL OR payload->'purpose' = 'null'::jsonb
      THEN NULL
      ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'purpose'))
    END,
    COALESCE(payload->>'booking_type', 'individual'),
    (payload->>'group_size')::integer,
    payload->>'gathering_type',
    payload->>'notes',
    payload->>'organization',
    payload->>'designation',
    payload->>'facebook_link'
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_hub_booking(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION create_event_proposal(payload jsonb)
RETURNS hub_events
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row hub_events;
BEGIN
  INSERT INTO hub_events (
    organizer_name, organizer_email, organizer_phone, organization, role,
    title, description, expected_guests, event_dates, creative_domains,
    status, facebook_page
  ) VALUES (
    payload->>'organizer_name',
    payload->>'organizer_email',
    payload->>'organizer_phone',
    payload->>'organization',
    payload->>'role',
    payload->>'title',
    payload->>'description',
    (payload->>'expected_guests')::integer,
    COALESCE(payload->'event_dates', '[]'::jsonb),
    CASE WHEN payload->'creative_domains' IS NULL
      THEN '{}'::text[]
      ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'creative_domains'))
    END,
    'pending_review',
    NULLIF(payload->>'facebook_page', '')
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_event_proposal(jsonb) TO anon, authenticated;

-- ── 4. Reference/email lookup, the /booking-lookup page's only need ─
-- Returns rows only when the caller already supplies a matching
-- reference or email — never a blanket read of the table.

CREATE OR REPLACE FUNCTION lookup_hub_booking(p_reference text, p_email text)
RETURNS TABLE (
  booking_reference text,
  guest_name text,
  guest_email text,
  guest_phone text,
  booking_date date,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  booking_type text,
  gathering_type text,
  group_size integer,
  package_name text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.booking_reference, b.guest_name, b.guest_email, b.guest_phone,
    b.booking_date, b.start_time, b.end_time, b.status,
    b.booking_type, b.gathering_type, b.group_size, p.name
  FROM hub_bookings b
  LEFT JOIN rental_packages p ON p.id = b.package_id
  WHERE
    (p_reference IS NOT NULL AND b.booking_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND b.guest_email = p_email)
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_hub_booking(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION lookup_event_proposal(p_reference text, p_email text)
RETURNS TABLE (
  proposal_reference text,
  organizer_name text,
  organizer_email text,
  organizer_phone text,
  title text,
  event_dates jsonb,
  status text,
  facebook_page text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.proposal_reference, e.organizer_name, e.organizer_email, e.organizer_phone,
    e.title, e.event_dates, e.status, e.facebook_page
  FROM hub_events e
  WHERE
    (p_reference IS NOT NULL AND e.proposal_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND e.organizer_email = p_email)
  ORDER BY e.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_event_proposal(text, text) TO anon, authenticated;

-- ── 5. PII-free public calendar read ────────────────────────────────
-- The public calendar only ever needs occupancy/category info (dates,
-- times, seat counts, workshop/bundle flags) — never guest identity.

CREATE OR REPLACE FUNCTION get_public_calendar_bookings(range_start date, range_end date)
RETURNS TABLE (
  id uuid,
  booking_date date,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  is_workshop boolean,
  seats_used integer,
  package_id uuid,
  package_slug text,
  package_name text,
  package_is_bundle boolean
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.booking_date, b.start_time, b.end_time, b.status, b.is_workshop, b.seats_used,
    b.package_id, p.slug, p.name, p.is_bundle
  FROM hub_bookings b
  LEFT JOIN rental_packages p ON p.id = b.package_id
  WHERE b.status IN ('approved', 'active', 'pending')
    AND b.booking_date BETWEEN range_start AND range_end;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_calendar_bookings(date, date) TO anon, authenticated;

-- ── 6. Public "total bookings" counter (Home.tsx) ───────────────────
-- A count alone isn't PII, but it stopped being visible to anon once
-- the leaky SELECT policy closed — this restores just the number.

CREATE OR REPLACE FUNCTION get_public_hub_booking_count()
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM hub_bookings;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_hub_booking_count() TO anon, authenticated;
