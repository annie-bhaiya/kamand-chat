-- One recurring menu per mess and ISO weekday (Monday=1, Sunday=7).
-- Keep mess_menus as an untouched import snapshot for recovery.
create table public.mess_menu_days (
  room_slug text not null check (room_slug in ('pine-mess','oak-mess','alder-mess','cedar-mess','maple-mess')),
  weekday smallint not null check (weekday between 1 and 7),
  breakfast text not null check (length(trim(breakfast)) between 1 and 2000),
  lunch text not null check (length(trim(lunch)) between 1 and 2000),
  dinner text not null check (length(trim(dinner)) between 1 and 2000),
  special_notice text not null default '' check (length(special_notice) <= 2000),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (room_slug, weekday)
);
alter table public.mess_menu_days enable row level security;
revoke all on public.mess_menu_days from public, anon, authenticated;
grant select on public.mess_menu_days to anon, authenticated;
grant insert, update on public.mess_menu_days to authenticated;
grant all on public.mess_menu_days to service_role;
create policy menu_day_read on public.mess_menu_days for select to anon, authenticated using (true);
create policy menu_day_create on public.mess_menu_days for insert to authenticated
  with check (private.is_room_manager(room_slug, (select auth.uid())) and updated_by = (select auth.uid()));
create policy menu_day_update on public.mess_menu_days for update to authenticated
  using (private.is_room_manager(room_slug, (select auth.uid())))
  with check (private.is_room_manager(room_slug, (select auth.uid())) and updated_by = (select auth.uid()));

-- Extract each named day and append only the shared daily items.
with day_names as (
  select day_name, weekday::smallint from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])
    with ordinality as d(day_name, weekday)
), extracted as (
  select m.room_slug, d.weekday, m.updated_by, m.updated_at, m.menu->>'specialNotice' as special_notice,
    (select substring(line from length(d.day_name)+3) from regexp_split_to_table(m.menu->>'breakfast', E'\n') line where line like d.day_name || ': %') as breakfast,
    (select substring(line from length(d.day_name)+3) from regexp_split_to_table(m.menu->>'lunch', E'\n') line where line like d.day_name || ': %') as lunch,
    (select substring(line from length(d.day_name)+3) from regexp_split_to_table(m.menu->>'dinner', E'\n') line where line like d.day_name || ': %') as dinner,
    substring(m.menu->>'breakfast' from 'Daily: (.*)') as daily_breakfast,
    substring(m.menu->>'lunch' from 'Daily: (.*)') as daily_lunch,
    substring(m.menu->>'dinner' from 'Daily: (.*)') as daily_dinner
  from public.mess_menus m cross join day_names d
)
insert into public.mess_menu_days(room_slug, weekday, breakfast, lunch, dinner, special_notice, updated_by, updated_at)
select room_slug, weekday,
  breakfast || coalesce(E'\nAlso included: ' || daily_breakfast, ''),
  lunch || coalesce(E'\nAlso included: ' || daily_lunch, ''),
  dinner || coalesce(E'\nAlso included: ' || daily_dinner, ''),
  coalesce(special_notice, ''), updated_by, updated_at
from extracted where breakfast is not null and lunch is not null and dinner is not null;
comment on table public.mess_menus is 'Legacy menu import snapshot. Active recurring menus are stored in mess_menu_days.';
