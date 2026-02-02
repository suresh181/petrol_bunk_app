-- SQL Update for Profit & Stock Management

DO $$
BEGIN
    -- Add Profit Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_prices' AND column_name = 'petrol_profit') THEN
        ALTER TABLE fuel_prices ADD COLUMN petrol_profit numeric DEFAULT 4.00;
        ALTER TABLE fuel_prices ADD COLUMN diesel_profit numeric DEFAULT 2.60;
    END IF;

    -- Add Stock Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_prices' AND column_name = 'petrol_stock') THEN
        ALTER TABLE fuel_prices ADD COLUMN petrol_stock numeric DEFAULT 0;
        ALTER TABLE fuel_prices ADD COLUMN diesel_stock numeric DEFAULT 0;
    END IF;
END $$;
