-- Create Credit Transactions Table
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

-- Enable Realtime
alter publication supabase_realtime add table credit_transactions;
