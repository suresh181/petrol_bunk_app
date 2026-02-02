-- Add phone column to customers table
alter table customers add column if not exists phone text;

-- Add phone column to credit_transactions table (optional, but good for history if linking customer changes)
-- For now, we'll fetch it from customers table via join or just store it if needed.
-- Sticking to fetching from customers table for simplicity in this iteration.
