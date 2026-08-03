-- ============================================================
-- Migration 039: Convert creative_domain to array, add purpose_of_visit
-- ============================================================

-- Add new array column for creative domains
ALTER TABLE hub_attendance 
ADD COLUMN IF NOT EXISTS creative_domains TEXT[];

-- Migrate existing single creative_domain values to array
UPDATE hub_attendance 
SET creative_domains = ARRAY[creative_domain]::TEXT[]
WHERE creative_domain IS NOT NULL 
  AND creative_domain != ''
  AND (creative_domains IS NULL OR array_length(creative_domains, 1) IS NULL);

-- Add purpose_of_visit as array column
ALTER TABLE hub_attendance 
ADD COLUMN IF NOT EXISTS purpose_of_visit TEXT[];

-- Drop old single-value column after migration (safe to drop now)
-- We'll keep it for now as a fallback, can drop in future migration
-- ALTER TABLE hub_attendance DROP COLUMN IF EXISTS creative_domain;

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS find_returning_user(character varying);

-- Update find_returning_user to return arrays
CREATE OR REPLACE FUNCTION find_returning_user(p_mobile VARCHAR)
RETURNS TABLE(
  full_name VARCHAR,
  email VARCHAR,
  gender VARCHAR,
  sector VARCHAR,
  organization VARCHAR,
  designation VARCHAR,
  creative_domain TEXT[],
  creative_domains TEXT[],
  purpose_of_visit TEXT[]
) AS $$
  SELECT
    full_name, 
    email, 
    gender, 
    sector, 
    organization, 
    designation, 
    ARRAY[creative_domain]::TEXT[] as creative_domain,
    creative_domains,
    purpose_of_visit
  FROM hub_attendance
  WHERE mobile_number = p_mobile
  ORDER BY check_in_time DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Update hub_bookings to also have these array columns for consistency
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS creative_domains TEXT[];

ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS purpose_of_visit TEXT[];

-- Migrate existing hub_bookings creative_domain to array
UPDATE hub_bookings 
SET creative_domains = ARRAY[creative_domain]::TEXT[]
WHERE creative_domain IS NOT NULL 
  AND creative_domain != ''
  AND (creative_domains IS NULL OR array_length(creative_domains, 1) IS NULL);

-- Drop existing function to allow parameter changes
DROP FUNCTION IF EXISTS create_attendance_from_booking(
  UUID,
  VARCHAR,
  VARCHAR,
  VARCHAR,
  VARCHAR,
  VARCHAR,
  TEXT[],
  TEXT[]
);

-- Update create_attendance_from_booking to handle arrays
CREATE OR REPLACE FUNCTION create_attendance_from_booking(
  p_booking_id UUID,
  p_creative_domain VARCHAR DEFAULT NULL,
  p_gender VARCHAR DEFAULT NULL,
  p_sector VARCHAR DEFAULT NULL,
  p_organization VARCHAR DEFAULT NULL,
  p_designation VARCHAR DEFAULT NULL,
  p_creative_domains TEXT[] DEFAULT NULL,
  p_purpose_of_visit TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking RECORD;
  v_attendance_id UUID;
BEGIN
  -- Get booking details
  SELECT 
    hb.*,
    rp.name as package_name
  INTO v_booking
  FROM hub_bookings hb
  LEFT JOIN rental_packages rp ON hb.package_id = rp.id
  WHERE hb.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Create attendance record
  INSERT INTO hub_attendance (
    mobile_number,
    full_name,
    gender,
    email,
    sector,
    organization,
    designation,
    creative_domain,
    creative_domains,
    purpose_of_visit,
    status,
    check_in_time,
    privacy_consented,
    booking_id
  ) VALUES (
    COALESCE(v_booking.guest_phone, 'N/A'),
    COALESCE(v_booking.guest_name, v_booking.package_name || ' Booking'),
    p_gender,
    v_booking.guest_email,
    p_sector,
    p_organization,
    p_designation,
    COALESCE(p_creative_domain, v_booking.creative_domain),
    COALESCE(p_creative_domains, v_booking.creative_domains),
    p_purpose_of_visit,
    'pending_entrance',
    NOW(),
    true,
    p_booking_id
  )
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
