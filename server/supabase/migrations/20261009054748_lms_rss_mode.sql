alter table public.lms_connections
  add column mode text not null default 'api' check (mode in ('api', 'rss')),
  add column rss_sources jsonb not null default '[]'::jsonb check (jsonb_typeof(rss_sources) = 'array' and jsonb_array_length(rss_sources) <= 20);
alter table public.lms_connections alter column moodle_user_id drop not null;
alter table public.lms_connections add constraint lms_connection_mode_identity
  check ((mode = 'api' and moodle_user_id is not null) or (mode = 'rss' and moodle_user_id is null));
comment on column public.lms_connections.rss_sources is 'Token-free RSS activity identifiers and display metadata. The RSS key is held in encrypted_token.';
