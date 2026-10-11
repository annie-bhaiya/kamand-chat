import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { attachRealtime } from '../src/realtime.js';
import { encodeActivityCursor } from '../src/validation.js';

const user = randomUUID(), sessionId = randomUUID(), conversationId = randomUUID(), other = randomUUID();
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user, session_id: sessionId, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.${Buffer.from('fixture-signature').toString('base64url')}`;
const calls: { method: string; path: string; authorization: string; body: any }[] = [];
let upstream: Server, http: Server, app: ReturnType<typeof createApp>['app'];
let realtime: ReturnType<typeof attachRealtime>;
let url: string;
let accountLookupUnavailable = false;
let savedAvatarKey: string | null = null;
const sockets: Socket[] = [];

before(async () => {
  // A protocol fixture, not a production database. This exercises the real supabase-js
  // HTTP client, request token isolation, Express middleware, and Socket.IO transport.
  upstream = createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    let body: any = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = text; }
    }
    const path = req.url ?? '';
    const authorization = String(req.headers.authorization ?? '');
    calls.push({ method: req.method ?? '', path, authorization, body });
    res.setHeader('Content-Type', 'application/json');
    if (path.startsWith('/auth/v1/recover')) { res.end('{}'); return; }
    if (path === '/auth/v1/logout?scope=local') { res.statusCode = 204; res.end(); return; }
    if (path === '/auth/v1/user') {
      if (authorization !== `Bearer ${token}`) { res.statusCode = 401; res.end(JSON.stringify({ message: 'Invalid JWT', code: 'bad_jwt' })); return; }
      res.end(JSON.stringify({ id: user, email: 'alice@example.com', aud: 'authenticated', role: 'authenticated' })); return;
    }
    if (path === '/rest/v1/rpc/chat_health') { res.end(JSON.stringify('ok')); return; }
    if (path === '/rest/v1/rpc/session_is_active') { res.end('true'); return; }
    if (path === '/rest/v1/rpc/check_user_exists') {
      if (accountLookupUnavailable) { res.statusCode = 503; res.end(JSON.stringify({ message: 'Unavailable' })); return; }
      res.end(JSON.stringify({ exists: body?.p_email === 'alice@example.com', display_name: 'Alice' })); return;
    }
    if (path.startsWith('/rest/v1/profiles')) {
      if (body && typeof body === 'object' && 'avatar_key' in body) {
        savedAvatarKey = body.avatar_key;
      }
      res.end(JSON.stringify({ id: user, username: 'alice', display_name: 'Alice', avatar_key: savedAvatarKey }));
      return;
    }
    if (path.startsWith('/storage/v1/object/avatars') || path.startsWith('/storage/v1/object/public/avatars')) {
      if (req.method === 'DELETE') {
        savedAvatarKey = null;
        res.end(JSON.stringify([{ name: 'avatar.png' }]));
        return;
      }
      res.end(JSON.stringify({ Key: `avatars/${user}/avatar.png`, Id: `avatars/${user}/avatar.png` }));
      return;
    }
    if (path.startsWith('/rest/v1/attachments')) { res.end(JSON.stringify([])); return; }
    if (path.startsWith('/rest/v1/conversations')) {
      const row={ id: conversationId, type: 'direct', last_activity_at: '2026-10-09T00:00:00+00:00' };
      res.end(JSON.stringify(new URL(path,'http://fixture').searchParams.has('limit')?[row]:row)); return;
    }
    if (path.startsWith('/rest/v1/conversation_members')) { res.end(JSON.stringify([{ user_id: user }, { user_id: other }])); return; }
    if (path === '/rest/v1/rpc/send_message') {
      if (body.p_conversation !== conversationId) { res.statusCode=403; res.end(JSON.stringify({ code:'42501', message:'Membership required' })); return; }
      res.end(JSON.stringify({ id: randomUUID(), conversation_id: conversationId, sender_id: user, seq: 1, body: body.p_body, attachments: [] })); return;
    }
    if (new URL(path, 'http://fixture').pathname === '/auth/v1/signup') { res.end(JSON.stringify({ id: user, email: body.email, user_metadata: body.data })); return; }
    if (path.startsWith('/auth/v1/token')) { res.end(JSON.stringify({ access_token: token, token_type:'bearer', refresh_token:'refresh-test-token', expires_in:3600, user:{ id:user, email:body.email } })); return; }
    res.statusCode=404; res.end(JSON.stringify({ message:'Fixture endpoint not implemented' }));
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const address = upstream.address() as import('node:net').AddressInfo;
  const config = loadConfig({ SUPABASE_URL:`http://127.0.0.1:${address.port}`, SUPABASE_PUBLISHABLE_KEY:'publishable-test-key', NODE_ENV:'test' } as NodeJS.ProcessEnv);
  const service = createApp(config);
  app = service.app;
  http = createServer(app);
  realtime = attachRealtime(http, config, service.factory, service.events);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(http.address() as import('node:net').AddressInfo).port}`;
});
after(async () => {
  sockets.forEach(s => s.disconnect());
  await new Promise<void>(resolve => realtime.close(() => resolve()));
  await new Promise<void>(resolve => upstream.close(() => resolve()));
});
const authenticated = () => request(app).get('/api/auth/me').set('Authorization',`Bearer ${token}`);
function withDeadline<T>(promise: Promise<T>) {
  return new Promise<T>((resolve,reject) => {
    const timer=setTimeout(() => reject(new Error('Timed out waiting for Socket.IO')),5000);
    promise.then(x => { clearTimeout(timer); resolve(x); },e => { clearTimeout(timer); reject(e); });
  });
}

test('health, readiness and security headers work', async () => {
  const health = await request(app).get('/health').expect(200);
  assert.equal(health.body.data.status,'ok');
  assert.ok(health.headers['x-content-type-options']);
  assert.ok(health.headers['x-request-id']);
  assert.equal(health.headers['x-powered-by'],undefined);
  await request(app).get('/ready').expect(200);
});
test('protected endpoints reject missing and invalid Bearer tokens', async () => {
  await request(app).get('/api/conversations').expect(401);
  await request(app).get('/api/conversations').set('Authorization','Bearer invalid').expect(401);
  await request(app).get('/api/conversations').set('Authorization','Basic invalid').expect(401);
});

test('password recovery validates input and uses the configured redirect', async () => {
  await request(app).post('/api/auth/forgot-password').send({ email: 'invalid' }).expect(400);
  const response = await request(app).post('/api/auth/forgot-password').send({ email: 'alice@example.com' }).expect(200);
  assert.match(response.body.data.message, /If an account exists/);
  const recovery = calls.filter(c => c.path.startsWith('/auth/v1/recover')).at(-1)!;
  assert.equal(recovery.body.email, 'alice@example.com');
  assert.equal(new URL(recovery.path, 'http://fixture').searchParams.get('redirect_to'), 'https://kamandchat.highliftpages.com');
});

test('password update requires a valid session and revokes it after updating', async () => {
  await request(app).post('/api/auth/reset-password').send({ password: 'StrongPass123!', refresh_token: 'refresh' }).expect(401);
  await request(app).post('/api/auth/reset-password').set('Authorization', 'Bearer invalid').send({ password: 'StrongPass123!', refresh_token: 'refresh' }).expect(401);
  await request(app).post('/api/auth/reset-password').set('Authorization', `Bearer ${token}`).send({ password: 'short', refresh_token: 'refresh' }).expect(400);
  await request(app).post('/api/auth/reset-password').set('Authorization', `Bearer ${token}`).send({ password: 'StrongPass123!', refresh_token: 'refresh' }).expect(204);
  const update = calls.filter(c => c.path === '/auth/v1/user' && c.method === 'PUT').at(-1)!;
  assert.equal(update.authorization, `Bearer ${token}`);
  assert.equal(update.body.password, 'StrongPass123!');
  assert.ok(calls.some(c => c.path === '/auth/v1/logout?scope=local'));
});
test('verified user token is passed to Supabase RLS queries', async () => {
  const response = await authenticated().expect(200);
  assert.equal(response.body.data.user.id,user);
  assert.equal(calls.filter(c => c.path.startsWith('/rest/v1/profiles')).at(-1)?.authorization,`Bearer ${token}`);
  assert.equal(response.headers['cache-control'],'no-store');
});
test('signup forwards only validated profile metadata and handles email confirmation', async () => {
  const response = await request(app).post('/api/auth/register').send({ email:'new@example.com', password:'StrongPass123!', display_name:'New Person' }).expect(201);
  assert.equal(response.body.data.requires_email_confirmation,true);
  const call = calls.findLast(c => new URL(c.path, 'http://fixture').pathname === '/auth/v1/signup');
  assert.equal(new URL(call!.path, 'http://fixture').searchParams.get('redirect_to'), 'https://kamandchat.highliftpages.com');
  assert.equal(call?.body.data.display_name,'New Person');
  assert.equal(call?.authorization,'Bearer publishable-test-key');
});
test('login uses a fresh client instead of inheriting another request session', async () => {
  const response = await request(app).post('/api/auth/login').send({ email:'alice@example.com', password:'StrongPass123!' }).expect(200);
  assert.equal(response.body.data.session.access_token,token);
  const call=calls.findLast(c => c.path.startsWith('/auth/v1/token'));
  assert.equal(call?.authorization,'Bearer publishable-test-key');
});
test('login auto-detects non-existent user and creates account with confirmation email', async () => {
  const response = await request(app).post('/api/auth/login').send({ email:'newstudent@example.com', password:'StrongPass123!', display_name:'New Student' }).expect(200);
  assert.equal(response.body.data.auto_created, true);
  assert.equal(response.body.data.requires_email_confirmation, true);
  const call = calls.findLast(c => new URL(c.path, 'http://fixture').pathname === '/auth/v1/signup');
  assert.equal(new URL(call!.path, 'http://fixture').searchParams.get('redirect_to'), 'https://kamandchat.highliftpages.com');
  assert.equal(call?.body.data.display_name, 'New Student');
});
test('a failed account lookup never creates a new account', async () => {
  const signupsBefore = calls.filter(call => new URL(call.path, 'http://fixture').pathname === '/auth/v1/signup').length;
  accountLookupUnavailable = true;
  try {
    await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'StrongPass123!' }).expect(503);
    assert.equal(calls.filter(call => new URL(call.path, 'http://fixture').pathname === '/auth/v1/signup').length, signupsBefore);
  } finally { accountLookupUnavailable = false; }
});
test('validation rejects forged sender IDs, bad UUIDs, empty messages and conflicting history cursors', async () => {
  await request(app).post(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${token}`).send({ client_message_id:randomUUID(), body:'hello', sender_id:other }).expect(400);
  await request(app).post('/api/conversations/not-a-uuid/messages').set('Authorization',`Bearer ${token}`).send({ client_message_id:randomUUID(),body:'hello' }).expect(400);
  await request(app).post(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${token}`).send({ client_message_id:randomUUID(),body:' ' }).expect(400);
  await request(app).get(`/api/conversations/${conversationId}/messages?before_seq=1&after_seq=2`).set('Authorization',`Bearer ${token}`).expect(400);
});
test('messages use the atomic Supabase RPC with the authenticated token', async () => {
  const clientId=randomUUID();
  const response = await request(app).post(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${token}`).send({ client_message_id:clientId,body:' Hello ' }).expect(200);
  assert.equal(response.body.data.body,'Hello');
  const call=calls.findLast(c => c.path==='/rest/v1/rpc/send_message');
  assert.deepEqual(call?.body,{ p_conversation:conversationId,p_client_id:clientId,p_body:'Hello',p_attachments:[] });
  assert.equal(call?.authorization,`Bearer ${token}`);
});
test('database authorization errors become safe HTTP errors', async () => {
  const response=await request(app).post(`/api/conversations/${randomUUID()}/messages`).set('Authorization',`Bearer ${token}`).send({ client_message_id:randomUUID(),body:'hello' }).expect(403);
  assert.equal(response.body.error.code,'FORBIDDEN');
  assert.equal(response.body.error.message.includes('Membership'),false);
});
test('untrusted browser origins and oversized/invalid JSON requests are rejected', async () => {
  await request(app).get('/health').set('Origin','https://untrusted.example').expect(403);
  await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{broken').expect(400);
  await request(app).post('/api/auth/login').send({ huge:'a'.repeat(140000) }).expect(413);
});
test('unknown endpoints return structured 404 responses', async () => {
  const response=await request(app).get('/unknown').expect(404);
  assert.equal(response.body.error.code,'NOT_FOUND');
});
test('OpenAPI describes the exposed API and inbox cursors are validated before filtering', async () => {
  const schema=await request(app).get('/openapi.json').expect(200);
  assert.equal(schema.body.openapi,'3.1.0');
  assert.ok(schema.body.paths['/api/conversations/{conversationId}/messages'].post);
  const cursor=encodeActivityCursor('2026-10-09T00:00:00+00:00',conversationId);
  const page=await request(app).get(`/api/conversations?cursor=${cursor}`).set('Authorization',`Bearer ${token}`).expect(200);
  assert.equal(page.body.data[0].id,conversationId);
  await request(app).get('/api/conversations?cursor=invalid').set('Authorization',`Bearer ${token}`).expect(400);
});
test('Socket.IO rejects unauthenticated connections', async () => {
  const socket=connect(url,{ transports:['websocket'], auth:{token:'invalid'},reconnection:false }); sockets.push(socket);
  const error=await withDeadline(new Promise<Error>(resolve => socket.once('connect_error',resolve)));
  assert.match(error.message,/Authentication/);
  socket.disconnect();
});
test('authenticated Socket.IO receives persisted messages and typing events', async () => {
  const socket=connect(url,{transports:['websocket'],auth:{token},reconnection:false}); sockets.push(socket);
  await withDeadline(new Promise<void>((resolve,reject) => { socket.once('connect',resolve); socket.once('connect_error',reject); }));
  const incoming=withDeadline(new Promise<any>(resolve => socket.once('message:new',resolve)));
  await request(app).post(`/api/conversations/${conversationId}/messages`).set('Authorization',`Bearer ${token}`).send({client_message_id:randomUUID(),body:'Live message'}).expect(200);
  assert.equal((await incoming).body,'Live message');
  const typing=withDeadline(new Promise<any>(resolve => socket.once('typing',resolve)));
  const ack=await withDeadline(new Promise<any>(resolve => socket.emit('typing',{conversation_id:conversationId,is_typing:true},resolve)));
  assert.equal(ack.ok,true);
  assert.equal((await typing).user_id,user);
  socket.disconnect();
});
test('upload, retrieve, and remove profile avatar works', async () => {
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  const uploadRes = await request(app)
    .post('/api/users/me/avatar')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', pngBuffer, 'avatar.png')
    .expect(200);
  assert.ok(uploadRes.body.data.avatar_key);
  assert.ok(uploadRes.body.data.avatar_key.includes(`${user}/avatar.png`));
  const getRes = await request(app)
    .get(`/api/users/${user}/avatar`)
    .expect(302);
  assert.ok(getRes.headers.location?.includes(`${user}/avatar.png`));
  const deleteRes = await request(app)
    .delete('/api/users/me/avatar')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(deleteRes.body.data.avatar_key, null);
  await request(app)
    .get(`/api/users/${user}/avatar`)
    .expect(404);
});
