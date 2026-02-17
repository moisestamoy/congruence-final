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

-- Create policies allowed users to only access their own data
create policy "Users can view their own data" on public.user_data
  for select using (auth.uid() = id);

create policy "Users can insert their own data" on public.user_data
  for insert with check (auth.uid() = id);

create policy "Users can update their own data" on public.user_data
  for update using (auth.uid() = id);
