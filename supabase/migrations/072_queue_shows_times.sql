-- =============================================================
-- Migration 072: Public request queue shows start/end times
-- =============================================================
-- 071's anonymous queue only had a date per request. Gadget borrowing is
-- charged and reported by the hour (it feeds Analytics), so a borrow
-- without its time window says very little — and bookings/events have a
-- window too. This adds starts_at / ends_at.
--
-- RETURNS TABLE can't change via CREATE OR REPLACE, so drop and recreate;
-- that drops the grants, so SECURITY DEFINER, search_path and GRANT are
-- restated (see MIGRATION_CHECKLIST.md). Run AFTER 071.
-- =============================================================

DROP FUNCTION IF EXISTS get_public_request_queue();
CREATE FUNCTION get_public_request_queue()
RETURNS TABLE (
  kind text,            -- 'booking' | 'event' | 'gadget'
  code text,            -- anonymous, NOT the reference number
  status text,
  request_date date,    -- Manila-local date it starts
  starts_at timestamptz,
  ends_at timestamptz,
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
           b.start_time,
           b.end_time,
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
           CASE WHEN d.s ~ '^\d{2}:\d{2}'
                THEN ((d.first_date::text || ' ' || substr(d.s, 1, 5))::timestamp AT TIME ZONE 'Asia/Manila') END,
           CASE WHEN d.t ~ '^\d{2}:\d{2}'
                THEN ((d.first_date::text || ' ' || substr(d.t, 1, 5))::timestamp AT TIME ZONE 'Asia/Manila') END,
           NULL::text
    FROM hub_events e
    CROSS JOIN LATERAL (
      -- The earliest valid date of the proposal, with its own times.
      SELECT (x->>'date')::date AS first_date, x->>'start_time' AS s, x->>'end_time' AS t
      FROM jsonb_array_elements(e.event_dates) x
      WHERE COALESCE(x->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
      ORDER BY x->>'date'
      LIMIT 1
    ) d
    WHERE e.status IN ('pending_review', 'under_review')
      AND d.first_date >= (now() AT TIME ZONE 'Asia/Manila')::date
  )
  UNION ALL
  (
    SELECT 'gadget'::text,
           upper(substr(md5(br.id::text), 1, 5)),
           br.status,
           (br.start_time AT TIME ZONE 'Asia/Manila')::date,
           br.start_time,
           br.end_time,
           a.name
    FROM borrowings br
    LEFT JOIN assets a ON a.id = br.asset_id
    WHERE br.status IN ('pending', 'approved', 'active')
      AND br.end_time >= now()
  )
  ORDER BY 4, 5, 1
  LIMIT 200;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_public_request_queue() TO anon, authenticated;
