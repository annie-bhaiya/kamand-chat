-- Public storage bucket for profile avatars
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict(id) do update set public = true;

create or replace function private.can_upload_avatar(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=private.active_user();
begin
  if v_user is null then return false; end if;
  return p_name like (v_user::text || '/%');
end; $$;

revoke all on function private.can_upload_avatar(text) from public,anon,authenticated;
grant execute on function private.can_upload_avatar(text) to authenticated;

drop policy if exists avatar_object_select on storage.objects;
create policy avatar_object_select on storage.objects for select to public using (bucket_id = 'avatars');

drop policy if exists avatar_object_insert on storage.objects;
create policy avatar_object_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and private.can_upload_avatar(name));

drop policy if exists avatar_object_update on storage.objects;
create policy avatar_object_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and private.can_upload_avatar(name));

drop policy if exists avatar_object_delete on storage.objects;
create policy avatar_object_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and private.can_upload_avatar(name));

notify pgrst,'reload schema';
