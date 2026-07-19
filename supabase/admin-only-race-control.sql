-- Run this in Supabase SQL Editor.
-- It makes Race Control database permissions admin-only.
-- Existing RLS policies call public.is_creator(), so this changes that helper to return TRUE only for role = 'admin'.

create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Replace the email below with your own account email to make yourself admin.
-- Do not make this an option in the public app.
-- update public.profiles
-- set role = 'admin'
-- where email = 'your-email@example.com';

-- Check current roles:
select email, display_name, garage_name, role
from public.profiles
order by created_at desc;
