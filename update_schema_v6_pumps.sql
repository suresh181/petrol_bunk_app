-- 1. Create Pumps Master Table
create table if not exists pumps (
  id text primary key,
  name text not null,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert default pumps if empty
insert into pumps (id, name, active) values 
('P577', 'Pump 577', true),
('P570', 'Pump 570', true)
on conflict (id) do nothing;

-- 2. Add RLS & Realtime configuration
alter table pumps disable row level security;
alter publication supabase_realtime add table pumps;
