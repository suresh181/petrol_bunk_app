-- Add Specific Test Sample Columns (Taken/Returned)
-- This replaces the simple 'test_samples' with detailed auditing

DO $$ 
BEGIN 
    -- Petrol (MS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'petrol_test_taken') THEN 
        ALTER TABLE sales_records ADD COLUMN petrol_test_taken numeric DEFAULT 0; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'petrol_test_returned') THEN 
        ALTER TABLE sales_records ADD COLUMN petrol_test_returned numeric DEFAULT 0; 
    END IF;

    -- Diesel (HSD)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'diesel_test_taken') THEN 
        ALTER TABLE sales_records ADD COLUMN diesel_test_taken numeric DEFAULT 0; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'diesel_test_returned') THEN 
        ALTER TABLE sales_records ADD COLUMN diesel_test_returned numeric DEFAULT 0; 
    END IF;

    -- Today Settlement
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'today_settlement_amount') THEN 
        ALTER TABLE sales_records ADD COLUMN today_settlement_amount numeric DEFAULT 0; 
    END IF;
END $$;
