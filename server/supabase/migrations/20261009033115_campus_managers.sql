-- Trusted room assignments are maintained only by the administrator/seed script.
alter table public.conversations add column campus_room_slug text unique;
update public.conversations c set campus_room_slug=r.slug from private.campus_rooms r where r.conversation_id=c.id;

create function private.is_room_manager(p_slug text, p_user uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.actor();
  return exists(select 1 from auth.users u where u.id=p_user
    and coalesce(u.raw_app_meta_data->'campus_rooms','[]'::jsonb) ? p_slug);
end; $$;

create or replace function private.join_or_create_campus_room(p_room_slug text,p_room_title text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=private.actor(); v_room private.campus_rooms; v_row public.conversations;
begin
  select * into v_room from private.campus_rooms where slug=p_room_slug for update;
  if not found or p_room_title is distinct from v_room.title then raise exception 'Unknown campus room' using errcode='22023'; end if;
  if v_room.conversation_id is null then
    insert into public.conversations(type,title,created_by,campus_room_slug) values('group',v_room.title,v_user,v_room.slug) returning * into v_row;
    update private.campus_rooms set conversation_id=v_row.id where slug=v_room.slug;
  else
    select * into v_row from public.conversations where id=v_room.conversation_id;
  end if;
  insert into public.conversation_members(conversation_id,user_id,role,left_at)
    values(v_row.id,v_user,case when private.is_room_manager(v_room.slug,v_user) then 'owner' else 'member' end,null)
    on conflict(conversation_id,user_id) do update set left_at=null, role=excluded.role;
  return to_jsonb(v_row);
end; $$;

-- Revoke accidental first-join ownership. Ordinary groups keep their ownership model.
update public.conversation_members m set role='member' from public.conversations c
where m.conversation_id=c.id and c.campus_room_slug is not null;

create or replace function private.rename_group(p_conversation uuid,p_title text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_row public.conversations:=private.lock_conversation(p_conversation);
begin
  if v_row.type<>'group' or (case when v_row.campus_room_slug is not null
      then not private.is_room_manager(v_row.campus_room_slug,private.actor())
      else v_row.created_by<>private.actor() end) then raise exception 'Group owner required' using errcode='42501'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 120 then raise exception 'Invalid title' using errcode='22023'; end if;
  update public.conversations set title=trim(p_title) where id=p_conversation returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create or replace function private.change_member(p_conversation uuid,p_user uuid,p_remove boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_row public.conversations:=private.lock_conversation(p_conversation); v_user uuid:=private.actor(); v_member public.conversation_members; v_manager boolean;
begin
  if p_user is null or p_remove is null then raise exception 'Invalid membership action' using errcode='22023'; end if;
  v_manager:=case when v_row.campus_room_slug is not null then private.is_room_manager(v_row.campus_room_slug,v_user) else v_row.created_by=v_user end;
  if v_row.type<>'group' or (not v_manager and not (p_remove and p_user=v_user)) then raise exception 'Group owner required' using errcode='42501'; end if;
  if (v_row.campus_room_slug is null and p_user=v_row.created_by) or
     (v_row.campus_room_slug is not null and private.is_room_manager(v_row.campus_room_slug,p_user))
    then raise exception 'The owner must remain a member' using errcode='22023'; end if;
  if p_remove then
    update public.conversation_members set left_at=coalesce(left_at,now()) where conversation_id=p_conversation and user_id=p_user returning * into v_member;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  else
    if not exists(select 1 from public.profiles where id=p_user) then raise exception 'User not found' using errcode='P0002'; end if;
    if v_row.campus_room_slug is null and not exists(select 1 from public.conversation_members where conversation_id=p_conversation and user_id=p_user and left_at is null)
      and (select count(*) from public.conversation_members where conversation_id=p_conversation and left_at is null)>=100 then raise exception 'Group is full' using errcode='22023'; end if;
    insert into public.conversation_members(conversation_id,user_id) values(p_conversation,p_user)
      on conflict(conversation_id,user_id) do update set left_at=null,joined_at=now() returning * into v_member;
  end if;
  return to_jsonb(v_member);
end; $$;

create table public.mess_menus (
  room_slug text primary key,
  menu jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint known_mess check (room_slug in ('pine-mess','oak-mess','alder-mess','cedar-mess','maple-mess'))
);
alter table public.mess_menus enable row level security;
revoke all on public.mess_menus from public,anon,authenticated;
grant select on public.mess_menus to anon,authenticated;
grant insert,update on public.mess_menus to authenticated;
grant all on public.mess_menus to service_role;
create policy menu_read on public.mess_menus for select to anon,authenticated using(true);
create policy menu_create on public.mess_menus for insert to authenticated with check(private.is_room_manager(room_slug,(select auth.uid())) and updated_by=(select auth.uid()));
create policy menu_update on public.mess_menus for update to authenticated using(private.is_room_manager(room_slug,(select auth.uid()))) with check(private.is_room_manager(room_slug,(select auth.uid())) and updated_by=(select auth.uid()));
revoke all on function private.is_room_manager(text,uuid) from public,anon;
grant execute on function private.is_room_manager(text,uuid) to authenticated;
