import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { io as connect } from 'socket.io-client';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { attachRealtime } from '../src/realtime.js';
import { createSqlFixtures } from './live-fixtures.js';

test('live Supabase: authentication, RLS, concurrent messaging, Socket.IO, files, groups, and logout', { skip: process.env.RUN_LIVE_TESTS !== '1', timeout: 120000 }, async () => {
  const config=loadConfig();
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.DATABASE_URL) throw new Error('Live tests require SUPABASE_SECRET_KEY or DATABASE_URL for disposable fixture setup/cleanup.');
  const admin=process.env.SUPABASE_SECRET_KEY ? createClient(config.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}) : undefined;
  const sql = admin ? undefined : await createSqlFixtures();
  const {app,factory,events}=createApp(config);
  const http=createServer(app);
  const realtime=attachRealtime(http,config,factory,events);
  await new Promise<void>(resolve => http.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(http.address() as import('node:net').AddressInfo).port}`;
  const users: {id:string;access:string;refresh:string}[]=[];
  const objectKeys:string[]=[];
  let socket: ReturnType<typeof connect> | undefined;
  async function cleanupFiles() {
    if (!objectKeys.length) return;
    if (admin) assert.equal((await admin.storage.from(config.STORAGE_BUCKET).remove(objectKeys)).error,null);
    else {
      await sql!.releaseFiles(objectKeys,users.map(u=>u.id));
      const owner = users[0]!;
      assert.equal((await factory(owner.access).storage.from(config.STORAGE_BUCKET).remove(objectKeys)).error,null);
    }
    objectKeys.length=0;
  }
  try {
    await request(app).get('/ready').expect(200);
    for (let i=0;i<3;i++) {
      const email=`chat-test-${randomUUID()}@example.com`,password=`Test-${randomUUID()}!`;
      let id:string;
      if(admin) {
        const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:`Test ${i}`}});
        assert.equal(created.error,null);
        id=created.data.user!.id;
      } else id=await sql!.createUser(email,password,`Test ${i}`);
      // Record the ID before login so partially failing runs can still clean up.
      users.push({id,access:'',refresh:''});
      const login=await request(app).post('/api/auth/login').send({email,password}).expect(200);
      Object.assign(users.at(-1)!,{access:login.body.data.session.access_token,refresh:login.body.data.session.refresh_token});
    }
    const [alice,bob,eve]=users as [typeof users[number],typeof users[number],typeof users[number]];
    const auth=(u:typeof alice) => `Bearer ${u.access}`;
    await request(app).get('/api/auth/me').set('Authorization',auth(alice)).expect(200);
    await request(app).patch('/api/users/me').set('Authorization',auth(alice)).send({username:`test_${randomUUID().replaceAll('-','').slice(0,20)}`}).expect(200);
    const direct=(await request(app).post('/api/conversations/direct').set('Authorization',auth(alice)).send({user_id:bob.id}).expect(200)).body.data;
    const again=(await request(app).post('/api/conversations/direct').set('Authorization',auth(bob)).send({user_id:alice.id}).expect(200)).body.data;
    assert.equal(again.id,direct.id);
    await request(app).get(`/api/conversations/${direct.id}`).set('Authorization',auth(eve)).expect(404);
    socket=connect(url,{transports:['websocket'],auth:{token:bob.access},reconnection:false});
    await new Promise<void>((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('WebSocket connection timeout')),10000); socket!.once('connect',()=>{clearTimeout(timer);resolve();});socket!.once('connect_error',reject); });
    const realtimeMessage=new Promise<any>((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('Message delivery timeout')),10000);socket!.once('message:new',m=>{clearTimeout(timer);resolve(m);}); });
    const retry=randomUUID();
    const sends=await Promise.all(Array.from({length:5},()=>request(app).post(`/api/conversations/${direct.id}/messages`).set('Authorization',auth(alice)).send({client_message_id:retry,body:'Hello live Supabase'}).expect(200)));
    assert.equal(new Set(sends.map(r=>r.body.data.id)).size,1);
    assert.equal((await realtimeMessage).body,'Hello live Supabase');
    const initial=sends[0]!.body.data;
    const parallel=await Promise.all(Array.from({length:10},(_,i)=>request(app).post(`/api/conversations/${direct.id}/messages`).set('Authorization',auth(i%2?alice:bob)).send({client_message_id:randomUUID(),body:`Parallel ${i}`}).expect(200)));
    assert.equal(new Set(parallel.map(r=>r.body.data.seq)).size,10);
    const history=await request(app).get(`/api/conversations/${direct.id}/messages?after_seq=0&limit=5`).set('Authorization',auth(bob)).expect(200);
    assert.deepEqual(history.body.data.map((m:any)=>m.seq),[1,2,3,4,5]);
    assert.equal(history.body.next_cursor,5);
    await request(app).patch(`/api/messages/${initial.id}`).set('Authorization',auth(bob)).send({body:'Forged'}).expect(403);
    await request(app).patch(`/api/messages/${initial.id}`).set('Authorization',auth(alice)).send({body:'Edited searchable message'}).expect(200);
    const search=await request(app).get(`/api/conversations/${direct.id}/messages/search?q=searchable`).set('Authorization',auth(bob)).expect(200);
    assert.equal(search.body.data[0].id,initial.id);
    await request(app).post(`/api/messages/${initial.id}/reactions`).set('Authorization',auth(bob)).send({emoji:'👍'}).expect(200);
    await request(app).post(`/api/conversations/${direct.id}/read`).set('Authorization',auth(bob)).send({seq:11}).expect(200);
    const upload=await request(app).post(`/api/conversations/${direct.id}/attachments`).set('Authorization',auth(alice)).attach('file',Buffer.from('Test attachment'),'test.txt').expect(201);
    objectKeys.push(upload.body.data.object_key);
    await request(app).get(`/api/attachments/${upload.body.data.id}/url`).set('Authorization',auth(bob)).expect(404);
    const attached=await request(app).post(`/api/conversations/${direct.id}/messages`).set('Authorization',auth(alice)).send({client_message_id:randomUUID(),attachment_ids:[upload.body.data.id]}).expect(200);
    const signed=await request(app).get(`/api/attachments/${upload.body.data.id}/url`).set('Authorization',auth(bob)).expect(200);
    const download=await fetch(signed.body.data.signedUrl);
    assert.equal(await download.text(),'Test attachment');
    await request(app).delete(`/api/messages/${attached.body.data.id}`).set('Authorization',auth(alice)).expect(200);
    await request(app).get(`/api/attachments/${upload.body.data.id}/url`).set('Authorization',auth(bob)).expect(404);
    const group=(await request(app).post('/api/conversations/groups').set('Authorization',auth(alice)).send({title:'Live group',member_ids:[bob.id,eve.id]}).expect(201)).body.data;
    await request(app).delete(`/api/conversations/${group.id}/members/${eve.id}`).set('Authorization',auth(alice)).expect(200);
    await request(app).get(`/api/conversations/${group.id}`).set('Authorization',auth(eve)).expect(404);
    // SQL-backed fixture cleanup uses the owning user's Storage API, before logout revokes it.
    await cleanupFiles();
    await request(app).post('/api/auth/logout').set('Authorization',auth(alice)).send({refresh_token:alice.refresh}).expect(204);
    await request(app).get('/api/auth/me').set('Authorization',auth(alice)).expect(401);
    // Also prove that the Supabase Data API itself applies RLS, independently of Express.
    const outsider=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:auth(eve)}},auth:{persistSession:false}});
    const rows=await outsider.from('messages').select('id').eq('conversation_id',direct.id);
    assert.equal(rows.error,null);assert.deepEqual(rows.data,[]);
  } finally {
    socket?.disconnect();
    const cleanupErrors:string[]=[];
    try {
      try { await cleanupFiles(); } catch { cleanupErrors.push('files'); }
      if(admin) {
        if(users.length && (await admin.from('conversations').delete().in('created_by',users.map(u=>u.id))).error) cleanupErrors.push('conversations');
        for(const user of users) if((await admin.auth.admin.deleteUser(user.id)).error) cleanupErrors.push('user');
      } else { try { await sql!.cleanupUsers(users.map(u=>u.id)); } catch { cleanupErrors.push('users_or_conversations'); } }
    } finally {
      await sql?.close();
      await new Promise<void>(resolve=>realtime.close(()=>resolve()));
    }
    assert.deepEqual(cleanupErrors,[], 'Disposable integration-test cleanup failed.');
  }
});
