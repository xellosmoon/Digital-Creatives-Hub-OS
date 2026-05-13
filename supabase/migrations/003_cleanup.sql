-- Run this FIRST to clean up partial 003 migration, then re-run 003_inventory_borrowing.sql

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS borrowings CASCADE;
DROP TABLE IF EXISTS pricing_config CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

-- Drop triggers/functions that may have been created
DROP FUNCTION IF EXISTS trigger_generate_borrowing_reference() CASCADE;
DROP FUNCTION IF EXISTS sync_item_status_on_borrowing() CASCADE;
