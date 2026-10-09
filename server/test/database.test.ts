import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const alice = randomUUID(), bob = randomUUID(), eve = randomUUID();
const sessions = new Map<string, string>([alice, bob, eve].map(id => [id, randomUUID()]));
let direct: string, group: string, message: string;
async function asUser<T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) {
  return db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: user, session_id: sessions.get(user), role: 'authenticated' })]);
    return (await tx.query<T>(sql, params)).rows;
  });
}
async function rpc(user: string, sql: string, params: unknown[] = []) {
  return (await asUser<{ data: any }>(user, sql, params))[0]!.data;
}
before(async () => {
  // Real PostgreSQL engine; only platform-owned schemas are fixtures. All application SQL is unmodified.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid(),auth.jwt() to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
  `);
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(x => x.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, directory), 'utf8'));
  for (const [id, session] of sessions) {
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [id, JSON.stringify({ display_name: id === alice ? 'Alice' : id === bob ? 'Bob' : 'Eve' })]);
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [session, id]);
  }
});
after(async () => { await db.close(); });

test('migration enables RLS on every application table and exposes no public SECURITY DEFINER functions', async () => {
  const tables = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='public' and c.relkind='r'");
  assert.equal(tables.rows.length, 12);
  assert.ok(tables.rows.every(x => x.relrowsecurity));
  const functions = await db.query("select p.proname from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.prosecdef");
  assert.equal(functions.rows.length, 0);
});
test('signup trigger creates a profile with a safe unique username', async () => {
  const rows = await asUser(alice, 'select * from public.profiles where id=$1', [alice]);
  assert.equal(rows[0]!.display_name, 'Alice');
  assert.match(rows[0]!.username as string, /^user_[a-f0-9]{27}$/);
});
test('anonymous users cannot read messages or execute mutations', async () => {
  await assert.rejects(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.exec('select * from public.messages'); }), /permission denied/);
  await assert.rejects(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select public.create_direct_conversation($1)', [bob]); }), /permission denied/);
});
test('direct chat creation is atomic and idempotent from either participant', async () => {
  const first = await rpc(alice, 'select public.create_direct_conversation($1) as data', [bob]);
  direct = first.id;
  const second = await rpc(bob, 'select public.create_direct_conversation($1) as data', [alice]);
  assert.equal(second.id, direct);
  const members = await asUser(alice, 'select * from public.conversation_members where conversation_id=$1', [direct]);
  assert.equal(members.length, 2);
});
test('self-chat is rejected', async () => {
  await assert.rejects(rpc(alice, 'select public.create_direct_conversation($1) as data', [alice]), /Choose another user/);
});
test('non-member cannot read a private conversation or its memberships', async () => {
  assert.equal((await asUser(eve, 'select * from public.conversations where id=$1', [direct])).length, 0);
  assert.equal((await asUser(eve, 'select * from public.conversation_members where conversation_id=$1', [direct])).length, 0);
});
test('message sequence allocation and retry deduplication are transactional', async () => {
  const retry = randomUUID();
  const first = await rpc(alice, 'select public.send_message($1,$2,$3) as data', [direct, retry, 'Hello Bob']);
  message = first.id;
  const duplicate = await rpc(alice, 'select public.send_message($1,$2,$3) as data', [direct, retry, 'Retry']);
  assert.equal(first.seq, 1);
  assert.equal(duplicate.id, first.id);
  assert.equal(duplicate.body, 'Hello Bob');
  const reply = await rpc(bob, 'select public.send_message($1,$2,$3) as data', [direct, randomUUID(), 'Hello Alice']);
  assert.equal(reply.seq, 2);
});
test('non-member cannot send, retrieve payloads, or edit messages', async () => {
  await assert.rejects(rpc(eve, 'select public.send_message($1,$2,$3) as data', [direct, randomUUID(), 'Intrusion']), /Membership required/);
  assert.equal(await rpc(eve, 'select private.message_payload($1) as data', [message]), null);
  await assert.rejects(rpc(eve, 'select public.edit_message($1,$2) as data', [message, 'Intrusion']), /Membership required/);
});
test('direct table inserts cannot bypass message sequencing or sender verification', async () => {
  await assert.rejects(asUser(alice, 'insert into public.messages(conversation_id,seq,sender_id,client_message_id,body) values($1,99,$2,$3,$4)', [direct, bob, randomUUID(), 'Forged']), /permission denied/);
});
test('profile updates cannot alter another user or immutable IDs', async () => {
  assert.equal((await asUser(alice, "update public.profiles set display_name='Changed' where id=$1 returning *", [bob])).length, 0);
  await assert.rejects(asUser(alice, 'update public.profiles set id=$1 where id=$2', [eve, alice]), /permission denied/);
});
test('read receipts only move forward and cannot exceed saved history', async () => {
  assert.equal((await rpc(bob, 'select public.mark_conversation_read($1,$2) as data', [direct, 2])).last_read_seq, 2);
  assert.equal((await rpc(bob, 'select public.mark_conversation_read($1,$2) as data', [direct, 1])).last_read_seq, 2);
  await assert.rejects(rpc(bob, 'select public.mark_conversation_read($1,$2) as data', [direct, 3]), /Invalid read position/);
});
test('only the original sender can edit or delete a message', async () => {
  await assert.rejects(rpc(bob, 'select public.edit_message($1,$2) as data', [message, 'Hijacked']), /Only the sender/);
  await assert.rejects(rpc(bob, 'select public.delete_message($1) as data', [message]), /Only the sender/);
  const edited = await rpc(alice, 'select public.edit_message($1,$2) as data', [message, 'Edited hello']);
  assert.equal(edited.body, 'Edited hello');
  assert.ok(edited.edited_at);
});
test('reactions are unique per message, user, and emoji', async () => {
  await rpc(bob, 'select public.react_to_message($1,$2) as data', [message, '👍']);
  await rpc(bob, 'select public.react_to_message($1,$2) as data', [message, '👍']);
  assert.equal((await asUser(alice, 'select * from public.message_reactions where message_id=$1', [message])).length, 1);
});
test('group owner and member permissions are enforced', async () => {
  group = (await rpc(alice, 'select public.create_group_conversation($1,$2) as data', ['Study group', [bob]])).id;
  await assert.rejects(rpc(bob, 'select public.change_group_member($1,$2,false) as data', [group, eve]), /Group owner required/);
  await assert.rejects(rpc(bob, 'select public.rename_group($1,$2) as data', [group, 'Hijacked']), /Group owner required/);
  await rpc(alice, 'select public.change_group_member($1,$2,false) as data', [group, eve]);
  assert.equal((await asUser(eve, 'select * from public.conversations where id=$1', [group])).length, 1);
});
test('nullable RPC arguments cannot bypass group owner authorization', async () => {
  await assert.rejects(rpc(bob, 'select public.change_group_member($1,$2,null) as data', [group, eve]), /Invalid membership action/);
  await assert.rejects(rpc(alice, 'select public.change_group_member($1,null,false) as data', [group]), /Invalid membership action/);
});
test('removing a member revokes reads and writes immediately', async () => {
  await rpc(alice, 'select public.change_group_member($1,$2,true) as data', [group, eve]);
  assert.equal((await asUser(eve, 'select * from public.conversations where id=$1', [group])).length, 0);
  await assert.rejects(rpc(eve, 'select public.send_message($1,$2,$3) as data', [group, randomUUID(), 'Forbidden']), /Membership required/);
});
test('owner cannot leave, direct memberships cannot change, regular group members can leave', async () => {
  await assert.rejects(rpc(alice, 'select public.change_group_member($1,$2,true) as data', [group, alice]), /owner must remain/);
  await assert.rejects(rpc(alice, 'select public.change_group_member($1,$2,true) as data', [direct, bob]), /Group owner required/);
  await rpc(bob, 'select public.change_group_member($1,$2,true) as data', [group, bob]);
  assert.equal((await asUser(bob, 'select * from public.conversations where id=$1', [group])).length, 0);
});
test('a retry ID cannot be reused in another conversation', async () => {
  const id = randomUUID();
  await rpc(alice, 'select public.send_message($1,$2,$3) as data', [direct, id, 'First']);
  await assert.rejects(rpc(alice, 'select public.send_message($1,$2,$3) as data', [group, id, 'Other']), /another conversation/);
});
test('draft uploads remain private and linking attachments is atomic', async () => {
  const id = randomUUID();
  const key = `${direct}/${alice}/${id}`;
  await asUser(alice, 'insert into public.attachments(id,conversation_id,uploader_id,object_key,original_name,mime_type,size_bytes) values($1,$2,$3,$4,$5,$6,$7)', [id, direct, alice, key, 'note.txt', 'text/plain', 5]);
  assert.equal((await asUser(bob, 'select * from public.attachments where id=$1', [id])).length, 0);
  assert.equal(await rpc(alice, 'select private.can_upload_object($1) as data', [`${direct}/${bob}/${randomUUID()}`]), false);
  await assert.rejects(rpc(bob, 'select public.send_message($1,$2,$3,$4) as data', [direct, randomUUID(), '', [id]]), /Invalid attachments/);
  const sent = await rpc(alice, 'select public.send_message($1,$2,$3,$4) as data', [direct, randomUUID(), '', [id]]);
  assert.equal(sent.kind, 'attachment');
  assert.equal(sent.attachments[0].id, id);
  assert.equal((await asUser(bob, 'select * from public.attachments where id=$1', [id])).length, 1);
  assert.equal(await rpc(bob, 'select private.can_read_object($1) as data', [key]), true);
  assert.equal(await rpc(alice, 'select private.can_delete_object($1) as data', [key]), false);
  await rpc(alice, 'select public.delete_message($1) as data', [sent.id]);
  assert.equal((await asUser(bob, 'select * from public.attachments where id=$1', [id])).length, 0);
  assert.equal(await rpc(bob, 'select private.can_read_object($1) as data', [key]), false);
});
test('malformed object paths and outsider uploads fail closed', async () => {
  assert.equal(await rpc(eve, 'select private.can_upload_object($1) as data', [`${direct}/${eve}/${randomUUID()}`]), false);
  assert.equal(await rpc(alice, 'select private.can_upload_object($1) as data', ['invalid/path']), false);
  assert.equal(await rpc(alice, 'select private.can_upload_object($1) as data', [`invalid/${alice}/invalid`]), false);
});
test('soft deletion keeps sequence history, removes body/search text and reactions', async () => {
  const deleted = await rpc(alice, 'select public.delete_message($1) as data', [message]);
  assert.equal(deleted.body, '');
  assert.ok(deleted.deleted_at);
  assert.equal(deleted.seq, 1);
  assert.equal((await asUser(bob, 'select * from public.message_reactions where message_id=$1', [message])).length, 0);
  await assert.rejects(rpc(alice, 'select public.edit_message($1,$2) as data', [message, 'Restore']), /Message was deleted/);
});
test('campus joining cannot discover or enter a private group by its title', async () => {
  const privateGroup = await rpc(alice, 'select public.create_group_conversation($1,$2) as data', ['#KamandPrompt', [bob]]);
  const campus = await rpc(eve, 'select public.join_or_create_campus_room($1,$2) as data', ['kamandprompt', '#KamandPrompt']);
  assert.notEqual(campus.id, privateGroup.id);
  assert.equal((await asUser(eve, 'select * from public.conversations where id=$1', [privateGroup.id])).length, 0);
  const joined = await rpc(bob, 'select public.join_or_create_campus_room($1,$2) as data', ['kamandprompt', '#KamandPrompt']);
  assert.equal(joined.id, campus.id);
  assert.equal((await asUser(bob, 'select * from public.conversation_members where conversation_id=$1', [campus.id])).length, 2);
});
test('campus RPC rejects forged catalogue entries and protects its internal registry', async () => {
  await assert.rejects(rpc(eve, 'select public.join_or_create_campus_room($1,$2) as data', ['private', 'Study group']), /Unknown campus room/);
  await assert.rejects(rpc(eve, 'select public.join_or_create_campus_room($1,$2) as data', ['kamandprompt', 'Study group']), /Unknown campus room/);
  await assert.rejects(asUser(eve, 'select * from private.campus_rooms'), /permission denied/);
});
test('campus management uses trusted room assignments and protects managers', async () => {
  const campus = await rpc(alice, 'select public.join_or_create_campus_room($1,$2) as data', ['robotronics', '#Robotronics']);
  assert.equal(campus.campus_room_slug, 'robotronics');
  await assert.rejects(rpc(alice, 'select public.rename_group($1,$2) as data', [campus.id, 'Hijacked room']), /Group owner required/);
  await db.query('update auth.users set raw_user_meta_data=$2 where id=$1', [eve, JSON.stringify({ campus_rooms: ['robotronics'] })]);
  await rpc(eve, 'select public.join_or_create_campus_room($1,$2) as data', ['robotronics', '#Robotronics']);
  await assert.rejects(rpc(eve, 'select public.change_group_member($1,$2,false) as data', [campus.id, bob]), /Group owner required/);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [bob, JSON.stringify({ campus_rooms: ['robotronics', 'pine-mess'] })]);
  await rpc(bob, 'select public.join_or_create_campus_room($1,$2) as data', ['robotronics', '#Robotronics']);
  await rpc(bob, 'select public.rename_group($1,$2) as data', [campus.id, 'Robotronics demo']);
  await rpc(bob, 'select public.change_group_member($1,$2,false) as data', [campus.id, alice]);
  await assert.rejects(rpc(alice, 'select public.change_group_member($1,$2,true) as data', [campus.id, bob]), /Group owner required/);
  await assert.rejects(rpc(bob, 'select public.change_group_member($1,$2,true) as data', [campus.id, bob]), /owner must remain/);
  await rpc(bob, 'select public.change_group_member($1,$2,true) as data', [campus.id, eve]);
  assert.equal((await asUser(eve, 'select * from public.conversations where id=$1', [campus.id])).length, 0);
  const another = await rpc(bob, 'select public.join_or_create_campus_room($1,$2) as data', ['yantrik', '#Yantrik']);
  await assert.rejects(rpc(bob, 'select public.rename_group($1,$2) as data', [another.id, 'Wrong club']), /Group owner required/);
});

test('mess menus persist and RLS rejects students and other mess managers', async () => {
  await asUser(bob, 'insert into public.mess_menus(room_slug,menu,updated_by) values($1,$2,$3)', ['pine-mess', JSON.stringify({ lunch: 'Demo lunch' }), bob]);
  assert.equal((await asUser<{ menu: { lunch: string } }>(alice, "select menu from public.mess_menus where room_slug='pine-mess'"))[0]!.menu.lunch, 'Demo lunch');
  await assert.rejects(asUser(alice, 'insert into public.mess_menus(room_slug,menu,updated_by) values($1,$2,$3)', ['oak-mess', '{}', alice]), /row-level security/);
  await assert.rejects(asUser(bob, 'insert into public.mess_menus(room_slug,menu,updated_by) values($1,$2,$3)', ['oak-mess', '{}', bob]), /row-level security/);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [bob, '{}']);
  const update = await asUser(bob, "update public.mess_menus set menu='{}' where room_slug='pine-mess' returning *");
  assert.equal(update.length, 0);
});

test('calendar persists authorized event edits and prevents overlapping approvals', async () => {
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [bob, JSON.stringify({ campus_rooms: ['kamandprompt'] })]);
  const input = { roomSlug: 'kamandprompt', title: 'Database workshop', description: 'Persistent event', category: 'Club Workshop', venue: 'A13 Hall', date: '2026-12-01', startMinute: 600, endMinute: 660 };
  const first = await rpc(bob, 'select public.save_campus_event($1) as data', [JSON.stringify(input)]);
  assert.equal(first.status, 'approved'); assert.equal(first.canManage, true); assert.equal(first.createdBy, bob);
  assert.equal(first.startTime, '10:00');
  const conflict = await rpc(bob, 'select public.save_campus_event($1) as data', [JSON.stringify({ ...input, startMinute: 630, endMinute: 690 })]);
  assert.equal(conflict.status, 'conflict');
  assert.equal((await rpc(bob, 'select public.set_campus_event_status($1,$2) as data', [conflict.id, 'approved'])).status, 'conflict');
  await assert.rejects(rpc(alice, 'select public.set_campus_event_status($1,$2) as data', [first.id, 'cancelled']), /privileges required/);
  await assert.rejects(rpc(eve, 'select public.save_campus_event($1) as data', [JSON.stringify(input)]), /privileges required/);
  await assert.rejects(asUser(bob, 'update public.campus_events set created_by=$1 where id=$2', [eve, first.id]), /permission denied/);
  const adjacent = await rpc(bob, 'select public.save_campus_event($1) as data', [JSON.stringify({ ...input, startMinute: 660, endMinute: 720 })]);
  assert.equal(adjacent.status, 'approved');
  await rpc(bob, 'select public.set_campus_event_status($1,$2) as data', [first.id, 'cancelled']);
  const rescheduled = await rpc(bob, 'select public.save_campus_event($1,$2) as data', [JSON.stringify({ ...input, title: 'Rescheduled workshop', startMinute: 600, endMinute: 650 }), conflict.id]);
  assert.equal(rescheduled.status, 'approved');
  const listed = await rpc(alice, 'select public.list_campus_events($1,$2) as data', ['A13 Hall', 'Club Workshop']);
  assert.ok(listed.some((event: any) => event.id === conflict.id && event.title === 'Rescheduled workshop' && event.canManage === false));
  await assert.rejects(rpc(bob, 'select public.save_campus_event($1) as data', [JSON.stringify({ ...input, endMinute: 500 })]), /check constraint/);
  const publicEvents = await db.transaction(async tx => { await tx.exec('set local role anon'); return (await tx.query<{ data: any[] }>('select public.list_campus_events() as data')).rows[0]!.data; });
  assert.equal(publicEvents.length, 3);
});

test('maintenance reports, private votes and status history respect residence scope', async () => {
  await db.query("update public.profiles set hostel='Parashar',mess='Pine Mess',chat_only=false where id=$1", [alice]);
  await db.query("update public.profiles set hostel='Suvalsar',mess='Oak Mess',chat_only=false where id=$1", [eve]);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [bob, JSON.stringify({ campus_rooms: ['p2-chat'] })]);
  const input = { roomSlug: 'parashar-general', title: 'Repair the hallway light', category: 'Electrical', campus: 'North', specificLocation: 'P2 hallway' };
  const ticket = await rpc(alice, 'select public.create_maintenance_ticket($1) as data', [JSON.stringify(input)]);
  assert.equal(ticket.createdBy, alice); assert.equal(ticket.scope, 'hostel'); assert.equal(ticket.upvotes, 1);
  assert.equal(ticket.history.length, 1); assert.deepEqual(ticket.upvotedBy, [alice]);
  await assert.rejects(rpc(eve, 'select public.create_maintenance_ticket($1) as data', [JSON.stringify(input)]), /assigned residence/);
  await assert.rejects(rpc(eve, 'select public.toggle_maintenance_vote($1) as data', [ticket.id]), /Scope access/);
  assert.equal((await asUser(eve, 'select * from public.maintenance_tickets where id=$1', [ticket.id])).length, 0);
  const vote = await rpc(bob, 'select public.toggle_maintenance_vote($1) as data', [ticket.id]);
  assert.equal(vote.ticket.upvotes, 2); assert.equal(vote.hasUpvoted, true); assert.deepEqual(vote.ticket.upvotedBy, [bob]);
  assert.equal((await asUser(bob, 'select * from public.maintenance_ticket_votes where ticket_id=$1', [ticket.id])).length, 1);
  const unvote = await rpc(alice, 'select public.toggle_maintenance_vote($1) as data', [ticket.id]);
  assert.equal(unvote.ticket.upvotes, 1); assert.equal(unvote.hasUpvoted, false);
  await assert.rejects(rpc(alice, 'select public.set_maintenance_ticket_status($1,$2) as data', [ticket.id, 'Resolved by Warden/Caretaker']), /Assigned caretaker/);
  await assert.rejects(asUser(alice, 'insert into public.maintenance_ticket_votes(ticket_id,user_id) values($1,$2)', [ticket.id, eve]), /permission denied/);
  await rpc(bob, 'select public.set_maintenance_ticket_status($1,$2) as data', [ticket.id, 'Under Investigation']);
  const resolved = await rpc(bob, 'select public.set_maintenance_ticket_status($1,$2) as data', [ticket.id, 'Resolved by Warden/Caretaker']);
  assert.ok(resolved.resolvedAt); assert.equal(resolved.history.length, 3);
  const unchanged = await rpc(bob, 'select public.set_maintenance_ticket_status($1,$2) as data', [ticket.id, 'Resolved by Warden/Caretaker']);
  assert.equal(unchanged.history.length, 3);
  const reopened = await rpc(bob, 'select public.set_maintenance_ticket_status($1,$2) as data', [ticket.id, 'Reported']);
  assert.equal(reopened.resolvedAt, null); assert.equal(reopened.history.length, 4);
  const list = await rpc(alice, 'select public.list_maintenance_tickets($1,$2,$3,$4) as data', ['hostel', 'North', 'Reported', 'Parashar']);
  assert.equal(list.length, 1); assert.equal(list[0].canManage, false);
  const hidden = await rpc(eve, 'select public.list_maintenance_tickets() as data');
  assert.deepEqual(hidden, []);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [bob, '{}']);
  await assert.rejects(rpc(bob, 'select public.set_maintenance_ticket_status($1,$2) as data', [ticket.id, 'Under Investigation']), /Assigned caretaker/);
});

test('revoked sessions cannot read profiles or send messages with an otherwise valid JWT', async () => {
  await db.query('delete from auth.sessions where user_id=$1', [alice]);
  assert.equal(await rpc(alice, 'select public.session_is_active() as data'), false);
  assert.equal((await asUser(alice, 'select * from public.profiles')).length, 0);
  await assert.rejects(rpc(alice, 'select public.send_message($1,$2,$3) as data', [direct, randomUUID(), 'After logout']), /Authentication required/);
});
test('session not_after expiry is enforced independently of JWT validity', async () => {
  await db.query("update auth.sessions set not_after=now()-interval '1 second' where user_id=$1", [bob]);
  assert.equal(await rpc(bob, 'select public.session_is_active() as data'), false);
  assert.equal((await asUser(bob, 'select * from public.messages where conversation_id=$1', [direct])).length, 0);
});
