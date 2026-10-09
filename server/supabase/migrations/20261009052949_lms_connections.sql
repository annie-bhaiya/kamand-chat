create table public.lms_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  moodle_user_id bigint not null check (moodle_user_id > 0),
  account_name text not null check (length(account_name) <= 200),
  encrypted_token text not null check (length(encrypted_token) between 40 and 1024),
  connected_at timestamptz not null default now()
);
alter table public.lms_connections enable row level security;
revoke all on public.lms_connections from public, anon, authenticated;
grant select, insert, update, delete on public.lms_connections to authenticated;
create policy lms_connection_owner on public.lms_connections for all to authenticated
using ((select auth.uid()) = user_id and (select public.session_is_active()))
with check ((select auth.uid()) = user_id and (select public.session_is_active()));
comment on column public.lms_connections.encrypted_token is 'AES-256-GCM ciphertext; key is held only by the application server, with user_id as associated data.';
