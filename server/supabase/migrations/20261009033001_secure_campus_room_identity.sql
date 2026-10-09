-- Campus rooms have their own identity. Never discover them by a user-editable title.
-- Existing conversations are preserved; verified legacy rooms may be mapped by an administrator.
create table private.campus_rooms (
  slug text primary key,
  title text not null,
  conversation_id uuid unique references public.conversations(id) on delete set null
);
alter table private.campus_rooms enable row level security;
revoke all on private.campus_rooms from public, anon, authenticated;
insert into private.campus_rooms(slug, title) values
  ('kamandprompt', '#KamandPrompt'),
  ('robotronics', '#Robotronics'),
  ('yantrik', '#Yantrik'),
  ('sae', '#SAE Collegiate Club'),
  ('stac', '#STAC (Space Technology & Astronomy)'),
  ('scri', '#SCRI'),
  ('music-club', '#Music Club'),
  ('dance-vibrance', '#Dance Club (Vibrance)'),
  ('drama-artgeeks', '#Drama Club (ArtGeeks / Thespians)'),
  ('literary-society', '#Literary Society'),
  ('perception', '#Perception'),
  ('design-fine-arts', '#Design & Fine Arts'),
  ('football', '#Football Club'),
  ('cricket', '#Cricket Club'),
  ('basketball', '#Basketball Club'),
  ('badminton', '#Badminton Club'),
  ('table-tennis', '#Table Tennis Club'),
  ('lawn-tennis', '#Lawn Tennis Club'),
  ('volleyball', '#Volleyball Club'),
  ('athletics', '#Athletics & Fitness Club'),
  ('chess', '#Chess Club'),
  ('mountain-biking', '#Mountain Biking (MTB) Club'),
  ('exodia', '#Exodia'),
  ('frosthack', '#Frosthack'),
  ('rann-neeti', '#Rann-Neeti'),
  ('e-cell', '#E-Cell (Entrepreneurship Cell)'),
  ('nss-ruvaab', '#NSS & Ruvaab'),
  ('ic110', '#IC110 - Electrical Science'),
  ('ic152', '#IC152 - Computing & Data Science'),
  ('ic252', '#IC252 - Probability & Statistics'),
  ('ic160', '#IC160 - Applied Mechanics'),
  ('ic221', '#IC221 - Physics of Materials'),
  ('cs302', '#CS302 - Database Systems'),
  ('ee201', '#EE201 - Signals & Systems'),
  ('me301', '#ME301 - Fluid Mechanics'),
  ('ce301', '#CE301 - Structural Analysis'),
  ('dp201-dp301', '#DP201/DP301 - ISTP & Design Practicum'),
  ('parashar-general', '#Parashar Hostel - General'),
  ('p1-chat', '#Parashar Block P1'),
  ('p2-chat', '#Parashar Block P2'),
  ('p3-chat', '#Parashar Block P3'),
  ('p4-chat', '#Parashar Block P4'),
  ('nako-general', '#Nako Hostel - General'),
  ('suvalsar-general', '#Suvalsar Cluster - General'),
  ('b11-chat', '#Suvalsar Block B11'),
  ('b12-chat', '#Suvalsar Block B12'),
  ('b13-chat', '#Suvalsar Block B13'),
  ('b14-chat', '#Suvalsar Block B14'),
  ('suraj-taal-general', '#Suraj Taal Cluster - General'),
  ('b15-chat', '#Suraj Taal Block B15'),
  ('b16-chat', '#Suraj Taal Block B16'),
  ('b17-chat', '#Suraj Taal Block B17'),
  ('b18-chat', '#Suraj Taal Block B18'),
  ('b19-chat', '#Suraj Taal Block B19'),
  ('chandrataal-general', '#Prashar / Chandrataal - General'),
  ('b20-chat', '#Chandrataal Block B20'),
  ('b21-chat', '#Chandrataal Block B21'),
  ('b22-chat', '#Chandrataal Block B22'),
  ('b23-chat', '#Chandrataal Block B23'),
  ('b24-chat', '#Chandrataal Block B24'),
  ('manimahesh-general', '#Manimahesh Cluster - General'),
  ('b1-chat', '#Manimahesh Block B1'),
  ('b2-chat', '#Manimahesh Block B2'),
  ('b3-chat', '#Manimahesh Block B3'),
  ('b4-chat', '#Manimahesh Block B4'),
  ('b5-chat', '#Manimahesh Block B5'),
  ('b6-chat', '#Manimahesh Block B6'),
  ('renuka-general', '#Renuka Girls Hostel - General'),
  ('g1-chat', '#Renuka Block G1'),
  ('g2-chat', '#Renuka Block G2'),
  ('g3-dashir', '#Renuka Block G3 (Dashir)'),
  ('beas-kund-chat', '#Beas Kund Hostel'),
  ('gauri-kund-chat', '#Gauri Kund Hostel'),
  ('btech-cse', '#B.Tech - Computer Science & Engineering'),
  ('btech-dsai', '#B.Tech - Data Science & Artificial Intelligence'),
  ('btech-ee', '#B.Tech - Electrical Engineering'),
  ('btech-me', '#B.Tech - Mechanical Engineering'),
  ('btech-ce', '#B.Tech - Civil Engineering'),
  ('btech-vlsi', '#B.Tech - Microelectronics & VLSI Engineering'),
  ('btech-mse', '#B.Tech - Materials Science & Engineering'),
  ('btech-mnc', '#B.Tech - Mathematics & Computing'),
  ('btech-ep', '#B.Tech - Engineering Physics'),
  ('btech-bioeng', '#B.Tech - Bioengineering'),
  ('btech-ge', '#B.Tech - General Engineering'),
  ('btech-chemanalytics', '#B.Tech - Chemical Engg with Data Analytics'),
  ('btech-quantum', '#B.Tech - Quantum Science & Engineering'),
  ('btech-agrianalytics', '#B.Tech - Agricultural Engg with Data Analytics'),
  ('bs-chemical', '#BS in Chemical Sciences'),
  ('dual-bioeng', '#Integrated Dual Degree - Bioengineering'),
  ('imba', '#Integrated MBA (IMBA)'),
  ('mtech-general', '#M.Tech Postgraduate Cohort'),
  ('msc-general', '#M.Sc Postgraduate Cohort'),
  ('mgmt-humanities', '#Management & Humanities (MBA / MA)'),
  ('research-scholars', '#Research Scholars (M.S. & Ph.D.)'),
  ('pine-mess', '#Pine Mess (North Dining 1)'),
  ('oak-mess', '#Oak Mess (North Dining 2)'),
  ('alder-mess', '#Alder Mess'),
  ('cedar-mess', '#Cedar Mess'),
  ('maple-mess', '#Maple Mess (South Dining)');

