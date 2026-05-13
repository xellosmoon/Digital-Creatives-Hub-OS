-- ============================================================
-- DCIH Location Refinement Migration
-- Migration: 004_location_refinement.sql
-- ============================================================
-- Decouples physical location tracking from pricing logic.
-- - `usage_type` (inside/outside) drives pricing
-- - `current_location` / `destination_location` tracks WHERE the item is

-- -----------------------------------------------
-- 1. ADD current_location to ITEMS
--    Default home for every unit
-- -----------------------------------------------
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS current_location TEXT NOT NULL DEFAULT 'DCIH Storage';

-- -----------------------------------------------
-- 2. ADD destination_location to BORROWINGS
--    Where the item went during this specific trip
-- -----------------------------------------------
ALTER TABLE borrowings
  ADD COLUMN IF NOT EXISTS destination_location TEXT;

-- -----------------------------------------------
-- 3. RENAME existing `location` column to `usage_type`
--    in BORROWINGS (keeps pricing driver clear)
-- -----------------------------------------------
-- First check if the column exists with old name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrowings' AND column_name = 'location'
  ) THEN
    ALTER TABLE borrowings RENAME COLUMN location TO usage_type;
  END IF;
END $$;

-- -----------------------------------------------
-- 4. TRIGGER: Auto-reset item location on return
--    When borrowing status → 'returned', set item's
--    current_location back to 'DCIH Storage'
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION reset_item_location_on_return()
RETURNS TRIGGER AS $$
BEGIN
  -- When borrowing is returned, reset the item's location
  IF NEW.status = 'returned' AND OLD.status != 'returned' THEN
    UPDATE items
    SET current_location = 'DCIH Storage'
    WHERE id = NEW.item_id;
  END IF;

  -- When borrowing is approved/active, update item's current_location
  IF NEW.status IN ('active', 'approved') AND OLD.status NOT IN ('active', 'approved') THEN
    UPDATE items
    SET current_location = COALESCE(NEW.destination_location, 
      CASE WHEN NEW.usage_type = 'inside' THEN 'Inside DCIH' ELSE 'Outside DCIH' END)
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reset_item_location ON borrowings;
CREATE TRIGGER trg_reset_item_location
  AFTER UPDATE ON borrowings
  FOR EACH ROW
  EXECUTE FUNCTION reset_item_location_on_return();

-- Separate function for insert since OLD doesn't exist
CREATE OR REPLACE FUNCTION set_item_location_on_borrow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE items
  SET current_location = COALESCE(NEW.destination_location,
    CASE WHEN NEW.usage_type = 'inside' THEN 'Inside DCIH' ELSE 'Outside DCIH' END)
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also fire on insert (for manual borrows that start as 'active')
DROP TRIGGER IF EXISTS trg_set_item_location_on_insert ON borrowings;
CREATE TRIGGER trg_set_item_location_on_insert
  AFTER INSERT ON borrowings
  FOR EACH ROW
  WHEN (NEW.status IN ('active', 'approved'))
  EXECUTE FUNCTION set_item_location_on_borrow();

-- -----------------------------------------------
-- 5. Backfill existing items with default location
-- -----------------------------------------------
UPDATE items SET current_location = 'DCIH Storage' WHERE current_location IS NULL;
