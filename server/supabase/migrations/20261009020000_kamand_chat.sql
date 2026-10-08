-- KamandChat: IIT Mandi Intracampus updates
-- 1. Check user exists RPC in private schema with security invoker wrapper in public
create or replace function private.check_user_exists(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_display_name text;
  v_username text;
  v_normalized_email text := lower(trim(p_email));
  v_roll text;
begin
  v_roll := lower(split_part(v_normalized_email, '@', 1));
  -- Check in profiles first by username matching roll number
  select id, display_name, username into v_user_id, v_display_name, v_username
  from public.profiles where lower(username) = v_roll limit 1;

  if v_user_id is not null then
    return jsonb_build_object(
      'exists', true,
      'display_name', coalesce(v_display_name, ''),
      'username', coalesce(v_username, '')
    );
  end if;

  -- Fallback check in auth.users
  begin
    execute 'select id from auth.users where lower(email) = $1 limit 1'
    into v_user_id using v_normalized_email;
  exception when others then
    v_user_id := null;
  end;

  if v_user_id is not null then
    select display_name, username into v_display_name, v_username
    from public.profiles where id = v_user_id;
    return jsonb_build_object(
      'exists', true,
      'display_name', coalesce(v_display_name, ''),
      'username', coalesce(v_username, '')
    );
  else
    return jsonb_build_object('exists', false);
  end if;
end; $$;

create or replace function public.check_user_exists(p_email text) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.check_user_exists(p_email);
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.check_user_exists(text) to anon, authenticated;
grant execute on function public.check_user_exists(text) to anon, authenticated;

-- 2. Handle new user with enrollment number as username
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
  v_display_name text;
  v_email text;
begin
  -- First try explicit username in raw_user_meta_data
  v_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  
  -- If not provided, check if email is an IIT Mandi student email (e.g. b26419@students.iitmandi.ac.in)
  v_email := to_jsonb(new)->>'email';
  if (v_username = '' or v_username is null) and v_email is not null and v_email <> '' and v_email like '%@students.iitmandi.ac.in' then
    v_username := lower(split_part(v_email, '@', 1));
  end if;

  -- Ensure valid username pattern
  v_username := regexp_replace(coalesce(v_username, ''), '[^a-z0-9_]', '', 'g');
  
  -- If empty or not an enrollment username, preserve default user_<uuid_27>
  if length(v_username) < 3 then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 27);
  elsif length(v_username) > 32 then
    v_username := left(v_username, 32);
  end if;

  -- If username already exists for another user, fallback to user_<uuid_27>
  if exists (select 1 from public.profiles where username = v_username and id <> new.id) then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 27);
  end if;

  v_display_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Student'), 80);

  insert into public.profiles(id, username, display_name)
  values(new.id, v_username, v_display_name)
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name;

  return new;
end; $$;