create or replace function private.join_or_create_campus_room(p_room_slug text, p_room_title text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.actor();
  v_room private.campus_rooms;
  v_row public.conversations;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Lock a canonical catalogue entry to serialize first joins.
  select * into v_room from private.campus_rooms where slug = p_room_slug for update;
  if not found or p_room_title is distinct from v_room.title then
    raise exception 'Unknown campus room' using errcode = '22023';
  end if;
  if v_room.conversation_id is null then
    insert into public.conversations(type,title,created_by)
    values ('group',v_room.title,v_user) returning * into v_row;
    update private.campus_rooms set conversation_id=v_row.id where slug=v_room.slug;
    insert into public.conversation_members(conversation_id,user_id,role)
    values(v_row.id,v_user,'owner');
  else
    select * into v_row from public.conversations where id=v_room.conversation_id;
    insert into public.conversation_members(conversation_id,user_id,role,left_at)
    values(v_row.id,v_user,'member',null)
    on conflict(conversation_id,user_id) do update set left_at=null;
  end if;
  return to_jsonb(v_row);
end;
$$;
revoke all on function private.join_or_create_campus_room(text,text) from public, anon;
revoke all on function public.join_or_create_campus_room(text,text) from public, anon;
grant execute on function private.join_or_create_campus_room(text,text) to authenticated;
grant execute on function public.join_or_create_campus_room(text,text) to authenticated;
