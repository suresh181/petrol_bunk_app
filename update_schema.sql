-- SAFE UPDATE SCRIPT
-- Run this to update your existing database without errors

-- 1. Add Attendant Name column (Safe: checks if it exists first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nozzles' AND column_name = 'attendant_name') THEN
        ALTER TABLE nozzles ADD COLUMN attendant_name text DEFAULT 'Staff';
    END IF;
END $$;

-- 2. Ensure Realtime is enabled (Safe to re-run)
alter publication supabase_realtime add table fuel_prices;
alter publication supabase_realtime add table nozzles;
alter publication supabase_realtime add table customers;
