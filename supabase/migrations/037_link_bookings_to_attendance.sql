-- ============================================================
-- 037: Link hub_bookings to hub_attendance
-- Allows admin to check in users from approved bookings
-- ============================================================

-- Add booking_id column to hub_attendance to link with hub_bookings
ALTER TABLE hub_attendance 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES hub_bookings(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_booking_id ON hub_attendance(booking_id);

-- Make creative_domain optional (not required) for booking-based check-ins
ALTER TABLE hub_attendance 
ALTER COLUMN creative_domain DROP NOT NULL;

-- Add creative_domain to hub_bookings (optional, for better data capture)
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS creative_domain VARCHAR(100);

-- Add gender to hub_bookings (optional, for better data capture)
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add sector to hub_bookings (optional, for better data capture)
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS sector VARCHAR(100);

-- Add organization to hub_bookings (optional, for better data capture)
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS organization VARCHAR(255);

-- Add designation to hub_bookings (optional, for better data capture)
ALTER TABLE hub_bookings 
ADD COLUMN IF NOT EXISTS designation VARCHAR(255);

-- Function to create attendance record from booking
CREATE OR REPLACE FUNCTION create_attendance_from_booking(
  p_booking_id UUID,
  p_creative_domain VARCHAR DEFAULT NULL,
  p_gender VARCHAR DEFAULT NULL,
  p_sector VARCHAR DEFAULT NULL,
  p_organization VARCHAR DEFAULT NULL,
  p_designation VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_attendance_id UUID;
  v_booking RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM hub_bookings
  WHERE id = p_booking_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or not approved';
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
    status,
    check_in_time,
    privacy_consented,
    consent_timestamp,
    is_walk_in,
    booking_id,
    notes
  ) VALUES (
    COALESCE(v_booking.guest_phone, '00000000000'),
    COALESCE(v_booking.guest_name, 'Guest'),
    COALESCE(p_gender, v_booking.gender),
    v_booking.guest_email,
    COALESCE(p_sector, v_booking.sector),
    COALESCE(p_organization, v_booking.organization),
    COALESCE(p_designation, v_booking.designation),
    COALESCE(p_creative_domain, v_booking.creative_domain),
    'pending_entrance',
    NOW(),
    true,
    NOW(),
    false,
    p_booking_id,
    'Created from booking: ' || COALESCE(v_booking.booking_reference, v_booking.id::text)
  )
  RETURNING id INTO v_attendance_id;
  
  RETURN v_attendance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
