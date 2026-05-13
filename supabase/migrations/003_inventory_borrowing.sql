-- ============================================================
-- DCIH Inventory & Borrowing System
-- Migration: 003_inventory_borrowing.sql
-- ============================================================

-- -----------------------------------------------
-- 1. ASSETS – general product catalogue
-- -----------------------------------------------
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                           -- e.g. "Huawei IdeaHub"
  slug TEXT UNIQUE NOT NULL,                    -- e.g. "huawei-ideahub"
  category TEXT NOT NULL CHECK (category IN (
    'interactive_display', 'drawing_tablet', 'computer',
    'action_camera', 'camera', 'smartphone', 'drone', 'webcam'
  )),
  description TEXT,
  image_url TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  location_mode TEXT NOT NULL DEFAULT 'both' CHECK (location_mode IN ('inside_only', 'outside_only', 'both')),
  requires_notice TEXT,                         -- e.g. "Users must bring their own external hard drives."
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 2. ITEMS – individual trackable units
-- -----------------------------------------------
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  serial_number TEXT,
  asset_tag TEXT UNIQUE,                        -- internal barcode / QR label
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN (
    'available', 'borrowed', 'maintenance', 'broken', 'retired'
  )),
  condition_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. PRICING_CONFIG – tiered, location-aware rates
--    Each row = one (asset, location, duration_hours) → price
-- -----------------------------------------------
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  location TEXT NOT NULL CHECK (location IN ('inside', 'outside')),
  duration_hours NUMERIC(8,2) NOT NULL,         -- e.g. 1, 6, 8, 12, 24, 48, 72
  duration_label TEXT NOT NULL,                  -- human-readable: "1 hr", "2 days"
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset_id, location, duration_hours)
);

-- -----------------------------------------------
-- 4. BORROWINGS – checkout / return log
-- -----------------------------------------------
CREATE TABLE borrowings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrowing_reference TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  location TEXT NOT NULL CHECK (location IN ('inside', 'outside')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  actual_return_time TIMESTAMPTZ,
  duration_hours NUMERIC(8,2) NOT NULL,
  matched_tier_hours NUMERIC(8,2) NOT NULL,     -- the tier the engine selected
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'active', 'returned', 'overdue', 'cancelled'
  )),
  purpose TEXT,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- INDEXES
