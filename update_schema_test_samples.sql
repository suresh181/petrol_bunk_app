-- Add Test Sample Columns to Sales Records

DO $$ 
BEGIN 
    -- Add Petrol Test Samples (General Shift)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'petrol_test_samples') THEN 
        ALTER TABLE sales_records ADD COLUMN petrol_test_samples numeric DEFAULT 0; 
    END IF;

    -- Add Diesel Test Samples (24 Hours)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_records' AND column_name = 'diesel_test_samples') THEN 
        ALTER TABLE sales_records ADD COLUMN diesel_test_samples numeric DEFAULT 0; 
    END IF;
END $$;
