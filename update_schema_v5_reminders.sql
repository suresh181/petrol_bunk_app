-- 1. Add 'do_not_remind' column to 'customers' table if it doesn't exist
alter table customers add column if not exists do_not_remind boolean default false;

-- 2. Create 'reminder_logs' table to track automated reminder history
create table if not exists reminder_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    customer_name text not null,
    phone text not null,
    amount numeric not null,
    channel text not null, -- 'SMS' or 'WhatsApp'
    status text not null, -- 'Success' or 'Failed'
    error_detail text
);

-- 3. Disable RLS for public access
alter table reminder_logs disable row level security;

-- 4. Add table to publication for realtime updates
alter publication supabase_realtime add table reminder_logs;
