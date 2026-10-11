import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { assistantRoutes } from '../src/routes/assistant.js';
import { assistantTools, prepareTool, executeTool } from '../src/assistant-tools.js';
import { loadConfig } from '../src/config.js';
import { errorHandler } from '../src/errors.js';
import { createGeminiGenerator } from '../src/gemini.js';

const config = loadConfig({ NODE_ENV: 'test', SUPABASE_URL: 'http://localhost:54321', SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key' });
const tool = (path: string, method: string) => assistantTools.find(tool => tool.path === path && tool.method === method)!;
const messageTool = tool('/api/conversations/{conversationId}/messages', 'post');
const readTool = tool('/api/conversations', 'get');
const conversationId = randomUUID();
const call = { name: messageTool.name, args: { conversationId, body: { body: 'Hello', client_message_id: randomUUID() } } };
const final = { role: 'model', parts: [{ text: JSON.stringify({ message: 'Done.', suggestions: [] }) }] };

function fixture(responses: object[], failAfterWrite = false) {
  const writes: unknown[] = [], prompts: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, { user: { id: req.headers['x-user'] || 'owner' }, accessToken: 'user-token' }); next(); });
  app.use('/api/assistant', assistantRoutes(config, {
    generate: async body => { prompts.push(body); const response = responses.shift(); if (!response) throw new Error('Model unavailable'); return response as typeof final; },
    execute: async (action, _port, token) => { writes.push({ action, token }); return { name: action.name, ok: !failAfterWrite, status: failAfterWrite ? 403 : 200, result: { data: 'fixture' } }; },
  }));
  app.use(errorHandler);
  return { app, writes, prompts };
}

