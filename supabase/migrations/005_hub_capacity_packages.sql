-- ============================================================
-- DCIH Hub Capacity & Packages Migration
-- Migration: 005_hub_capacity_packages.sql
-- ============================================================
-- Shifts from static "rooms" to fluid hub capacity (28 seats)
-- with zone-based layout and rental packages.

-- -----------------------------------------------
-- 0. ENSURE PREREQUISITE FUNCTIONS EXIST
--    (safe to re-run; uses CREATE OR REPLACE)
-- -----------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 1. HUB ZONES (Quadrants)
-- -----------------------------------------------
CREATE TABLE hub_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  equipment_summary TEXT,
  is_bookable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO hub_zones (name, label, seats, description, equipment_summary, is_bookable) VALUES
  ('q2_tech', 'Quadrant 2 – Tech Zone', 20,
   '2 big tables (20 seats), 1 Huawei IdeaHub, 5 High-Performance PCs',
   '20 seats, 1 IdeaHub, 5 PCs', true),
  ('q4_creative', 'Quadrant 4 – Creative Zone', 6,
   '6 smaller tables (6 seats)',
   '6 seats', true),
  ('q1_staff', 'Quadrant 1 – Secretariat / Staff', 0,
   'Staff area, not counted toward public capacity',
   NULL, false),
  ('q3_lounge', 'Quadrant 3 – Lounge / Sofas', 0,
   'Lounge & sofa area, not counted toward public capacity',
   NULL, false);

-- -----------------------------------------------
-- 2. HUB CAPACITY CONFIG (single-row settings)
-- -----------------------------------------------
CREATE TABLE hub_capacity_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_seats INTEGER NOT NULL DEFAULT 28,
  manual_adjustment INTEGER NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO hub_capacity_config (total_seats, manual_adjustment) VALUES (28, 0);

-- -----------------------------------------------
-- 3. RENTAL PACKAGES
-- -----------------------------------------------
CREATE TYPE package_billing_mode AS ENUM ('hourly', 'daily', 'hourly_or_daily');

CREATE TABLE rental_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  billing_mode package_billing_mode NOT NULL DEFAULT 'hourly',
  hourly_rate NUMERIC(10,2),
  daily_rate NUMERIC(10,2),
  seats_consumed INTEGER NOT NULL DEFAULT 1,
  requires_student_flag BOOLEAN NOT NULL DEFAULT false,
  weekend_only BOOLEAN NOT NULL DEFAULT false,
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rental_packages
  (slug, name, description, billing_mode, hourly_rate, daily_rate, seats_consumed, requires_student_flag, weekend_only, is_bundle, sort_order)
VALUES
  ('coworking_hourly', 'Coworking Hourly', 'General seat, pay per hour',
   'hourly', 25, NULL, 1, false, false, false, 1),

  ('student_pass', 'Student Pass', 'Discounted rate for verified students',
   'hourly_or_daily', 20, 360, 1, true, false, false, 2),

  ('coworker_lite', 'Coworker Lite', 'Standard access, hourly or daily',
   'hourly_or_daily', 20, 400, 1, false, false, false, 3),

  ('weekend_creator', 'Weekend Creator Pass', 'Full-day weekend access (Sat–Sun)',
   'daily', NULL, 1200, 1, false, true, false, 4),

  ('creative_suite', 'Creative Suite', 'Bundle: 1 PC + 1 Wacom + 1 iPhone',
   'daily', NULL, 1500, 1, false, false, true, 5),

  ('production_access', 'Production Access', 'Bundle: 1 DSLR + 1 PC + Studio area',
   'daily', NULL, 3000, 2, false, false, true, 6);

-- -----------------------------------------------
-- 4. BUNDLE REQUIRED EQUIPMENT
--    Links bundles to asset categories + qty needed
-- -----------------------------------------------
CREATE TABLE package_required_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES rental_packages(id) ON DELETE CASCADE,
  asset_category TEXT NOT NULL,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO package_required_assets (package_id, asset_category, quantity_needed)
SELECT rp.id, cat.category, cat.qty
FROM rental_packages rp
CROSS JOIN (VALUES
  ('computer', 1),
  ('drawing_tablet', 1),
  ('smartphone', 1)
) AS cat(category, qty)
WHERE rp.slug = 'creative_suite';

INSERT INTO package_required_assets (package_id, asset_category, quantity_needed)
SELECT rp.id, cat.category, cat.qty
FROM rental_packages rp
CROSS JOIN (VALUES
  ('camera', 1),
  ('computer', 1)
) AS cat(category, qty)
WHERE rp.slug = 'production_access';

-- -----------------------------------------------
-- 5. DAILY OCCUPANCY TRACKER
-- -----------------------------------------------
CREATE TABLE daily_occupancy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupancy_date DATE NOT NULL,
  total_booked_seats INTEGER NOT NULL DEFAULT 0,
  workshop_block_q2 BOOLEAN NOT NULL DEFAULT false,
  workshop_block_q4 BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_occupancy_date UNIQUE (occupancy_date)
);

-- -----------------------------------------------
-- 6. HUB BOOKINGS (replaces room-based bookings)
-- -----------------------------------------------
CREATE TABLE hub_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  package_id UUID NOT NULL REFERENCES rental_packages(id),
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  booking_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  seats_used INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','active','completed','cancelled','rejected')),
  is_workshop BOOLEAN NOT NULL DEFAULT false,
  workshop_zones TEXT[] DEFAULT '{}',
  purpose TEXT,
  notes TEXT,
  booking_reference TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT hub_booking_has_contact CHECK (
    user_id IS NOT NULL OR guest_email IS NOT NULL
  )
);

