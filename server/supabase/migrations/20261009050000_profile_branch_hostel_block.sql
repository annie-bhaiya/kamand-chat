-- Migration to add branch and hostel_block to public.profiles

alter table public.profiles
  add column if not exists branch text,
  add column if not exists hostel_block text;

grant select (branch, hostel_block), update (branch, hostel_block) on public.profiles to authenticated;
