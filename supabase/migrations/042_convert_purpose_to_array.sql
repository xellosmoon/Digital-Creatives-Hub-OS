-- =============================================================
-- Migration: Convert purpose column to TEXT[] array in hub_bookings
-- Purpose:   Support multi-select purpose field for bookings
-- =============================================================

-- Convert purpose column to TEXT[] array
ALTER TABLE hub_bookings 
ALTER COLUMN purpose TYPE TEXT[] USING CASE 
  WHEN purpose IS NULL THEN NULL 
  ELSE ARRAY[purpose] 
END;

-- Add comment
COMMENT ON COLUMN hub_bookings.purpose IS 'Array of purpose tags (multi-select)';
