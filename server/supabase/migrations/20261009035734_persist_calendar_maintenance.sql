alter table private.campus_rooms add column category text;
alter table private.campus_rooms add column scope_name text;
alter table private.campus_rooms add column admin_identifiers text[] not null default '{}';

update private.campus_rooms r set category=x.category,scope_name=x.scope_name,admin_identifiers=x.admin_identifiers from jsonb_to_recordset($catalog$[{"slug":"kamandprompt","category":"clubs","scope_name":"KamandPrompt","admin_identifiers":["b22001","b23419","admin","sntc_secy"]},{"slug":"robotronics","category":"clubs","scope_name":"Robotronics","admin_identifiers":["b22015","admin","sntc_secy"]},{"slug":"yantrik","category":"clubs","scope_name":"Yantrik","admin_identifiers":["b22080","admin","sntc_secy"]},{"slug":"sae","category":"clubs","scope_name":"SAE Collegiate Club","admin_identifiers":["b22095","admin","sntc_secy"]},{"slug":"stac","category":"clubs","scope_name":"STAC","admin_identifiers":["b22110","admin","sntc_secy"]},{"slug":"scri","category":"clubs","scope_name":"SCRI","admin_identifiers":["b22120","admin","sntc_secy"]},{"slug":"music-club","category":"clubs","scope_name":"Music Club","admin_identifiers":["b23101","admin","sac_secy"]},{"slug":"dance-vibrance","category":"clubs","scope_name":"Dance Club","admin_identifiers":["b23112","admin","sac_secy"]},{"slug":"drama-artgeeks","category":"clubs","scope_name":"Drama Club","admin_identifiers":["b23125","admin","sac_secy"]},{"slug":"literary-society","category":"clubs","scope_name":"Literary Society","admin_identifiers":["b23130","admin","sac_secy"]},{"slug":"perception","category":"clubs","scope_name":"Perception","admin_identifiers":["b23145","admin","sac_secy"]},{"slug":"design-fine-arts","category":"clubs","scope_name":"Design & Fine Arts","admin_identifiers":["b23150","admin","sac_secy"]},{"slug":"football","category":"clubs","scope_name":"Football Club","admin_identifiers":[]},{"slug":"cricket","category":"clubs","scope_name":"Cricket Club","admin_identifiers":[]},{"slug":"basketball","category":"clubs","scope_name":"Basketball Club","admin_identifiers":[]},{"slug":"badminton","category":"clubs","scope_name":"Badminton Club","admin_identifiers":[]},{"slug":"table-tennis","category":"clubs","scope_name":"Table Tennis Club","admin_identifiers":[]},{"slug":"lawn-tennis","category":"clubs","scope_name":"Lawn Tennis Club","admin_identifiers":[]},{"slug":"volleyball","category":"clubs","scope_name":"Volleyball Club","admin_identifiers":[]},{"slug":"athletics","category":"clubs","scope_name":"Athletics & Fitness Club","admin_identifiers":[]},{"slug":"chess","category":"clubs","scope_name":"Chess Club","admin_identifiers":[]},{"slug":"mountain-biking","category":"clubs","scope_name":"Mountain Biking","admin_identifiers":[]},{"slug":"exodia","category":"clubs","scope_name":"Exodia","admin_identifiers":["b22050","admin","sac_secy"]},{"slug":"frosthack","category":"clubs","scope_name":"Frosthack","admin_identifiers":["b22001","b23419","admin","sntc_secy"]},{"slug":"rann-neeti","category":"clubs","scope_name":"Rann-Neeti","admin_identifiers":["b22070","admin","sports_secy"]},{"slug":"e-cell","category":"clubs","scope_name":"E-Cell","admin_identifiers":["b22085","admin"]},{"slug":"nss-ruvaab","category":"clubs","scope_name":"NSS & Ruvaab","admin_identifiers":["b22090","admin"]},{"slug":"ic110","category":"courses","scope_name":"IC110 - Electrical Science","admin_identifiers":["faculty_ic110","ta_ic110","admin"]},{"slug":"ic152","category":"courses","scope_name":"IC152 - Computing & Data Science","admin_identifiers":["faculty_ic152","ta_ic152","b23419","admin"]},{"slug":"ic252","category":"courses","scope_name":"IC252 - Probability & Statistics","admin_identifiers":[]},{"slug":"ic160","category":"courses","scope_name":"IC160 - Applied Mechanics","admin_identifiers":[]},{"slug":"ic221","category":"courses","scope_name":"IC221 - Physics of Materials","admin_identifiers":[]},{"slug":"cs302","category":"courses","scope_name":"CS302 - Database Systems","admin_identifiers":["faculty_cs302","ta_cs302","admin"]},{"slug":"ee201","category":"courses","scope_name":"EE201 - Signals & Systems","admin_identifiers":["faculty_ee201","ta_ee201","admin"]},{"slug":"me301","category":"courses","scope_name":"ME301 - Fluid Mechanics","admin_identifiers":[]},{"slug":"ce301","category":"courses","scope_name":"CE301 - Structural Analysis","admin_identifiers":[]},{"slug":"dp201-dp301","category":"courses","scope_name":"DP201/DP301 - ISTP & Design Practicum","admin_identifiers":[]},{"slug":"parashar-general","category":"hostels","scope_name":"Parashar","admin_identifiers":["warden_parashar","admin"]},{"slug":"p1-chat","category":"hostels","scope_name":"Parashar","admin_identifiers":[]},{"slug":"p2-chat","category":"hostels","scope_name":"Parashar","admin_identifiers":["warden_parashar","caretaker_p2","admin"]},{"slug":"p3-chat","category":"hostels","scope_name":"Parashar","admin_identifiers":[]},{"slug":"p4-chat","category":"hostels","scope_name":"Parashar","admin_identifiers":[]},{"slug":"nako-general","category":"hostels","scope_name":"Nako","admin_identifiers":[]},{"slug":"suvalsar-general","category":"hostels","scope_name":"Suvalsar","admin_identifiers":["warden_suvalsar","admin"]},{"slug":"b11-chat","category":"hostels","scope_name":"Suvalsar","admin_identifiers":[]},{"slug":"b12-chat","category":"hostels","scope_name":"Suvalsar","admin_identifiers":[]},{"slug":"b13-chat","category":"hostels","scope_name":"Suvalsar","admin_identifiers":[]},{"slug":"b14-chat","category":"hostels","scope_name":"Suvalsar","admin_identifiers":[]},{"slug":"suraj-taal-general","category":"hostels","scope_name":"Suraj Taal","admin_identifiers":["warden_surajtaal","admin"]},{"slug":"b15-chat","category":"hostels","scope_name":"Suraj Taal","admin_identifiers":[]},{"slug":"b16-chat","category":"hostels","scope_name":"Suraj Taal","admin_identifiers":[]},{"slug":"b17-chat","category":"hostels","scope_name":"Suraj Taal","admin_identifiers":[]},{"slug":"b18-chat","category":"hostels","scope_name":"Suraj Taal","admin_identifiers":["warden_surajtaal","caretaker_b18","admin"]},{"slug":"b19-chat","category":"hostels","scope_name":"Suraj Taal","admin_identifiers":[]},{"slug":"chandrataal-general","category":"hostels","scope_name":"Chandrataal","admin_identifiers":[]},{"slug":"b20-chat","category":"hostels","scope_name":"Chandrataal","admin_identifiers":[]},{"slug":"b21-chat","category":"hostels","scope_name":"Chandrataal","admin_identifiers":[]},{"slug":"b22-chat","category":"hostels","scope_name":"Chandrataal","admin_identifiers":[]},{"slug":"b23-chat","category":"hostels","scope_name":"Chandrataal","admin_identifiers":[]},{"slug":"b24-chat","category":"hostels","scope_name":"Chandrataal","admin_identifiers":[]},{"slug":"manimahesh-general","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"b1-chat","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"b2-chat","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"b3-chat","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"b4-chat","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"b5-chat","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"b6-chat","category":"hostels","scope_name":"Manimahesh","admin_identifiers":[]},{"slug":"renuka-general","category":"hostels","scope_name":"Renuka","admin_identifiers":[]},{"slug":"g1-chat","category":"hostels","scope_name":"Renuka","admin_identifiers":[]},{"slug":"g2-chat","category":"hostels","scope_name":"Renuka","admin_identifiers":[]},{"slug":"g3-dashir","category":"hostels","scope_name":"Renuka","admin_identifiers":[]},{"slug":"beas-kund-chat","category":"hostels","scope_name":"Beas Kund","admin_identifiers":[]},{"slug":"gauri-kund-chat","category":"hostels","scope_name":"Gauri Kund","admin_identifiers":[]},{"slug":"btech-cse","category":"branches","scope_name":"B.Tech - Computer Science & Engineering","admin_identifiers":[]},{"slug":"btech-dsai","category":"branches","scope_name":"B.Tech - Data Science & Artificial Intelligence","admin_identifiers":[]},{"slug":"btech-ee","category":"branches","scope_name":"B.Tech - Electrical Engineering","admin_identifiers":[]},{"slug":"btech-me","category":"branches","scope_name":"B.Tech - Mechanical Engineering","admin_identifiers":[]},{"slug":"btech-ce","category":"branches","scope_name":"B.Tech - Civil Engineering","admin_identifiers":[]},{"slug":"btech-vlsi","category":"branches","scope_name":"B.Tech - Microelectronics & VLSI Engineering","admin_identifiers":[]},{"slug":"btech-mse","category":"branches","scope_name":"B.Tech - Materials Science & Engineering","admin_identifiers":[]},{"slug":"btech-mnc","category":"branches","scope_name":"B.Tech - Mathematics & Computing","admin_identifiers":[]},{"slug":"btech-ep","category":"branches","scope_name":"B.Tech - Engineering Physics","admin_identifiers":[]},{"slug":"btech-bioeng","category":"branches","scope_name":"B.Tech - Bioengineering","admin_identifiers":[]},{"slug":"btech-ge","category":"branches","scope_name":"B.Tech - General Engineering","admin_identifiers":[]},{"slug":"btech-chemanalytics","category":"branches","scope_name":"B.Tech - Chemical Engg with Data Analytics","admin_identifiers":[]},{"slug":"btech-quantum","category":"branches","scope_name":"B.Tech - Quantum Science & Engineering","admin_identifiers":[]},{"slug":"btech-agrianalytics","category":"branches","scope_name":"B.Tech - Agricultural Engg with Data Analytics","admin_identifiers":[]},{"slug":"bs-chemical","category":"branches","scope_name":"BS in Chemical Sciences","admin_identifiers":[]},{"slug":"dual-bioeng","category":"branches","scope_name":"Integrated Dual Degree - Bioengineering","admin_identifiers":[]},{"slug":"imba","category":"branches","scope_name":"Integrated MBA","admin_identifiers":[]},{"slug":"mtech-general","category":"branches","scope_name":"M.Tech Postgraduate Cohort","admin_identifiers":[]},{"slug":"msc-general","category":"branches","scope_name":"M.Sc Postgraduate Cohort","admin_identifiers":[]},{"slug":"mgmt-humanities","category":"branches","scope_name":"Management & Humanities","admin_identifiers":[]},{"slug":"research-scholars","category":"branches","scope_name":"Research Scholars","admin_identifiers":[]},{"slug":"pine-mess","category":"messes","scope_name":"Pine Mess","admin_identifiers":["warden_mess_north","caretaker_pine","admin"]},{"slug":"oak-mess","category":"messes","scope_name":"Oak Mess","admin_identifiers":["warden_mess_north","caretaker_oak","admin"]},{"slug":"alder-mess","category":"messes","scope_name":"Alder Mess","admin_identifiers":[]},{"slug":"cedar-mess","category":"messes","scope_name":"Cedar Mess","admin_identifiers":[]},{"slug":"maple-mess","category":"messes","scope_name":"Maple Mess","admin_identifiers":["warden_mess_south","caretaker_maple","admin"]}]$catalog$::jsonb) as x(slug text,category text,scope_name text,admin_identifiers text[]) where r.slug=x.slug;

