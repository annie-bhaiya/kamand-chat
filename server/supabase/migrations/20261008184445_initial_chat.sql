-- Application schema. Run as the project database owner, once, via the migration runner.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null check (length(display_name) between 1 and 80),
  avatar_key text check (length(avatar_key) <= 512),
  created_at timestamptz not null default now()
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct','group')),
  title text check (length(title) between 1 and 120),
  created_by uuid not null references public.profiles(id),
  last_seq bigint not null default 0 check (last_seq between 0 and 9007199254740991),
  last_message_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((type = 'direct' and title is null) or (type = 'group' and title is not null))
);
create table public.direct_conversations (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  user_low_id uuid not null references public.profiles(id),
  user_high_id uuid not null references public.profiles(id),
  unique (user_low_id,user_high_id),
  check (user_low_id < user_high_id)
);
create index direct_high_user_idx on public.direct_conversations(user_high_id);
create index conversations_creator_idx on public.conversations(created_by);
create index conversations_activity_idx on public.conversations(last_activity_at desc,id desc);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_seq bigint not null default 0 check (last_read_seq between 0 and 9007199254740991),
  primary key (conversation_id,user_id)
);
create index membership_user_idx on public.conversation_members(user_id,conversation_id);
create index membership_active_idx on public.conversation_members(user_id,conversation_id) where left_at is null;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  seq bigint not null check (seq between 1 and 9007199254740991),
  sender_id uuid not null references public.profiles(id),
  client_message_id uuid not null,
  body text not null default '' check (length(body) <= 10000),
  kind text not null default 'text' check (kind in ('text','attachment')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  search_vector tsvector generated always as (to_tsvector('simple'::regconfig,body)) stored,
  unique (conversation_id,seq),
  unique (sender_id,client_message_id)
);
create index message_search_idx on public.messages using gin(search_vector) where deleted_at is null;
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id),
  object_key text not null unique,
  original_name text not null check (length(original_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  scan_status text not null default 'unscanned' check (scan_status in ('unscanned','clean','rejected')),
  created_at timestamptz not null default now(),
  check (object_key = conversation_id::text || '/' || uploader_id::text || '/' || id::text)
);
create index attachments_message_idx on public.attachments(message_id);
create index attachments_conversation_idx on public.attachments(conversation_id);
create index attachments_uploader_idx on public.attachments(uploader_id);
create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  emoji text not null check (length(emoji) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id,user_id,emoji)
);
create index reactions_user_idx on public.message_reactions(user_id);

-- These privileged helpers live outside the exposed Data API schema. Identity is
-- always derived from the verified JWT, never from a caller-supplied user ID.
create function private.active_user() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u join auth.sessions s on s.user_id = u.id
  where u.id = (select auth.uid())
    and s.id = nullif(auth.jwt()->>'session_id','')::uuid
    and (s.not_after is null or s.not_after > now()) limit 1;
$$;
create function private.actor() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := private.active_user();
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return v_user;
end; $$;
create function private.is_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation
    and user_id = (select private.active_user()) and left_at is null);
$$;
create function private.lock_conversation(p_conversation uuid) returns public.conversations
language plpgsql security definer set search_path = '' as $$
declare v_row public.conversations;
begin
  perform private.actor();
  select * into v_row from public.conversations where id = p_conversation for update;
  if not found then raise exception 'Conversation not found' using errcode = 'P0002'; end if;
  if not private.is_member(p_conversation) then raise exception 'Membership required' using errcode = '42501'; end if;
  return v_row;
end; $$;
create function private.message_payload(p_message uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (to_jsonb(m) - 'search_vector') || jsonb_build_object('attachments',
    coalesce((select jsonb_agg(to_jsonb(a)) from public.attachments a where a.message_id=m.id and m.deleted_at is null),'[]'::jsonb))
  from public.messages m where m.id=p_message and private.is_member(m.conversation_id);
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,username,display_name)
  values(new.id,'user_' || left(replace(new.id::text,'-',''),27),
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'New user'),80));
  return new;
