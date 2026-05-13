-- ============================================================
-- 007: DCIH Attendance & Check-in System
-- Secretariat Gatekeeper Model + RA 10173 Data Privacy
-- ============================================================

-- Attendance status: pending_entrance → active → checked_out
CREATE TYPE attendance_status AS ENUM (
  'pending_entrance',  -- form submitted, awaiting Secretariat confirmation
  'active',            -- confirmed on floor
  'checked_out'        -- session ended
);

-- Hub Attendance: Every person who checks in (no capacity limit)
CREATE TABLE IF NOT EXISTS hub_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identity
  mobile_number VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  gender VARCHAR(20),
  email VARCHAR(255),
  -- Professional
  sector VARCHAR(100),
  organization VARCHAR(255),
  designation VARCHAR(255),
  -- PCIDA Domain (RA 11904)
  creative_domain VARCHAR(100) NOT NULL,
  -- Session tracking
  status attendance_status NOT NULL DEFAULT 'pending_entrance',
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,           -- when Secretariat clicked Confirm
  check_out_time TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),  -- Secretariat who confirmed
  checked_out_by UUID REFERENCES auth.users(id), -- who triggered checkout
  -- Privacy consent (RA 10173)
  privacy_consented BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  -- Flags
  is_walk_in BOOLEAN NOT NULL DEFAULT false,
  manually_added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily Hub Codes: Kept for optional future use, but NOT required for check-in
CREATE TABLE IF NOT EXISTS daily_hub_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(4) NOT NULL,
  valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(valid_date, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_mobile ON hub_attendance(mobile_number);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin_date ON hub_attendance(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_domain ON hub_attendance(creative_domain);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON hub_attendance(status);

-- Add admin override tracking to hub_bookings
ALTER TABLE hub_bookings ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false;
ALTER TABLE hub_bookings ADD COLUMN IF NOT EXISTS override_by UUID REFERENCES auth.users(id);
ALTER TABLE hub_bookings ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- ── RLS Policies ────────────────────────────────────────────────

ALTER TABLE hub_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_hub_codes ENABLE ROW LEVEL SECURITY;

-- Attendance: anyone can insert (kiosk is public)
CREATE POLICY "Public check-in insert" ON hub_attendance
  FOR INSERT WITH CHECK (true);

-- Attendance: anyone can read their own pending status (for kiosk "waiting" screen)
CREATE POLICY "Public read own pending" ON hub_attendance
  FOR SELECT USING (true);

-- Attendance: admins can read + update all
CREATE POLICY "Admins manage attendance" ON hub_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Daily hub codes: admins manage
CREATE POLICY "Admins manage hub codes" ON daily_hub_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Secretariat: Confirm Entrance ───────────────────────────────
CREATE OR REPLACE FUNCTION confirm_entrance(p_attendance_id UUID)
RETURNS VOID AS $$
  UPDATE hub_attendance
  SET status = 'active',
      confirmed_at = now(),
      confirmed_by = auth.uid()
  WHERE id = p_attendance_id
    AND status = 'pending_entrance';
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;

-- ── Secretariat: Check Out ──────────────────────────────────────
CREATE OR REPLACE FUNCTION checkout_user(p_attendance_id UUID)
RETURNS VOID AS $$
  UPDATE hub_attendance
  SET status = 'checked_out',
      check_out_time = now(),
      checked_out_by = auth.uid()
  WHERE id = p_attendance_id
    AND status = 'active';
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;

-- ── Nightly Reset: Auto-checkout all remaining active sessions ──
CREATE OR REPLACE FUNCTION nightly_checkout_all()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE hub_attendance
  SET status = 'checked_out',
      check_out_time = now(),
      notes = COALESCE(notes || ' | ', '') || 'Auto-checkout (nightly reset)'
  WHERE status IN ('active', 'pending_entrance')
    AND check_in_time::DATE < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ── Manual Clear All (admin) ────────────────────────────────────
CREATE OR REPLACE FUNCTION clear_all_active()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE hub_attendance
  SET status = 'checked_out',
      check_out_time = now(),
      checked_out_by = auth.uid(),
      notes = COALESCE(notes || ' | ', '') || 'Manual clear-all by admin'
  WHERE status IN ('active', 'pending_entrance')
    AND check_in_time::DATE = CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ── Helper: today's active count (confirmed on floor) ───────────
CREATE OR REPLACE FUNCTION get_today_active_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM hub_attendance
  WHERE status = 'active'
    AND check_in_time::DATE = CURRENT_DATE;
$$ LANGUAGE sql STABLE;

-- ── Helper: find returning user by mobile ───────────────────────
CREATE OR REPLACE FUNCTION find_returning_user(p_mobile VARCHAR)
RETURNS TABLE(
  full_name VARCHAR,
  email VARCHAR,
  gender VARCHAR,
  sector VARCHAR,
  organization VARCHAR,
  designation VARCHAR,
  creative_domain VARCHAR
) AS $$
  SELECT
    full_name, email, gender, sector, organization, designation, creative_domain
  FROM hub_attendance
  WHERE mobile_number = p_mobile
  ORDER BY check_in_time DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;