-- Auto-generate booking reference for hub_bookings
CREATE TRIGGER hub_booking_reference_trigger
  BEFORE INSERT ON hub_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_booking_reference();

CREATE TRIGGER update_hub_bookings_updated_at
  BEFORE UPDATE ON hub_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- 7. INDEXES
-- -----------------------------------------------
CREATE INDEX idx_hub_bookings_date ON hub_bookings(booking_date);
CREATE INDEX idx_hub_bookings_status ON hub_bookings(status);
CREATE INDEX idx_hub_bookings_package ON hub_bookings(package_id);
CREATE INDEX idx_hub_bookings_user ON hub_bookings(user_id);
CREATE INDEX idx_hub_bookings_reference ON hub_bookings(booking_reference);
CREATE INDEX idx_daily_occupancy_date ON daily_occupancy(occupancy_date);

-- -----------------------------------------------
-- 8. FUNCTION: Compute available seats for a date
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION get_available_seats(target_date DATE)
RETURNS INTEGER AS $$
DECLARE
  cfg RECORD;
  booked INTEGER;
  workshop_full BOOLEAN;
BEGIN
  SELECT total_seats, manual_adjustment INTO cfg
  FROM hub_capacity_config LIMIT 1;

  -- Check if full-hub workshop is active
  SELECT
    (COALESCE(workshop_block_q2, false) AND COALESCE(workshop_block_q4, false))
  INTO workshop_full
  FROM daily_occupancy
  WHERE occupancy_date = target_date;

  IF workshop_full IS TRUE THEN
    RETURN 0;
  END IF;

  -- Count seats from approved/active bookings
  SELECT COALESCE(SUM(seats_used), 0) INTO booked
  FROM hub_bookings
  WHERE booking_date = target_date
    AND status IN ('approved', 'active');

  RETURN GREATEST(0, cfg.total_seats + cfg.manual_adjustment - booked);
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 9. FUNCTION: Check bundle availability
--    Returns true if all required assets are available
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION check_bundle_availability(p_package_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  req RECORD;
  available_count INTEGER;
BEGIN
  FOR req IN
    SELECT asset_category, quantity_needed
    FROM package_required_assets
    WHERE package_id = p_package_id
  LOOP
    SELECT COUNT(*) INTO available_count
    FROM items i
    JOIN assets a ON a.id = i.asset_id
    WHERE a.category = req.asset_category
      AND i.status = 'available';

    IF available_count < req.quantity_needed THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 10. TRIGGER: Update daily_occupancy on booking change
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION sync_daily_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  target DATE;
BEGIN
  target := COALESCE(NEW.booking_date, OLD.booking_date);

  INSERT INTO daily_occupancy (occupancy_date, total_booked_seats)
  VALUES (
    target,
    (SELECT COALESCE(SUM(seats_used), 0)
     FROM hub_bookings
     WHERE booking_date = target
       AND status IN ('approved', 'active'))
  )
  ON CONFLICT (occupancy_date) DO UPDATE
  SET total_booked_seats = (
    SELECT COALESCE(SUM(seats_used), 0)
    FROM hub_bookings
    WHERE booking_date = target
      AND status IN ('approved', 'active')
  ),
  updated_at = NOW();

  -- Sync workshop blocks
  UPDATE daily_occupancy
  SET
    workshop_block_q2 = EXISTS (
      SELECT 1 FROM hub_bookings
      WHERE booking_date = target
        AND is_workshop = true
        AND 'q2_tech' = ANY(workshop_zones)
        AND status IN ('approved', 'active')
    ),
    workshop_block_q4 = EXISTS (
      SELECT 1 FROM hub_bookings
      WHERE booking_date = target
        AND is_workshop = true
        AND 'q4_creative' = ANY(workshop_zones)
        AND status IN ('approved', 'active')
    )
  WHERE occupancy_date = target;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_occupancy_insert
  AFTER INSERT ON hub_bookings
  FOR EACH ROW EXECUTE FUNCTION sync_daily_occupancy();

CREATE TRIGGER trg_sync_occupancy_update
  AFTER UPDATE ON hub_bookings
  FOR EACH ROW EXECUTE FUNCTION sync_daily_occupancy();

-- -----------------------------------------------
-- 11. ROW LEVEL SECURITY
-- -----------------------------------------------
ALTER TABLE hub_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_capacity_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_required_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_bookings ENABLE ROW LEVEL SECURITY;

-- Public read for zones, packages, occupancy
CREATE POLICY "Anyone can view hub zones"
  ON hub_zones FOR SELECT USING (true);

CREATE POLICY "Anyone can view rental packages"
  ON rental_packages FOR SELECT USING (true);

CREATE POLICY "Anyone can view daily occupancy"
  ON daily_occupancy FOR SELECT USING (true);

CREATE POLICY "Anyone can view hub capacity config"
  ON hub_capacity_config FOR SELECT USING (true);

CREATE POLICY "Anyone can view package required assets"
  ON package_required_assets FOR SELECT USING (true);

-- Hub bookings: anyone can insert, users see own, admins see all
CREATE POLICY "Anyone can create a hub booking"
  ON hub_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own hub bookings"
  ON hub_bookings FOR SELECT
  USING (
    auth.uid() = user_id
    OR guest_email IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all hub bookings"
  ON hub_bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin-only writes for config tables
CREATE POLICY "Admins can manage hub capacity"
  ON hub_capacity_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage hub zones"
  ON hub_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage rental packages"
  ON rental_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage package required assets"
  ON package_required_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage daily occupancy"
  ON daily_occupancy FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------
-- 12. Add is_verified_student to profiles
-- -----------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified_student BOOLEAN DEFAULT false;