end; $$;
create trigger on_chat_user_created after insert on auth.users for each row execute function private.handle_new_user();

create function private.create_direct(p_other_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := private.actor(); v_low uuid; v_high uuid; v_id uuid; v_row public.conversations;
begin
  if p_other_user is null or p_other_user=v_user then raise exception 'Choose another user' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles where id=p_other_user) then raise exception 'User not found' using errcode='P0002'; end if;
  v_low:=least(v_user,p_other_user); v_high:=greatest(v_user,p_other_user);
  perform pg_advisory_xact_lock(hashtextextended(v_low::text || v_high::text,0));
  select conversation_id into v_id from public.direct_conversations where user_low_id=v_low and user_high_id=v_high;
  if v_id is null then
    insert into public.conversations(type,created_by) values('direct',v_user) returning id into v_id;
    insert into public.direct_conversations values(v_id,v_low,v_high);
    insert into public.conversation_members(conversation_id,user_id) values(v_id,v_low),(v_id,v_high);
  end if;
  select * into v_row from public.conversations where id=v_id;
  return to_jsonb(v_row);
end; $$;

create function private.create_group(p_title text,p_members uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=private.actor(); v_members uuid[]; v_row public.conversations;
begin
  if p_title is null or length(trim(p_title)) not between 1 and 120 then raise exception 'Invalid title' using errcode='22023'; end if;
  select array_agg(distinct member) into v_members from unnest(array_append(coalesce(p_members,'{}'::uuid[]),v_user)) member;
  if cardinality(v_members) not between 2 and 100 or array_position(v_members,null) is not null then raise exception 'Groups require 2 to 100 members' using errcode='22023'; end if;
  if (select count(*) from public.profiles where id=any(v_members)) <> cardinality(v_members) then raise exception 'User not found' using errcode='P0002'; end if;
  insert into public.conversations(type,title,created_by) values('group',trim(p_title),v_user) returning * into v_row;
  insert into public.conversation_members(conversation_id,user_id,role)
    select v_row.id,member,case when member=v_user then 'owner' else 'member' end from unnest(v_members) member;
  return to_jsonb(v_row);
end; $$;

create function private.rename_group(p_conversation uuid,p_title text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row public.conversations:=private.lock_conversation(p_conversation);
begin
  if v_row.type<>'group' or v_row.created_by<>private.actor() then raise exception 'Group owner required' using errcode='42501'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 120 then raise exception 'Invalid title' using errcode='22023'; end if;
  update public.conversations set title=trim(p_title) where id=p_conversation returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create function private.change_member(p_conversation uuid,p_user uuid,p_remove boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row public.conversations:=private.lock_conversation(p_conversation); v_user uuid:=private.actor(); v_member public.conversation_members;
begin
  if p_user is null or p_remove is null then raise exception 'Invalid membership action' using errcode='22023'; end if;
  if v_row.type<>'group' or (v_row.created_by<>v_user and not (p_remove and p_user=v_user)) then raise exception 'Group owner required' using errcode='42501'; end if;
  if p_user=v_row.created_by then raise exception 'The owner must remain a member' using errcode='22023'; end if;
  if p_remove then
    update public.conversation_members set left_at=coalesce(left_at,now()) where conversation_id=p_conversation and user_id=p_user returning * into v_member;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  else
    if not exists(select 1 from public.profiles where id=p_user) then raise exception 'User not found' using errcode='P0002'; end if;
    if not exists(select 1 from public.conversation_members where conversation_id=p_conversation and user_id=p_user and left_at is null)
      and (select count(*) from public.conversation_members where conversation_id=p_conversation and left_at is null)>=100
      then raise exception 'Group is full' using errcode='22023'; end if;
    insert into public.conversation_members(conversation_id,user_id) values(p_conversation,p_user)
    on conflict(conversation_id,user_id) do update set left_at=null,joined_at=now() returning * into v_member;
  end if;
  return to_jsonb(v_member);
end; $$;

create function private.send_message(p_conversation uuid,p_client_id uuid,p_body text,p_attachments uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=private.actor(); v_conv public.conversations; v_message public.messages; v_count integer;
begin
  -- A sender's retry IDs are unique across conversations; serialize conflicting retries too.
  if p_client_id is null then raise exception 'Client message ID required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || p_client_id::text,1));
  v_conv:=private.lock_conversation(p_conversation);
  select * into v_message from public.messages where sender_id=v_user and client_message_id=p_client_id;
  if found then
    if v_message.conversation_id<>p_conversation then raise exception 'Retry ID already used in another conversation' using errcode='22023'; end if;
    return private.message_payload(v_message.id);
  end if;
  p_body:=coalesce(trim(p_body),''); p_attachments:=coalesce(p_attachments,'{}'::uuid[]);
  if length(p_body)>10000 or cardinality(p_attachments)>10 or (length(p_body)=0 and cardinality(p_attachments)=0)
    then raise exception 'Invalid message' using errcode='22023'; end if;
  -- Lock draft rows before linking them, so a concurrent draft deletion cannot remove a sent file.
  perform 1 from public.attachments where id=any(p_attachments) order by id for update;
  select count(*) into v_count from public.attachments where id=any(p_attachments) and message_id is null and conversation_id=p_conversation and uploader_id=v_user;
  if v_count<>cardinality(p_attachments) then raise exception 'Invalid attachments' using errcode='22023'; end if;
  update public.conversations set last_seq=last_seq+1,last_message_at=now(),last_activity_at=now() where id=p_conversation returning * into v_conv;
  insert into public.messages(conversation_id,seq,sender_id,client_message_id,body,kind)
    values(p_conversation,v_conv.last_seq,v_user,p_client_id,p_body,case when cardinality(p_attachments)>0 then 'attachment' else 'text' end) returning * into v_message;
  update public.attachments set message_id=v_message.id where id=any(p_attachments);
  return private.message_payload(v_message.id);
end; $$;

create function private.edit_message(p_message uuid,p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=private.actor(); v_conv uuid; v_row public.messages;
begin
  select conversation_id into v_conv from public.messages where id=p_message;
  if not found then raise exception 'Message not found' using errcode='P0002'; end if;
  perform private.lock_conversation(v_conv);
  select * into v_row from public.messages where id=p_message for update;
  if v_row.sender_id<>v_user then raise exception 'Only the sender can edit a message' using errcode='42501'; end if;
  if v_row.deleted_at is not null then raise exception 'Message was deleted' using errcode='22023'; end if;
  if p_body is null or length(trim(p_body)) not between 1 and 10000 then raise exception 'Invalid message body' using errcode='22023'; end if;
  update public.messages set body=trim(p_body),edited_at=now() where id=p_message;
  return private.message_payload(p_message);
end; $$;

create function private.delete_message(p_message uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=private.actor(); v_conv uuid; v_row public.messages;
begin
  select conversation_id into v_conv from public.messages where id=p_message;
  if not found then raise exception 'Message not found' using errcode='P0002'; end if;
  perform private.lock_conversation(v_conv);
  select * into v_row from public.messages where id=p_message for update;
  if v_row.sender_id<>v_user then raise exception 'Only the sender can delete a message' using errcode='42501'; end if;
  update public.messages set body='',deleted_at=coalesce(deleted_at,now()) where id=p_message;
  delete from public.message_reactions where message_id=p_message;
  return private.message_payload(p_message);
end; $$;

create function private.mark_read(p_conversation uuid,p_seq bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=private.actor(); v_conv public.conversations:=private.lock_conversation(p_conversation); v_row public.conversation_members;
begin
  if p_seq is null or p_seq<0 or p_seq>v_conv.last_seq then raise exception 'Invalid read position' using errcode='22023'; end if;
  update public.conversation_members set last_read_seq=greatest(last_read_seq,p_seq) where conversation_id=p_conversation and user_id=v_user returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create function private.react(p_message uuid,p_emoji text,p_remove boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=private.actor(); v_conv uuid;
begin
  select conversation_id into v_conv from public.messages where id=p_message;
  if not found then raise exception 'Message not found' using errcode='P0002'; end if;
  perform private.lock_conversation(v_conv);
  if exists(select 1 from public.messages where id=p_message and deleted_at is not null) then raise exception 'Message was deleted' using errcode='22023'; end if;
  if p_emoji is null or length(trim(p_emoji)) not between 1 and 32 then raise exception 'Invalid reaction' using errcode='22023'; end if;
  if p_remove then delete from public.message_reactions where message_id=p_message and user_id=v_user and emoji=p_emoji;
  else insert into public.message_reactions(message_id,user_id,emoji) values(p_message,v_user,trim(p_emoji)) on conflict do nothing;
  end if;
  return jsonb_build_object('conversation_id',v_conv,'message_id',p_message);
end; $$;

-- Thin SECURITY INVOKER wrappers expose only the intended authenticated operations.
create function public.session_is_active() returns boolean language sql stable security invoker set search_path='' as $$ select private.active_user() is not null; $$;
create function public.chat_health() returns text language sql stable security invoker set search_path='' as $$ select case when pg_catalog.to_regclass('public.messages') is not null then 'ok' else 'unavailable' end; $$;
create function public.create_direct_conversation(p_other_user uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.create_direct(p_other_user); $$;
create function public.create_group_conversation(p_title text,p_members uuid[]) returns jsonb language sql security invoker set search_path='' as $$ select private.create_group(p_title,p_members); $$;
create function public.rename_group(p_conversation uuid,p_title text) returns jsonb language sql security invoker set search_path='' as $$ select private.rename_group(p_conversation,p_title); $$;
create function public.change_group_member(p_conversation uuid,p_user uuid,p_remove boolean) returns jsonb language sql security invoker set search_path='' as $$ select private.change_member(p_conversation,p_user,p_remove); $$;
create function public.send_message(p_conversation uuid,p_client_id uuid,p_body text,p_attachments uuid[] default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.send_message(p_conversation,p_client_id,p_body,p_attachments); $$;
create function public.edit_message(p_message uuid,p_body text) returns jsonb language sql security invoker set search_path='' as $$ select private.edit_message(p_message,p_body); $$;
create function public.delete_message(p_message uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.delete_message(p_message); $$;
create function public.mark_conversation_read(p_conversation uuid,p_seq bigint) returns jsonb language sql security invoker set search_path='' as $$ select private.mark_read(p_conversation,p_seq); $$;
create function public.react_to_message(p_message uuid,p_emoji text,p_remove boolean default false) returns jsonb language sql security invoker set search_path='' as $$ select private.react(p_message,p_emoji,p_remove); $$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.message_reactions enable row level security;

create policy profiles_read on public.profiles for select to authenticated using ((select private.active_user()) is not null);
create policy profiles_update on public.profiles for update to authenticated using (id=(select private.active_user())) with check (id=(select private.active_user()));
create policy conversations_read on public.conversations for select to authenticated using (private.is_member(id));
create policy direct_read on public.direct_conversations for select to authenticated using (private.is_member(conversation_id));
create policy members_read on public.conversation_members for select to authenticated using (private.is_member(conversation_id));
create policy messages_read on public.messages for select to authenticated using (private.is_member(conversation_id));
create policy attachments_read on public.attachments for select to authenticated using (
  private.is_member(conversation_id) and ((message_id is null and uploader_id=(select private.active_user()))
    or exists(select 1 from public.messages where id=message_id and deleted_at is null)));
create policy attachments_insert on public.attachments for insert to authenticated with check (
  uploader_id=(select private.active_user()) and private.is_member(conversation_id) and message_id is null and scan_status='unscanned');
create policy attachments_delete on public.attachments for delete to authenticated using (
  uploader_id=(select private.active_user()) and private.is_member(conversation_id) and message_id is null);
create policy reactions_read on public.message_reactions for select to authenticated using (
  exists(select 1 from public.messages where id=message_id and deleted_at is null));

-- Explicit grants accommodate Supabase's new default of not exposing SQL-created tables.
revoke all on public.profiles,public.conversations,public.direct_conversations,public.conversation_members,public.messages,public.attachments,public.message_reactions from public,anon,authenticated;
grant select on public.profiles,public.conversations,public.direct_conversations,public.conversation_members,public.messages,public.attachments,public.message_reactions to authenticated;
grant update(username,display_name,avatar_key) on public.profiles to authenticated;
grant insert(id,conversation_id,uploader_id,object_key,original_name,mime_type,size_bytes),delete on public.attachments to authenticated;
-- Privileged maintenance and disposable integration-test cleanup only; never used by request handlers.
grant all on public.profiles,public.conversations,public.direct_conversations,public.conversation_members,public.messages,public.attachments,public.message_reactions to service_role;

-- Revoke default PUBLIC execution on every function introduced by this migration.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where (n.nspname='private' and p.proname in ('active_user','actor','is_member','lock_conversation','message_payload','handle_new_user','create_direct','create_group','rename_group','change_member','send_message','edit_message','delete_message','mark_read','react'))
      or (n.nspname='public' and p.proname in ('session_is_active','chat_health','create_direct_conversation','create_group_conversation','rename_group','change_group_member','send_message','edit_message','delete_message','mark_conversation_read','react_to_message'))
  loop execute format('revoke all on function %s from public, anon, authenticated', f.signature); end loop;
end; $$;
grant execute on function private.active_user(),private.actor(),private.is_member(uuid),private.lock_conversation(uuid),private.message_payload(uuid),
  private.create_direct(uuid),private.create_group(text,uuid[]),private.rename_group(uuid,text),private.change_member(uuid,uuid,boolean),
  private.send_message(uuid,uuid,text,uuid[]),private.edit_message(uuid,text),private.delete_message(uuid),private.mark_read(uuid,bigint),private.react(uuid,text,boolean) to authenticated;
grant execute on function public.session_is_active(),public.create_direct_conversation(uuid),public.create_group_conversation(text,uuid[]),public.rename_group(uuid,text),public.change_group_member(uuid,uuid,boolean),public.send_message(uuid,uuid,text,uuid[]),public.edit_message(uuid,text),public.delete_message(uuid),public.mark_conversation_read(uuid,bigint),public.react_to_message(uuid,text,boolean) to authenticated;
grant execute on function public.chat_health() to anon,authenticated;

-- Private object storage; filenames are metadata, never used as storage paths.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(
  'chat-attachments','chat-attachments',false,10485760,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','audio/mpeg','audio/ogg','audio/webm','video/webm','video/mp4'])
on conflict(id) do nothing;

create function private.can_upload_object(p_key text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_parts text[]:=string_to_array(p_key,'/'); v_user uuid:=private.active_user();
begin
  if v_user is null or cardinality(v_parts)<>3 or v_parts[2]<>v_user::text then return false; end if;
  return private.is_member(v_parts[1]::uuid) and v_parts[3]::uuid is not null;
exception when invalid_text_representation then return false;
end; $$;
create function private.can_read_object(p_key text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.attachments a where a.object_key=p_key and private.is_member(a.conversation_id)
    and ((a.message_id is null and a.uploader_id=(select private.active_user()))
      or exists(select 1 from public.messages m where m.id=a.message_id and m.deleted_at is null)));
$$;
create function private.can_delete_object(p_key text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.can_upload_object(p_key) and not exists(select 1 from public.attachments a where a.object_key=p_key and a.message_id is not null);
$$;
revoke all on function private.can_upload_object(text),private.can_read_object(text),private.can_delete_object(text) from public,anon,authenticated;
grant execute on function private.can_upload_object(text),private.can_read_object(text),private.can_delete_object(text) to authenticated;
create policy chat_object_insert on storage.objects for insert to authenticated with check (bucket_id='chat-attachments' and private.can_upload_object(name));
create policy chat_object_select on storage.objects for select to authenticated using (bucket_id='chat-attachments' and (private.can_read_object(name) or private.can_delete_object(name)));
create policy chat_object_delete on storage.objects for delete to authenticated using (bucket_id='chat-attachments' and private.can_delete_object(name));

notify pgrst,'reload schema';
