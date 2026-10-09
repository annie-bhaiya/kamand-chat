-- Migration: Add hostel, mess, and chat_only to profiles table
alter table public.profiles
  add column if not exists hostel text,
  add column if not exists mess text,
  add column if not exists chat_only boolean not null default false;

grant update(username, display_name, avatar_key, hostel, mess, chat_only) on public.profiles to authenticated;
