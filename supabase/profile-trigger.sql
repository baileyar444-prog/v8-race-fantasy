-- Optional improvement: automatically create a profile row when a user signs up.
-- You can run this in Supabase SQL Editor if profiles are not being created reliably.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    garage_name,
    banner_colour,
    shield_base_colour,
    shield_pattern_colour,
    shield_pattern,
    shield_number
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'garage_name', 'New Garage'),
    '#ff7a1a',
    '#ff7a1a',
    '#111827',
    'chevron',
    88
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
