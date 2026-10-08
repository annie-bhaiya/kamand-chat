-- KamandChat: Campus Room Provisioning RPC
-- Creates or joins a campus scoped group conversation securely using SECURITY DEFINER in private schema
-- with a thin SECURITY INVOKER wrapper in public schema.

create or replace function private.join_or_create_campus_room(p_room_slug text, p_room_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := private.actor();
  v_conv_id uuid;
  v_row public.conversations;
  v_title text := trim(p_room_title);
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_title is null or length(v_title) < 1 then
    raise exception 'Room title cannot be empty' using errcode = '22023';
  end if;

  -- 1. Check if a group conversation already exists with this title
  select id into v_conv_id
  from public.conversations
  where type = 'group' and title = v_title
  limit 1;

  if v_conv_id is null then
    -- Create new campus group conversation
    insert into public.conversations (type, title, created_by)
    values ('group', v_title, v_user)
    returning * into v_row;

    v_conv_id := v_row.id;

    -- Add creator as owner
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conv_id, v_user, 'owner');
  else
    -- Add user as member if not already joined, or un-leave if previously left
    insert into public.conversation_members (conversation_id, user_id, role, left_at)
    values (v_conv_id, v_user, 'member', null)
    on conflict (conversation_id, user_id)
    do update set left_at = null;

    select * into v_row
    from public.conversations
    where id = v_conv_id;
  end if;

  return to_jsonb(v_row);
end;
$$;

-- Thin SECURITY INVOKER wrapper in public schema
create or replace function public.join_or_create_campus_room(p_room_slug text, p_room_title text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.join_or_create_campus_room(p_room_slug, p_room_title);
$$;

grant usage on schema private to authenticated;
grant execute on function private.join_or_create_campus_room(text, text) to authenticated;
grant execute on function public.join_or_create_campus_room(text, text) to authenticated;
