-- Run in Supabase SQL Editor. Users may read/write only their own records.
create table if not exists public.skyflip_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  minecraft_uuid text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.skyflip_alert_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scan_seconds integer not null default 60,
  alert_seconds integer not null default 30,
  max_alerts integer not null default 1,
  page_limit integer not null default 20,
  updated_at timestamptz not null default now()
);
alter table public.skyflip_players enable row level security;
alter table public.skyflip_alert_settings enable row level security;
revoke all on public.skyflip_players from anon;
revoke all on public.skyflip_alert_settings from anon;
grant select, insert, update, delete on public.skyflip_players to authenticated;
grant select, insert, update, delete on public.skyflip_alert_settings to authenticated;
drop policy if exists skyflip_player_owner on public.skyflip_players;
create policy skyflip_player_owner on public.skyflip_players for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists skyflip_alert_owner on public.skyflip_alert_settings;
create policy skyflip_alert_owner on public.skyflip_alert_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
