-- 1. Create Fuel Prices Table
create table fuel_prices (
  id uuid default gen_random_uuid() primary key,
  petrol numeric not null,
  diesel numeric not null,
  power numeric not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert default prices
insert into fuel_prices (petrol, diesel, power) values (102.50, 94.20, 108.00);

-- 2. Create Nozzles Table
create table nozzles (
  id text primary key, -- e.g. 'N1'
  product text not null, -- 'Petrol' or 'Diesel'
  reading numeric not null,
  tank text not null,
  active boolean default true
);

-- Insert default nozzles
insert into nozzles (id, product, reading, tank) values 
('N1', 'Petrol', 1245005.5, 'T1'),
('N2', 'Petrol', 2245005.5, 'T1'),
('N3', 'Diesel', 8945005.5, 'T2'),
('N4', 'Diesel', 3445005.5, 'T2');

-- 3. Create Customers Table
create table customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  vehicle text,
  discount_percent numeric default 0
);

-- Insert default customers
insert into customers (name, vehicle, discount_percent) values 
('Siva Transports', 'TN-01-AB-1234', 2.0),
('Reddy Earthmovers', 'All Fleet', 1.5),
('Local School Bus', 'TN-02-XY-9999', 0.0);

-- 4. Enable Realtime
alter publication supabase_realtime add table fuel_prices;
alter publication supabase_realtime add table nozzles;
alter publication supabase_realtime add table customers;
