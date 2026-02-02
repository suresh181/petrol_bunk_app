-- Create Sales Records Table for Reports & History

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
  card_collected numeric default 0
);

-- Enable Realtime for Reports
alter publication supabase_realtime add table sales_records;
