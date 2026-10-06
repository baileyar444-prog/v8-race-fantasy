-- Adds approximate online status for the leaderboard.
-- A user is shown as online when their profile heartbeat updated in the last 2 minutes.

alter table public.profiles
add column if not exists last_seen_at timestamptz;

-- Let logged-in users update their own last_seen_at heartbeat.
-- This is safe because it only allows a user to update their own profile row.
drop policy if exists "users can update own activity heartbeat" on public.profiles;
create policy "users can update own activity heartbeat"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create index if not exists profiles_last_seen_at_idx
on public.profiles(last_seen_at desc);