-- -----------------------------------------------
CREATE INDEX idx_items_asset_id ON items(asset_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_pricing_config_asset ON pricing_config(asset_id, location);
CREATE INDEX idx_borrowings_item ON borrowings(item_id);
CREATE INDEX idx_borrowings_user ON borrowings(user_id);
CREATE INDEX idx_borrowings_status ON borrowings(status);
CREATE INDEX idx_borrowings_end_time ON borrowings(end_time);

-- -----------------------------------------------
-- TRIGGERS
-- -----------------------------------------------

-- Auto-generate borrowing reference (same pattern as bookings)
CREATE OR REPLACE FUNCTION trigger_generate_borrowing_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.borrowing_reference IS NULL THEN
    NEW.borrowing_reference := 'BRW-' || generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER borrowing_reference_trigger
BEFORE INSERT ON borrowings
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_borrowing_reference();

-- Auto-update updated_at
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_borrowings_updated_at BEFORE UPDATE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-set item status to 'borrowed' on approved borrowing
CREATE OR REPLACE FUNCTION sync_item_status_on_borrowing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' OR NEW.status = 'active' THEN
    UPDATE items SET status = 'borrowed' WHERE id = NEW.item_id;
  ELSIF NEW.status = 'returned' OR NEW.status = 'cancelled' THEN
    UPDATE items SET status = 'available' WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER borrowing_status_sync
AFTER INSERT OR UPDATE OF status ON borrowings
FOR EACH ROW
EXECUTE FUNCTION sync_item_status_on_borrowing();

-- -----------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowings ENABLE ROW LEVEL SECURITY;

-- Assets: public read
CREATE POLICY "Anyone can view assets" ON assets FOR SELECT USING (true);
CREATE POLICY "Admins manage assets" ON assets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Items: public read
CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Admins manage items" ON items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Pricing: public read
CREATE POLICY "Anyone can view pricing" ON pricing_config FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing" ON pricing_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Borrowings
CREATE POLICY "Users can create borrowings" ON borrowings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own borrowings" ON borrowings FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can cancel own pending" ON borrowings FOR UPDATE USING (
  (auth.uid() = user_id AND status = 'pending') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins manage all borrowings" ON borrowings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- -----------------------------------------------
-- SEED DATA: Assets
-- -----------------------------------------------
INSERT INTO assets (name, slug, category, total_quantity, location_mode, requires_notice, description) VALUES
  ('Huawei IdeaHub', 'huawei-ideahub', 'interactive_display', 2, 'both', NULL,
   'Interactive White Board for presentations and collaboration'),
  ('Wacom Cintiq 16', 'wacom-cintiq-16', 'drawing_tablet', 1, 'both', NULL,
   'Professional pen display for digital art and design'),
  ('High Performance PC', 'high-performance-pc', 'computer', 5, 'inside_only',
   'Users must bring their own external hard drives.',
   'Workstation for heavy creative tasks – rendering, editing, 3D'),
  ('Action Camera', 'action-camera', 'action_camera', 2, 'outside_only',
   NULL, 'Compact action camera for field and outdoor shoots'),
  ('Canon EOS R50', 'canon-eos-r50', 'camera', 3, 'outside_only',
   NULL, 'Mirrorless camera for professional photography & videography'),
  ('iPhone 15 Pro', 'iphone-15-pro', 'smartphone', 6, 'outside_only',
   NULL, 'Smartphone for mobile content creation'),
  ('High-quality Drone', 'high-quality-drone', 'drone', 2, 'outside_only',
   NULL, 'Aerial photography and videography drone'),
  ('BRIO Ultra HD Webcam', 'brio-webcam', 'webcam', 2, 'outside_only',
   NULL, 'Ultra HD webcam for streaming and video calls');

-- -----------------------------------------------
-- SEED DATA: Items (individual units with asset tags)
-- -----------------------------------------------

-- Huawei IdeaHub × 2
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'HIH-' || LPAD(gs::text, 4, '0'), 'DCIH-HIH-' || gs
FROM assets, generate_series(1,2) gs WHERE slug = 'huawei-ideahub';

-- Wacom Cintiq 16 × 1
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'WCQ-0001', 'DCIH-WCQ-1'
FROM assets WHERE slug = 'wacom-cintiq-16';

-- High Performance PC × 5
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'HPC-' || LPAD(gs::text, 4, '0'), 'DCIH-HPC-' || gs
FROM assets, generate_series(1,5) gs WHERE slug = 'high-performance-pc';

-- Action Camera × 2
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'ACM-' || LPAD(gs::text, 4, '0'), 'DCIH-ACM-' || gs
FROM assets, generate_series(1,2) gs WHERE slug = 'action-camera';

-- Canon EOS R50 × 3
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'R50-' || LPAD(gs::text, 4, '0'), 'DCIH-R50-' || gs
FROM assets, generate_series(1,3) gs WHERE slug = 'canon-eos-r50';

-- iPhone 15 Pro × 6
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'IPH-' || LPAD(gs::text, 4, '0'), 'DCIH-IPH-' || gs
FROM assets, generate_series(1,6) gs WHERE slug = 'iphone-15-pro';

-- High-quality Drone × 2
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'DRN-' || LPAD(gs::text, 4, '0'), 'DCIH-DRN-' || gs
FROM assets, generate_series(1,2) gs WHERE slug = 'high-quality-drone';

-- BRIO Ultra HD Webcam × 2
INSERT INTO items (asset_id, serial_number, asset_tag)
SELECT id, 'BRO-' || LPAD(gs::text, 4, '0'), 'DCIH-BRO-' || gs
FROM assets, generate_series(1,2) gs WHERE slug = 'brio-webcam';

-- -----------------------------------------------
-- SEED DATA: Pricing Config (all rates in PHP ₱)
-- -----------------------------------------------

-- Huawei IdeaHub – Inside
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'inside', dh, dl, p FROM assets, (VALUES
  (1,    '1 hr',    500),
  (8,    '8 hrs',   2500),
  (24,   '24 hrs',  4000)
) AS t(dh, dl, p) WHERE slug = 'huawei-ideahub';

-- Huawei IdeaHub – Outside
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (1,    '1 hr',    900),
  (8,    '8 hrs',   4500),
  (24,   '24 hrs',  7000)
) AS t(dh, dl, p) WHERE slug = 'huawei-ideahub';

-- Wacom Cintiq 16 – Inside
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'inside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   300),
  (12,   '12 hrs',  500),
  (24,   '24 hrs',  900),
  (48,   '2 days',  1200),
  (72,   '3 days',  1800)
) AS t(dh, dl, p) WHERE slug = 'wacom-cintiq-16';

-- Wacom Cintiq 16 – Outside
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   500),
  (12,   '12 hrs',  800),
  (24,   '24 hrs',  1500),
  (48,   '2 days',  2000),
  (72,   '3 days',  3000)
) AS t(dh, dl, p) WHERE slug = 'wacom-cintiq-16';

-- High Performance PC – Inside Only
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'inside', dh, dl, p FROM assets, (VALUES
  (1,    '1 hr',    100),
  (12,   '12 hrs',  1200),
  (24,   '24 hrs',  2000)
) AS t(dh, dl, p) WHERE slug = 'high-performance-pc';

-- Action Camera – Outside Only
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   350),
  (12,   '12 hrs',  550),
  (24,   '24 hrs',  750)
) AS t(dh, dl, p) WHERE slug = 'action-camera';

-- Canon EOS R50 – Outside Only
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   400),
  (12,   '12 hrs',  600),
  (24,   '24 hrs',  800)
) AS t(dh, dl, p) WHERE slug = 'canon-eos-r50';

-- iPhone 15 Pro – Outside Only
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   400),
  (12,   '12 hrs',  600),
  (24,   '24 hrs',  800)
) AS t(dh, dl, p) WHERE slug = 'iphone-15-pro';

-- High-quality Drone – Outside Only
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   450),
  (24,   '24 hrs',  600),
  (48,   '2 days',  1100),
  (72,   '3 days',  1400)
) AS t(dh, dl, p) WHERE slug = 'high-quality-drone';

-- BRIO Webcam – Outside Only
INSERT INTO pricing_config (asset_id, location, duration_hours, duration_label, price)
SELECT id, 'outside', dh, dl, p FROM assets, (VALUES
  (6,    '6 hrs',   350),
  (12,   '12 hrs',  550),
  (24,   '24 hrs',  750)
) AS t(dh, dl, p) WHERE slug = 'brio-webcam';
