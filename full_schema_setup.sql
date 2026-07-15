-- 1. Create Fuel Prices Table
create table if not exists fuel_prices (
  id uuid default gen_random_uuid() primary key,
  petrol numeric not null,
  diesel numeric not null,
  power numeric not null,
  petrol_profit numeric default 4.00,
  diesel_profit numeric default 2.60,
  petrol_stock numeric default 5000,
  diesel_stock numeric default 5000,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert default prices if not exists
insert into fuel_prices (petrol, diesel, power, petrol_profit, diesel_profit, petrol_stock, diesel_stock) 
values (102.50, 94.20, 108.00, 4.00, 2.60, 5000, 5000);

-- 2. Create Nozzles Table
create table if not exists nozzles (
  id text primary key, -- e.g. 'N1'
  product text not null, -- 'Petrol' or 'Diesel'
  reading numeric not null,
  tank text not null,
  active boolean default true,
  attendant_name text default 'Staff'
);

-- Insert default nozzles if empty
insert into nozzles (id, product, reading, tank, attendant_name) values 
('N1', 'Petrol', 1245005.5, 'T1', 'Raju'),
('N2', 'Petrol', 2245005.5, 'T1', 'Staff'),
('N3', 'Diesel', 8945005.5, 'T2', 'Staff'),
('N4', 'Diesel', 3445005.5, 'T2', 'Staff')
on conflict (id) do nothing;

-- 3. Create Customers Table
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  vehicle text,
  discount_percent numeric default 0,
  phone text
);

-- Insert default customers if empty
insert into customers (name, vehicle, discount_percent, phone) values 
('Siva Transports', 'TN-01-AB-1234', 2.0, '9876543210'),
('Reddy Earthmovers', 'All Fleet', 1.5, '9876543211'),
('Local School Bus', 'TN-02-XY-9999', 0.0, '9876543212')
on conflict do nothing;

-- 4. Create Sales Records Table
create table if not exists sales_records (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  shift_date date default CURRENT_DATE,
  shift_runner text,
  staff_on_duty text,
  petrol_sold numeric default 0,
  diesel_sold numeric default 0,
  total_amount numeric default 0,
  net_profit numeric default 0,
  shortage_excess numeric default 0,
  cash_collected numeric default 0,
  upi_collected numeric default 0,
  card_collected numeric default 0,
  petrol_test_samples numeric default 0,
  diesel_test_samples numeric default 0,
  petrol_test_taken numeric default 0,
  petrol_test_returned numeric default 0,
  diesel_test_taken numeric default 0,
  diesel_test_returned numeric default 0,
  today_settlement_amount numeric default 0
);

-- 5. Create Credit Transactions Table
create table if not exists credit_transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  customer_name text, -- Storing name directly for easier display if customer is deleted
  customer_id text,   -- Optional link to customer table
  amount numeric not null,
  is_settled boolean default false,
  settled_date timestamp with time zone,
  notes text
);

-- 6. Enable Realtime Publications
-- Run publication updates (Supabase publishes database updates in realtime)
-- Using safety block to avoid publication already exists errors
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table fuel_prices;
alter publication supabase_realtime add table nozzles;
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table sales_records;
alter publication supabase_realtime add table credit_transactions;

-- 7. Disable Row-Level Security (RLS) for Public/Anon Access
alter table fuel_prices disable row level security;
alter table nozzles disable row level security;
alter table customers disable row level security;
alter table sales_records disable row level security;
alter table credit_transactions disable row level security;

