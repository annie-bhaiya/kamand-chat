import 'dotenv/config';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { simulationAccounts } from '../src/simulation.js';
import { createDatabaseClient } from './database.js';

if (process.env.NODE_ENV === 'production') throw new Error('Run simulation verification in development.');
const { app, factory } = createApp(loadConfig({ ...process.env, NODE_ENV: 'development' }));
const accounts = await simulationAccounts();
const sessions = new Map<string, { token: string; refresh: string; id: string }>();
const fixtureEvents: string[] = [];
const fixtureTickets: string[] = [];
const listed = await request(app).get('/simulate');
assert.equal(listed.status, 200);
assert.equal(listed.body.data.length, accounts.length);
assert.ok(listed.body.data.every((account: Record<string, unknown>) => !('password' in account)));
try {
  const representatives = ['demo_coord_kamandprompt', 'demo_care_parashar', 'demo_manager_pine_mess', 'demo_student_1'];
  const selected = process.argv.includes('--all') ? accounts : accounts.filter((account, index) => representatives.includes(account.username) || (process.argv.includes('--remaining') && index >= 34));
  for (const account of selected) {
    let signedIn = await request(app).post('/simulate').send({ username: account.username });
    for (let attempt = 0; signedIn.status === 429 && attempt < 2; attempt++) {
      console.log('Supabase login rate limit reached; waiting 30 seconds before retrying.');
      await delay(30000);
      signedIn = await request(app).post('/simulate').send({ username: account.username });
    }
    assert.equal(signedIn.status, 200, `${account.username}: ${JSON.stringify(signedIn.body.error)}`);
    const { session, user } = signedIn.body.data;
    assert.ok(session?.access_token);
    assert.deepEqual(user.app_metadata.campus_rooms, account.rooms);
    sessions.set(account.username, { token: session.access_token, refresh: session.refresh_token, id: user.id });
    await delay(2500);
  }
  console.log(`Verified ${selected.length} real Supabase logins.`);
  const student = sessions.get('demo_student_1')!;
  for (const [username, slug] of [['demo_coord_kamandprompt', 'kamandprompt'], ['demo_care_parashar', 'p2-chat'], ['demo_manager_pine_mess', 'pine-mess']]) {
    const manager = sessions.get(username!)!;
    const auth = { Authorization: `Bearer ${manager.token}` };
    const permissions = await request(app).get(`/api/campus/rooms/${slug}/permissions`).set(auth);
    assert.equal(permissions.body.data.isAdmin, true);
    const joined = await request(app).post(`/api/campus/rooms/${slug}/conversation`).set(auth).send({});
    assert.equal(joined.status, 200, JSON.stringify(joined.body));
    const id = joined.body.data.conversation.id;
    assert.equal(joined.body.data.conversation.campus_room_slug, slug);
    const added = await request(app).post(`/api/conversations/${id}/members`).set(auth).send({ user_id: student.id });
    assert.equal(added.status, 201);
    assert.equal((await request(app).get(`/api/conversations/${id}`).set('Authorization', `Bearer ${student.token}`)).status, 200);
    assert.equal((await request(app).patch(`/api/conversations/${id}`).set('Authorization', `Bearer ${student.token}`).send({ title: 'Unauthorized rename' })).status, 403);
    assert.equal((await request(app).delete(`/api/conversations/${id}/members/${student.id}`).set(auth)).status, 200);
    assert.equal((await request(app).get(`/api/conversations/${id}`).set('Authorization', `Bearer ${student.token}`)).status, 404);
  }
  const messManager = sessions.get('demo_manager_pine_mess')!;
  const menu = (await request(app).get('/api/campus/messes/pine-mess/menu')).body.data;
  const input = { weekday: menu.weekday, breakfast: menu.breakfast, lunch: menu.lunch, dinner: menu.dinner, specialNotice: menu.specialNotice };
  const saved = await request(app).put('/api/campus/messes/pine-mess/menu').set('Authorization', `Bearer ${messManager.token}`).send(input);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual((await request(app).get('/api/campus/messes/pine-mess/menu')).body.data, menu);
  assert.equal((await request(app).put('/api/campus/messes/oak-mess/menu').set('Authorization', `Bearer ${messManager.token}`).send(input)).status, 403);
  assert.equal((await request(app).put('/api/campus/messes/pine-mess/menu').set('Authorization', `Bearer ${student.token}`).send(input)).status, 403);
  const coordinator = sessions.get('demo_coord_kamandprompt')!;
  const eventInput = { title: 'Demo role verification workshop', description: 'Disposable development check', category: 'Club Workshop', organizer: 'KamandPrompt', venue: 'Other', date: '2026-12-20', startTime: '10:00', endTime: '11:00' };
  const createdEvent = await request(app).post('/api/campus/events').set('Authorization', `Bearer ${coordinator.token}`).send(eventInput);
  assert.equal(createdEvent.status, 201);
  const eventId = createdEvent.body.data.id;
  fixtureEvents.push(eventId);
  assert.equal((await request(app).patch(`/api/campus/events/${eventId}/status`).set('Authorization', `Bearer ${coordinator.token}`).send({ status: 'approved' })).status, 200);
  assert.equal((await request(app).patch(`/api/campus/events/${eventId}/status`).set('Authorization', `Bearer ${messManager.token}`).send({ status: 'completed' })).status, 403);
  assert.equal((await request(app).patch(`/api/campus/events/${eventId}/status`).set('Authorization', `Bearer ${coordinator.token}`).send({ status: 'cancelled' })).status, 200);
  const concurrent = await Promise.all([1, 2].map(() => request(app).post('/api/campus/events').set('Authorization', `Bearer ${coordinator.token}`).send(eventInput)));
  for (const result of concurrent) { assert.equal(result.status, 201); fixtureEvents.push(result.body.data.id); }
  assert.deepEqual(concurrent.map(result => result.body.data.status).sort(), ['approved', 'conflict']);
  const conflictId = concurrent.find(result => result.body.data.status === 'conflict')!.body.data.id;
  const approval = await request(app).patch(`/api/campus/events/${conflictId}/status`).set('Authorization', `Bearer ${coordinator.token}`).send({ status: 'approved' });
  assert.equal(approval.body.data.status, 'conflict');
  const edited = await request(app).patch(`/api/campus/events/${conflictId}`).set('Authorization', `Bearer ${coordinator.token}`).send({ ...eventInput, title: 'Rescheduled verification workshop', startTime: '11:00', endTime: '12:00' });
  assert.equal(edited.status, 200); assert.equal(edited.body.data.status, 'approved');
  const restarted = createApp(loadConfig({ ...process.env, NODE_ENV: 'development' })).app;
  const persistedEvents = await request(restarted).get('/api/campus/events').set('Authorization', `Bearer ${coordinator.token}`);
  assert.ok(persistedEvents.body.data.some((event: any) => event.id === conflictId && event.title === 'Rescheduled verification workshop'));
  for (const [scope, clusterOrMess, managerName] of [['hostel', 'Parashar', 'demo_care_parashar'], ['mess', 'Pine Mess', 'demo_manager_pine_mess']]) {
    const ticket = await request(app).post('/api/campus/tickets').set('Authorization', `Bearer ${student.token}`).send({ title: 'Demo maintenance verification', description: 'Disposable development check', scope, clusterOrMess, category: 'Maintenance', campus: 'North', specificLocation: 'Demo test location' });
    assert.equal(ticket.status, 201);
    fixtureTickets.push(ticket.body.data.id);
    assert.equal((await request(app).patch(`/api/campus/tickets/${ticket.body.data.id}/status`).set('Authorization', `Bearer ${student.token}`).send({ status: 'Under Investigation' })).status, 403);
    const manager = sessions.get(managerName!)!;
    const voted = await request(app).post(`/api/campus/tickets/${ticket.body.data.id}/upvote`).set('Authorization', `Bearer ${manager.token}`);
    assert.equal(voted.status, 200); assert.equal(voted.body.data.ticket.upvotes, 2);
    assert.deepEqual(voted.body.data.ticket.upvotedBy, [manager.id]);
    const investigating = await request(app).patch(`/api/campus/tickets/${ticket.body.data.id}/status`).set('Authorization', `Bearer ${manager.token}`).send({ status: 'Under Investigation' });
    assert.equal(investigating.status, 200);
    const resolved = await request(app).patch(`/api/campus/tickets/${ticket.body.data.id}/status`).set('Authorization', `Bearer ${manager.token}`).send({ status: 'Resolved by Warden/Caretaker' });
    assert.equal(resolved.status, 200); assert.ok(resolved.body.data.resolvedAt); assert.equal(resolved.body.data.history.length, 3);
    const persisted = await request(restarted).get('/api/campus/tickets').set('Authorization', `Bearer ${student.token}`);
    assert.ok(persisted.body.data.some((item: any) => item.id === ticket.body.data.id && item.status === 'Resolved by Warden/Caretaker' && item.upvotes === 2));
  }
  console.log('Verified student add/remove and role boundaries for club, hostel and mess rooms; persisted menu round-trip passed.');
  console.log('Verified restart persistence, concurrent venue booking, rescheduling, ticket votes and status history; unauthorized changes denied.');
} finally {
  if (fixtureEvents.length || fixtureTickets.length) {
    const cleanup = await createDatabaseClient();
    try {
      await cleanup.connect();
      await cleanup.query("delete from public.campus_events where id=any($1::uuid[]) and created_by in(select id from auth.users where raw_app_meta_data->>'simulation'='true')", [fixtureEvents]);
      await cleanup.query("delete from public.maintenance_tickets where id=any($1::uuid[]) and created_by in(select id from auth.users where raw_app_meta_data->>'simulation'='true')", [fixtureTickets]);
    } finally { await cleanup.end(); }
  }
  for (const session of sessions.values()) {
    const client = factory();
    await client.auth.setSession({ access_token: session.token, refresh_token: session.refresh });
    await client.auth.signOut({ scope: 'local' });
  }
}
