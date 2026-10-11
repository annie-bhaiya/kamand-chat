import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import { loadConfig } from '../src/config.js';
import { assistantRoutes } from '../src/routes/assistant.js';
import { errorHandler } from '../src/errors.js';

// Exercise the real request builder, provider, retries, tool results and reply validation.
// Isolated synthetic identity and data: never authenticate or mutate a real account.
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  Object.assign(req, { user: { id: 'gemini-protocol-check' }, accessToken: 'synthetic-token-not-used' });
  next();
});
app.use('/api/assistant', assistantRoutes(loadConfig(), {
  execute: async call => ({ name: call.name, ok: call.name.startsWith('get_'), status: call.name.startsWith('get_') ? 200 : 403,
    result: call.name.startsWith('get_') ? { data: [], fixture: 'Synthetic empty result for protocol verification.' } : { error: 'Only synthetic reads are allowed in this check.' } }),
}));
app.use(errorHandler);

const greeting = await request(app).post('/api/assistant').send({ message: 'Hello' });
console.log(JSON.stringify({ check: 'greeting', httpStatus: greeting.status, status: greeting.body.data?.status, errorCode: greeting.body.data?.errorCode }));
const toolRoundTrip = await request(app).post('/api/assistant').send({ message: 'Use the campus events tool to list upcoming campus events.' });
const data = toolRoundTrip.body.data;
const passed = greeting.body.data?.status === 'completed' && data?.status === 'completed' && data.actions.some((action: { name: string; ok: boolean }) => action.name === 'get__api_campus_events' && action.ok);
console.log(JSON.stringify({ check: 'tool-round-trip', httpStatus: toolRoundTrip.status, status: data?.status,
  actions: data?.actions?.map((action: { name: string; ok: boolean }) => ({ name: action.name, ok: action.ok })), errorCode: data?.errorCode, passed }));
if (!passed) process.exitCode = 1;
