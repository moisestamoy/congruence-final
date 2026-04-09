-- Create the table to store user data
create table public.user_data (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  habits_data jsonb default '{}'::jsonb,
  finances_data jsonb default '{}'::jsonb,
  settings jsonb default '{}'::jsonb
);

-- Enable Row Level Security (RLS)
alter table public.user_data enable row level security;

-- Force RLS even for table owners (prevents privilege escalation)
alter table public.user_data force row level security;

-- Policies: each user can only access their own row
create policy "Users can view their own data" on public.user_data
  for select using (auth.uid() = id);

create policy "Users can insert their own data" on public.user_data
  for insert with check (auth.uid() = id);

create policy "Users can update their own data" on public.user_data
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own data" on public.user_data
  for delete using (auth.uid() = id);

-- Revoke direct table access from anon and authenticated roles
-- (all access must go through RLS policies)
revoke all on public.user_data from anon;
revoke all on public.user_data from authenticated;
grant select, insert, update, delete on public.user_data to authenticated;

-- Prevent public (unauthenticated) access entirely
revoke all on public.user_data from public;