test('catalogue covers application actions without credential, upload or redirect tools', () => {
  assert.equal(loadConfig({ NODE_ENV: 'test', SUPABASE_URL: 'http://localhost:54321', SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key', GEMINI_API_KEY: '' }).GEMINI_API_KEY, undefined);
  assert(assistantTools.length >= 30);
  assert(assistantTools.every(tool => !tool.multipart && (!tool.path.includes('/auth/') || tool.path === '/api/auth/me')));
  assert(assistantTools.some(tool => tool.path === '/api/campus/rooms/{slug}/conversation'));
  assert(assistantTools.some(tool => tool.path === '/api/users/me/avatar' && tool.method === 'delete'));
});

test('tool preparation blocks unknown tools, path traversal and arbitrary query fields', () => {
  assert.throws(() => prepareTool({ name: 'shell', args: {} }));
  for (const value of ['..', '../auth/logout', '%2e%2e', 'x?y', 'x\\y']) assert.throws(() => prepareTool({ ...call, args: { ...call.args, conversationId: value } }));
  assert.throws(() => prepareTool({ name: readTool.name, args: { query: { redirect: 'https://example.com' } } }));
  assert.throws(() => prepareTool({ ...call, args: { ...call.args, host: 'https://example.com' } }));
  assert.match(prepareTool(call).path, new RegExp(conversationId));
  assert.notEqual((prepareTool(call).body as { client_message_id: string }).client_message_id, call.args.body.client_message_id);
});

test('read tools run automatically and retain model thought signatures', async () => {
  const content = { role: 'model', parts: [{ functionCall: { name: readTool.name, args: {}, id: 'read-1' }, thoughtSignature: 'opaque-signature' }] };
  const { app, writes, prompts } = fixture([content, final]);
  const response = await request(app).post('/api/assistant').send({ message: 'List my chats' }).expect(200);
  assert.equal(response.body.data.status, 'completed');
  assert.equal(writes.length, 1);
  assert.match(JSON.stringify(prompts[1]), /opaque-signature/);
  assert.match(JSON.stringify(prompts[1]), /read-1/);
});

test('writes require approval; cross-user access, stale approvals and replay cannot execute', async () => {
  const { app, writes } = fixture([{ role: 'model', parts: [{ functionCall: call }] }, final]);
  const response = await request(app).post('/api/assistant').send({ message: 'Send Hello' }).expect(200);
  const { sessionId, approval } = response.body.data;
  assert.equal(response.body.data.status, 'confirmation_required');
  assert.equal(writes.length, 0);
  await request(app).post('/api/assistant').set('x-user', 'other').send({ sessionId, decision: 'confirm', approvalId: approval.id }).expect(404);
  const stale = await request(app).post('/api/assistant').send({ sessionId, decision: 'confirm', approvalId: randomUUID() });
  assert.equal(stale.body.data.status, 'error');
  assert.equal(writes.length, 0);
  const confirmed = await request(app).post('/api/assistant').send({ sessionId, decision: 'confirm', approvalId: approval.id });
  assert.equal(confirmed.body.data.actions[0].ok, true);
  assert.equal(writes.length, 1);
  await request(app).post('/api/assistant').send({ sessionId, decision: 'confirm', approvalId: approval.id });
  assert.equal(writes.length, 1);
});

test('cancel prevents execution, and a later provider failure retains completed actions', async () => {
  const cancelled = fixture([{ role: 'model', parts: [{ functionCall: call }] }, final]);
  const pending = (await request(cancelled.app).post('/api/assistant').send({ message: 'Send Hello' })).body.data;
  await request(cancelled.app).post('/api/assistant').send({ sessionId: pending.sessionId, decision: 'cancel', approvalId: pending.approval.id });
  assert.equal(cancelled.writes.length, 0);
  const failed = fixture([{ role: 'model', parts: [{ functionCall: call }] }]);
  const preview = (await request(failed.app).post('/api/assistant').send({ message: 'Send Hello' })).body.data;
  const response = await request(failed.app).post('/api/assistant').send({ sessionId: preview.sessionId, decision: 'confirm', approvalId: preview.approval.id });
  assert.equal(response.body.data.status, 'error');
  assert.equal(response.body.data.actions[0].ok, true);
  assert.equal(failed.writes.length, 1);
});

test('permission denials are structured failures; malformed inputs cannot supply tool history', async () => {
  const { app } = fixture([{ role: 'model', parts: [{ functionCall: { name: readTool.name, args: {} } }] }, final], true);
  const response = await request(app).post('/api/assistant').send({ message: 'List my chats' });
  assert.equal(response.body.data.actions[0].status, 403);
  assert.equal(response.body.data.actions[0].ok, false);
  await request(app).post('/api/assistant').send({ message: 'Hi', history: [{ role: 'model' }] }).expect(400);
  await request(app).post('/api/assistant').send({ message: 'Hi', decision: 'confirm' }).expect(400);
});

test('real executor forwards user token and normalizes API failures', async () => {
  const upstream = express(); upstream.use(express.json());
  upstream.get('/api/conversations', (req, res) => { assert.equal(req.headers.authorization, 'Bearer user-token'); res.status(403).json({ error: { message: 'Forbidden' } }); });
  const server = upstream.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  try {
    const result = await executeTool({ name: readTool.name, args: {} }, address.port, 'user-token', AbortSignal.timeout(5000));
    assert.equal(result.ok, false); assert.equal(result.status, 403);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('provider retries after an approved write never repeat the application action', async () => {
  const responses = [
    Response.json({ candidates: [{ content: { role: 'model', parts: [{ functionCall: call }] } }] }),
    Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 }),
    Response.json({ candidates: [{ content: final }] }),
  ];
  let executions = 0, generations = 0;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, { user: { id: 'owner' }, accessToken: 'user-token' }); next(); });
  app.use('/api/assistant', assistantRoutes(config, {
    generate: createGeminiGenerator({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-3.8-flash' }, {
      fetch: (async () => { generations++; return responses.shift()!; }) as typeof fetch,
      wait: async () => {}, log: () => {},
    }),
    execute: async action => { executions++; return { name: action.name, ok: true, status: 200, result: { data: 'saved' } }; },
  }));
  app.use(errorHandler);
  const preview = (await request(app).post('/api/assistant').send({ message: 'Send Hello' })).body.data;
  assert.equal(executions, 0);
  const response = await request(app).post('/api/assistant').send({ sessionId: preview.sessionId, decision: 'confirm', approvalId: preview.approval.id });
  assert.equal(response.body.data.status, 'completed');
  assert.equal(response.body.data.actions.length, 1);
  assert.equal(executions, 1);
  assert.equal(generations, 3);
});
