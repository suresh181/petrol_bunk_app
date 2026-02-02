-- Run this in your Supabase SQL Editor to add the Attendant column
alter table nozzles add column attendant_name text default 'Staff';

-- Helper to update existing ones
update nozzles set attendant_name = 'Raju' where attendant_name is null;
