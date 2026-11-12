-- =============================================================
-- Migration 071: Public request queue + masked phone on email lookup
-- =============================================================
-- 1. get_public_request_queue(): a deliberately tiny, anonymous view of
--    what's waiting at the Hub, for the Find Booking page — kind, status,
--    date, and (for gadgets) which device. NO names, emails, phones or
--    titles.
--
--    The "code" it returns is NOT the real reference number. A reference
--    is the secret that unlocks a full ticket (name, email, phone) on the
--    lookup page, so publishing real references would hand every
--    visitor everyone's details. The code here is a one-way hash of the
--    row's internal id: stable (the same request keeps the same code) but
--    useless for looking anything up.
--
-- 2. Looking up by EMAIL no longer returns the full phone number — the
--    email is the only thing proving who is asking, and anyone who
--    knows someone's email could otherwise read their phone. Looking up
--    by reference still returns everything (the reference is the secret).
--
-- Both are SECURITY DEFINER with search_path restated, and the lookups are
-- dropped and recreated (RETURNS TABLE can't change in place), so GRANTs
-- are restated too — see MIGRATION_CHECKLIST.md.
-- =============================================================

-- ── 1. Anonymous queue ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_public_request_queue()
RETURNS TABLE (
  kind text,            -- 'booking' | 'event' | 'gadget'
  code text,            -- anonymous, NOT the reference number
  status text,
  request_date date,    -- Manila-local date it's for
  label text            -- device name for gadgets, otherwise NULL
)
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT 'booking'::text,
           upper(substr(md5(b.id::text), 1, 5)),
           b.status,
           b.booking_date,
           NULL::text
    FROM hub_bookings b
    WHERE b.status IN ('pending', 'under_review', 'approved')
      AND b.booking_date >= (now() AT TIME ZONE 'Asia/Manila')::date
      -- EVT-… rows are the seat reservations an event makes for itself,
      -- not requests from a person.
      AND b.booking_reference NOT LIKE 'EVT-%'
  )
  UNION ALL
  (
    SELECT 'event'::text,
           upper(substr(md5(e.id::text), 1, 5)),
           e.status,
           d.first_date,
           NULL::text
    FROM hub_events e
    CROSS JOIN LATERAL (
      SELECT min((x->>'date')::date) AS first_date
      FROM jsonb_array_elements(e.event_dates) x
      WHERE COALESCE(x->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
    ) d
    WHERE e.status IN ('pending_review', 'under_review')
      AND d.first_date IS NOT NULL
      AND d.first_date >= (now() AT TIME ZONE 'Asia/Manila')::date
  )
  UNION ALL
  (
    SELECT 'gadget'::text,
           upper(substr(md5(br.id::text), 1, 5)),
           br.status,
           (br.start_time AT TIME ZONE 'Asia/Manila')::date,
           a.name
    FROM borrowings br
    LEFT JOIN assets a ON a.id = br.asset_id
    WHERE br.status IN ('pending', 'approved', 'active')
      AND br.end_time >= now()
  )
  ORDER BY 4, 1
  LIMIT 200;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_request_queue() TO anon, authenticated;

-- ── 2. Email lookups mask the phone number ──────────────────────────
-- Keeps the last 4 digits ("•••••••4567") — enough for the person to
-- recognise as theirs, not enough to use.
DROP FUNCTION IF EXISTS lookup_hub_booking(text, text);
CREATE FUNCTION lookup_hub_booking(p_reference text, p_email text)
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
  package_name text,
  status_reason text,
  status_note text,
  status_changed_by text,
  original_booking_date date,
  original_start_time timestamptz,
  original_end_time timestamptz,
  promoted_event_title text,
  promoted_event_dates jsonb,
  promoted_event_status text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.booking_reference, b.guest_name, b.guest_email,
    CASE
      WHEN p_reference IS NOT NULL THEN b.guest_phone
      WHEN b.guest_phone IS NULL THEN NULL
      WHEN length(b.guest_phone) > 4 THEN repeat('•', length(b.guest_phone) - 4) || right(b.guest_phone, 4)
      ELSE b.guest_phone
    END,
    b.booking_date, b.start_time, b.end_time, b.status,
    b.booking_type, b.gathering_type, b.group_size, p.name,
    b.status_reason, b.status_note, b.status_changed_by,
    b.original_booking_date, b.original_start_time, b.original_end_time,
    ev.title, ev.event_dates, ev.status
  FROM hub_bookings b
  LEFT JOIN rental_packages p ON p.id = b.package_id
  LEFT JOIN events ev ON ev.id = b.promoted_to_event_id
  WHERE
    (p_reference IS NOT NULL AND b.booking_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND b.guest_email = p_email)
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_hub_booking(text, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS lookup_event_proposal(text, text);
CREATE FUNCTION lookup_event_proposal(p_reference text, p_email text)
RETURNS TABLE (
  proposal_reference text,
  organizer_name text,
  organizer_email text,
  organizer_phone text,
  title text,
  event_dates jsonb,
  status text,
  facebook_page text,
  status_reason text,
  status_note text,
  status_changed_by text,
  published_title text,
  published_event_dates jsonb,
  published_event_status text
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.proposal_reference, e.organizer_name, e.organizer_email,
    CASE
      WHEN p_reference IS NOT NULL THEN e.organizer_phone
      WHEN e.organizer_phone IS NULL THEN NULL
      WHEN length(e.organizer_phone) > 4 THEN repeat('•', length(e.organizer_phone) - 4) || right(e.organizer_phone, 4)
      ELSE e.organizer_phone
    END,
    e.title, e.event_dates, e.status, e.facebook_page,
    e.status_reason, e.status_note, e.status_changed_by,
    ev.title, ev.event_dates, ev.status
  FROM hub_events e
  LEFT JOIN events ev ON ev.id = e.published_event_id
  WHERE
    (p_reference IS NOT NULL AND e.proposal_reference = upper(p_reference))
    OR (p_reference IS NULL AND p_email IS NOT NULL AND e.organizer_email = p_email)
  ORDER BY e.created_at DESC;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION lookup_event_proposal(text, text) TO anon, authenticated;
