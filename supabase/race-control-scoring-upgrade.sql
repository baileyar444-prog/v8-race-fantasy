-- V8 Race Fantasy upgrade: banner colour + admin Race Control scoring support.
-- Run this once in Supabase SQL Editor before using this version.

alter table public.profiles
add column if not exists banner_colour text not null default '#ff7a1a';

-- Keep Race Control database permissions admin-only.
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

-- Ensure the Race Control tables have admin policies via the existing helper.
-- These are usually already present from the original schema. This is here for safety.

drop policy if exists "creators can manage events" on public.events;
create policy "creators can manage events" on public.events
for all using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage drivers" on public.drivers;
create policy "creators can manage drivers" on public.drivers
for all using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage event races" on public.event_races;
create policy "creators can manage event races" on public.event_races
for all using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage race results" on public.race_results;
create policy "creators can manage race results" on public.race_results
for all using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage scores" on public.fantasy_scores;
create policy "creators can manage scores" on public.fantasy_scores
for all using (public.is_creator()) with check (public.is_creator());

drop policy if exists "creators can manage sponsors" on public.sponsors;
create policy "creators can manage sponsors" on public.sponsors
for all using (public.is_creator()) with check (public.is_creator());

-- Make yourself admin by replacing the email:
-- update public.profiles
-- set role = 'admin'
-- where email = 'bailey.a.r444@gmail.com';

-- Quick check:
select email, display_name, garage_name, role, banner_colour
from public.profiles
order by created_at desc;
