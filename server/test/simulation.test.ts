import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { simulationRoutes } from '../src/simulation.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { errorHandler } from '../src/errors.js';
import type { ClientFactory } from '../src/supabase.js';

test('simulation routes are unavailable in production, test and unset modes', async () => {
  for (const NODE_ENV of ['production', 'test', undefined]) {
    const config = loadConfig({ NODE_ENV, SUPABASE_URL: 'http://localhost:54321', SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key' });
    const { app } = createApp(config);
    for (const route of ['/simulate', '/api/simulate']) {
      assert.equal((await request(app).get(route)).status, 404);
      assert.equal((await request(app).post(route).send({ username: 'demo_student_1' })).status, 404);
    }
  }
});

test('simulation exposes no passwords and signs in only an allowlisted demo account', async () => {
  let credentials: unknown;
  const factory = (() => ({ auth: { signInWithPassword: async (input: unknown) => {
    credentials = input;
    return { data: { user: { app_metadata: { simulation: true } }, session: { access_token: 'real-token' } }, error: null };
  } } })) as unknown as ClientFactory;
  const app = express(); app.use(express.json());
  app.use('/simulate', simulationRoutes(factory, async () => [{ username: 'demo_student_1', email: 'demo_student_1@simulation.invalid', password: 'test-secret-password', name: 'Student', role: 'Student', rooms: [] }]));
  app.use(errorHandler);
  const list = await request(app).get('/simulate');
  assert.equal(list.status, 200);
  assert.equal(list.headers['cache-control'], 'no-store');
  assert.equal(JSON.stringify(list.body).includes('test-secret-password'), false);
  assert.equal((await request(app).post('/simulate').send({ username: 'real_admin' })).status, 404);
  assert.equal(credentials, undefined);
  const signedIn = await request(app).post('/simulate').send({ username: 'demo_student_1' });
  assert.equal(signedIn.status, 200);
  assert.deepEqual(credentials, { email: 'demo_student_1@simulation.invalid', password: 'test-secret-password' });
  assert.equal(signedIn.body.data.session.access_token, 'real-token');
});