-- Authorization is checked against the current account, never caller-supplied JWT metadata.
create function private.campus_can_manage(p_slug text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=private.active_user(); v_email text; v_confirmed timestamptz; v_roll text; v_admins text[];
begin
  if v_user is null then return false; end if;
  if private.is_room_manager(p_slug,v_user) then return true; end if;
  select email,email_confirmed_at into v_email,v_confirmed from auth.users where id=v_user;
  if v_confirmed is null or v_email !~* '^[^@]+@(students\.iitmandi\.ac\.in|iitmandi\.ac\.in)$' then return false; end if;
  v_roll:=lower(split_part(v_email,'@',1));
  select admin_identifiers into v_admins from private.campus_rooms where slug=p_slug;
  return coalesce(v_roll=any(v_admins),false) or v_roll=any(array['admin','gymkhana','sntc_secy','sac_secy','sports_secy','warden','caretaker']);
end; $$;

create function private.campus_scope_manager(p_slug text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_room private.campus_rooms;
begin
  if private.active_user() is null then return false; end if;
  select * into v_room from private.campus_rooms where slug=p_slug;
  return exists(select 1 from private.campus_rooms r where r.category=v_room.category and r.scope_name=v_room.scope_name and private.campus_can_manage(r.slug));
end; $$;

create function private.campus_scope_access(p_slug text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=private.active_user(); v_room private.campus_rooms; v_profile public.profiles;
begin
  if v_user is null then return false; end if;
  select * into v_room from private.campus_rooms where slug=p_slug;
  if not found or v_room.category not in ('hostels','messes') then return false; end if;
  if private.campus_scope_manager(p_slug) then return true; end if;
  select * into v_profile from public.profiles where id=v_user;
  if not v_profile.chat_only and lower(case when v_room.category='hostels' then v_profile.hostel else v_profile.mess end)=lower(v_room.scope_name) then return true; end if;
  return exists(select 1 from private.campus_rooms r join public.conversation_members m on m.conversation_id=r.conversation_id
    where r.category=v_room.category and r.scope_name=v_room.scope_name and m.user_id=v_user and m.left_at is null);
end; $$;

create table public.campus_events (
  id uuid primary key default gen_random_uuid(), room_slug text not null references private.campus_rooms(slug),
  title text not null check(length(trim(title)) between 3 and 120), description text not null default '' check(length(description)<=10000),
  category text not null check(category in ('Club Workshop','Fest Event','Sports Tournament','Placement & Tech Talk','General')),
  organizer text not null, venue text not null check(venue in ('Auditorium A1/A2','A13 Hall','South Campus Grounds','SCEE Seminar Hall','Sports Complex','Other')),
  event_date date not null, start_minute integer not null check(start_minute between 0 and 1439), end_minute integer not null check(end_minute between 1 and 1440),
  status text not null default 'approved' check(status in ('pending','approved','conflict','completed','cancelled')),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(end_minute>start_minute)
);
create index campus_events_date_idx on public.campus_events(event_date,start_minute,id);
create index campus_events_venue_date_idx on public.campus_events(venue,event_date) where status='approved';
create index campus_events_room_idx on public.campus_events(room_slug);
create index campus_events_creator_idx on public.campus_events(created_by);

create table public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(), room_slug text not null references private.campus_rooms(slug),
  title text not null check(length(trim(title)) between 5 and 160), description text not null default '' check(length(description)<=10000),
  scope text not null check(scope in ('hostel','mess')), category text not null check(length(category) between 2 and 80),
  campus text not null check(campus in ('North','South')), cluster_or_mess text not null,
  specific_location text not null check(length(trim(specific_location)) between 2 and 160),
  status text not null default 'Reported' check(status in ('Reported','Under Investigation','Resolved by Warden/Caretaker')),
  upvotes integer not null default 0 check(upvotes>=0), created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz,
  check((status='Resolved by Warden/Caretaker')=(resolved_at is not null))
);
create index maintenance_tickets_priority_idx on public.maintenance_tickets(upvotes desc,created_at desc,id);
create index maintenance_tickets_room_status_idx on public.maintenance_tickets(room_slug,status);
create index maintenance_tickets_creator_idx on public.maintenance_tickets(created_by);
create table public.maintenance_ticket_votes (
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(ticket_id,user_id)
);
create index maintenance_votes_user_idx on public.maintenance_ticket_votes(user_id);
create table public.maintenance_ticket_history (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  status text not null, changed_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create index maintenance_history_ticket_idx on public.maintenance_ticket_history(ticket_id,created_at desc);
create index maintenance_history_actor_idx on public.maintenance_ticket_history(changed_by);

alter table public.campus_events enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.maintenance_ticket_votes enable row level security;
alter table public.maintenance_ticket_history enable row level security;
revoke all on public.campus_events,public.maintenance_tickets,public.maintenance_ticket_votes,public.maintenance_ticket_history from public,anon,authenticated;
grant select on public.campus_events to anon,authenticated;
grant select on public.maintenance_tickets,public.maintenance_ticket_votes,public.maintenance_ticket_history to authenticated;
grant all on public.campus_events,public.maintenance_tickets,public.maintenance_ticket_votes,public.maintenance_ticket_history to service_role;
create policy calendar_read on public.campus_events for select to anon,authenticated using(true);
create policy tickets_read on public.maintenance_tickets for select to authenticated using(private.campus_scope_access(room_slug) or created_by=(select private.active_user()));
create policy votes_read on public.maintenance_ticket_votes for select to authenticated using(user_id=(select private.active_user()) and exists(select 1 from public.maintenance_tickets t where t.id=ticket_id));
create policy history_read on public.maintenance_ticket_history for select to authenticated using(exists(select 1 from public.maintenance_tickets t where t.id=ticket_id));

create function private.calendar_payload(p_row public.campus_events) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',p_row.id,'roomSlug',p_row.room_slug,'title',p_row.title,'description',p_row.description,'category',p_row.category,
    'organizer',p_row.organizer,'venue',p_row.venue,'date',p_row.event_date,'startTime',lpad((p_row.start_minute/60)::text,2,'0')||':'||lpad((p_row.start_minute%60)::text,2,'0'),
    'endTime',lpad((p_row.end_minute/60)::text,2,'0')||':'||lpad((p_row.end_minute%60)::text,2,'0'),'status',p_row.status,
    'createdBy',p_row.created_by,'createdAt',p_row.created_at,'updatedAt',p_row.updated_at,'canManage',private.campus_can_manage(p_row.room_slug));
$$;
create function private.maintenance_payload(p_row public.maintenance_tickets) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',p_row.id,'roomSlug',p_row.room_slug,'title',p_row.title,'description',p_row.description,'scope',p_row.scope,'category',p_row.category,
    'campus',p_row.campus,'clusterOrMess',p_row.cluster_or_mess,'specificLocation',p_row.specific_location,'status',p_row.status,'upvotes',p_row.upvotes,
    'upvotedBy',case when exists(select 1 from public.maintenance_ticket_votes v where v.ticket_id=p_row.id and v.user_id=private.active_user()) then jsonb_build_array(private.active_user()) else '[]'::jsonb end,
    'createdBy',p_row.created_by,'creatorName',coalesce((select display_name from public.profiles where id=p_row.created_by),'Student'),
    'createdAt',p_row.created_at,'updatedAt',p_row.updated_at,'resolvedAt',p_row.resolved_at,'canManage',private.campus_scope_manager(p_row.room_slug),
    'history',coalesce((select jsonb_agg(jsonb_build_object('status',h.status,'createdAt',h.created_at) order by h.created_at) from public.maintenance_ticket_history h where h.ticket_id=p_row.id),'[]'::jsonb));
$$;

create function private.save_calendar_event(p_input jsonb,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=private.actor(); v_slug text:=p_input->>'roomSlug'; v_row public.campus_events; v_old public.campus_events;
  v_date date:=(p_input->>'date')::date; v_start integer:=(p_input->>'startMinute')::integer; v_end integer:=(p_input->>'endMinute')::integer; v_conflict boolean;
begin
  if not private.campus_can_manage(v_slug) then raise exception 'Assigned organizer privileges required' using errcode='42501'; end if;
  if p_id is not null then
    select * into v_old from public.campus_events where id=p_id for update;
    if not found then raise exception 'Event not found' using errcode='P0002'; end if;
    if not private.campus_can_manage(v_old.room_slug) then raise exception 'Assigned organizer privileges required' using errcode='42501'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('campus-venue:'||(p_input->>'venue')||':'||v_date::text,0));
  select exists(select 1 from public.campus_events e where e.id is distinct from p_id and e.event_date=v_date and e.venue=p_input->>'venue'
    and e.status='approved' and e.start_minute<v_end and v_start<e.end_minute) into v_conflict;
  if p_id is null then
    insert into public.campus_events(room_slug,title,description,category,organizer,venue,event_date,start_minute,end_minute,status,created_by)
    values(v_slug,trim(p_input->>'title'),coalesce(p_input->>'description',''),p_input->>'category',
      (select trim(leading '#' from title) from private.campus_rooms where slug=v_slug),p_input->>'venue',v_date,v_start,v_end,case when v_conflict then 'conflict' else 'approved' end,v_actor) returning * into v_row;
  else
    update public.campus_events set room_slug=v_slug,title=trim(p_input->>'title'),description=coalesce(p_input->>'description',''),category=p_input->>'category',
      organizer=(select trim(leading '#' from title) from private.campus_rooms where slug=v_slug),venue=p_input->>'venue',event_date=v_date,start_minute=v_start,end_minute=v_end,
      status=case when v_old.status in ('approved','conflict') then case when v_conflict then 'conflict' else 'approved' end else v_old.status end,updated_at=now() where id=p_id returning * into v_row;
  end if;
  return private.calendar_payload(v_row);
end; $$;

create function private.calendar_status(p_id uuid,p_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=private.actor(); v_row public.campus_events;
begin
  if p_status is null or p_status not in ('pending','approved','conflict','completed','cancelled') then raise exception 'Invalid event status' using errcode='22023'; end if;
  select * into v_row from public.campus_events where id=p_id for update;
  if not found then raise exception 'Event not found' using errcode='P0002'; end if;
  if not private.campus_can_manage(v_row.room_slug) then raise exception 'Assigned organizer privileges required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('campus-venue:'||v_row.venue||':'||v_row.event_date::text,0));
  if p_status='approved' and exists(select 1 from public.campus_events e where e.id<>p_id and e.event_date=v_row.event_date and e.venue=v_row.venue
    and e.status='approved' and e.start_minute<v_row.end_minute and v_row.start_minute<e.end_minute) then p_status:='conflict'; end if;
  update public.campus_events set status=p_status,updated_at=now() where id=p_id returning * into v_row;
  return private.calendar_payload(v_row);
end; $$;

create function private.create_maintenance_ticket(p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=private.actor(); v_row public.maintenance_tickets; v_room private.campus_rooms;
begin
  select * into v_room from private.campus_rooms where slug=p_input->>'roomSlug';
  if not found or v_room.category not in ('hostels','messes') then raise exception 'Unknown maintenance scope' using errcode='22023'; end if;
  if not private.campus_scope_access(v_room.slug) then raise exception 'Report issues only for your assigned residence or room' using errcode='42501'; end if;
  insert into public.maintenance_tickets(room_slug,title,description,scope,category,campus,cluster_or_mess,specific_location,created_by,upvotes)
    values(v_room.slug,trim(p_input->>'title'),coalesce(p_input->>'description',''),case when v_room.category='hostels' then 'hostel' else 'mess' end,
      p_input->>'category',p_input->>'campus',v_room.scope_name,trim(p_input->>'specificLocation'),v_actor,1) returning * into v_row;
  insert into public.maintenance_ticket_votes(ticket_id,user_id) values(v_row.id,v_actor);
  insert into public.maintenance_ticket_history(ticket_id,status,changed_by) values(v_row.id,v_row.status,v_actor);
  return private.maintenance_payload(v_row);
end; $$;

create function private.maintenance_vote(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=private.actor(); v_row public.maintenance_tickets; v_added boolean;
begin
  select * into v_row from public.maintenance_tickets where id=p_id for update;
  if not found then raise exception 'Ticket not found' using errcode='P0002'; end if;
  if not private.campus_scope_access(v_row.room_slug) and v_row.created_by<>v_actor then raise exception 'Scope access required' using errcode='42501'; end if;
  delete from public.maintenance_ticket_votes where ticket_id=p_id and user_id=v_actor;
  v_added:=not found;
  if v_added then insert into public.maintenance_ticket_votes(ticket_id,user_id) values(p_id,v_actor); end if;
  update public.maintenance_tickets set upvotes=(select count(*) from public.maintenance_ticket_votes where ticket_id=p_id),updated_at=now() where id=p_id returning * into v_row;
  return jsonb_build_object('ticket',private.maintenance_payload(v_row),'hasUpvoted',v_added);
end; $$;

create function private.maintenance_status(p_id uuid,p_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=private.actor(); v_row public.maintenance_tickets;
begin
  if p_status is null or p_status not in ('Reported','Under Investigation','Resolved by Warden/Caretaker') then raise exception 'Invalid ticket status' using errcode='22023'; end if;
  select * into v_row from public.maintenance_tickets where id=p_id for update;
  if not found then raise exception 'Ticket not found' using errcode='P0002'; end if;
  if not private.campus_scope_manager(v_row.room_slug) then raise exception 'Assigned caretaker or mess manager required' using errcode='42501'; end if;
  if v_row.status<>p_status then
    update public.maintenance_tickets set status=p_status,updated_at=now(),resolved_at=case when p_status='Resolved by Warden/Caretaker' then now() else null end where id=p_id returning * into v_row;
    insert into public.maintenance_ticket_history(ticket_id,status,changed_by) values(p_id,p_status,v_actor);
  end if;
  return private.maintenance_payload(v_row);
end; $$;

create function public.save_campus_event(p_input jsonb,p_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.save_calendar_event(p_input,p_id);$$;
create function public.set_campus_event_status(p_id uuid,p_status text) returns jsonb language sql security invoker set search_path='' as $$select private.calendar_status(p_id,p_status);$$;
create function public.create_maintenance_ticket(p_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.create_maintenance_ticket(p_input);$$;
create function public.toggle_maintenance_vote(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.maintenance_vote(p_id);$$;
create function public.set_maintenance_ticket_status(p_id uuid,p_status text) returns jsonb language sql security invoker set search_path='' as $$select private.maintenance_status(p_id,p_status);$$;
create function public.list_campus_events(p_venue text default null,p_category text default null) returns jsonb
language sql stable security invoker set search_path='' as $$select coalesce(jsonb_agg(private.calendar_payload(e) order by e.event_date,e.start_minute,e.id),'[]'::jsonb) from public.campus_events e where (p_venue is null or e.venue=p_venue) and (p_category is null or e.category=p_category);$$;
create function public.list_maintenance_tickets(p_scope text default null,p_campus text default null,p_status text default null,p_cluster text default null) returns jsonb
language sql stable security invoker set search_path='' as $$select coalesce(jsonb_agg(private.maintenance_payload(t) order by t.upvotes desc,t.created_at desc,t.id),'[]'::jsonb) from public.maintenance_tickets t where (p_scope is null or t.scope=p_scope) and (p_campus is null or t.campus=p_campus) and (p_status is null or t.status=p_status) and (p_cluster is null or lower(t.cluster_or_mess)=lower(p_cluster));$$;
create function public.campus_management_permissions(p_slug text) returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('canManage',private.campus_can_manage(p_slug),'canResolve',private.campus_scope_manager(p_slug),'canAccess',private.campus_scope_access(p_slug));$$;

-- Only the public, invoker wrappers are exposed through the Data API.
revoke all on function private.campus_can_manage(text),private.campus_scope_manager(text),private.campus_scope_access(text),private.calendar_payload(public.campus_events),private.maintenance_payload(public.maintenance_tickets),private.save_calendar_event(jsonb,uuid),private.calendar_status(uuid,text),private.create_maintenance_ticket(jsonb),private.maintenance_vote(uuid),private.maintenance_status(uuid,text) from public,anon,authenticated;
revoke all on function public.save_campus_event(jsonb,uuid),public.set_campus_event_status(uuid,text),public.create_maintenance_ticket(jsonb),public.toggle_maintenance_vote(uuid),public.set_maintenance_ticket_status(uuid,text),public.list_campus_events(text,text),public.list_maintenance_tickets(text,text,text,text),public.campus_management_permissions(text) from public,anon,authenticated;
grant execute on function private.campus_can_manage(text),private.campus_scope_manager(text),private.campus_scope_access(text),private.calendar_payload(public.campus_events),private.maintenance_payload(public.maintenance_tickets),private.save_calendar_event(jsonb,uuid),private.calendar_status(uuid,text),private.create_maintenance_ticket(jsonb),private.maintenance_vote(uuid),private.maintenance_status(uuid,text) to authenticated;
grant execute on function public.save_campus_event(jsonb,uuid),public.set_campus_event_status(uuid,text),public.create_maintenance_ticket(jsonb),public.toggle_maintenance_vote(uuid),public.set_maintenance_ticket_status(uuid,text),public.list_campus_events(text,text),public.list_maintenance_tickets(text,text,text,text),public.campus_management_permissions(text) to authenticated;
grant execute on function private.campus_can_manage(text),private.calendar_payload(public.campus_events),public.list_campus_events(text,text) to anon;
