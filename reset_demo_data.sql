-- Clear all transaction history
truncate table sales_records;
truncate table credit_transactions;

-- Optional: Reset Stock to default healthy levels
-- update fuel_prices set petrol_stock = 5000, diesel_stock = 5000;

-- Optional: Clear customers (uncomment if needed)
-- truncate table customers cascade;
