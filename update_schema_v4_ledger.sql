-- Add 'type' column to credit_transactions table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_transactions' AND column_name = 'type') THEN 
        ALTER TABLE credit_transactions ADD COLUMN type text DEFAULT 'Petrol Given'; 
    END IF;
END $$;

-- Disable Row-Level Security (RLS) on credit_transactions to ensure anonymous inserts work
alter table credit_transactions disable row level security;
