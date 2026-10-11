import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiGenerator } from '../src/gemini.js';
import { ApiError } from '../src/errors.js';

const config = { GEMINI_API_KEY: 'test-private-key', GEMINI_MODEL: 'gemini-3.8-flash' };
const content = { role: 'model', parts: [{ text: '{"message":"Hello","suggestions":[]}', thoughtSignature: 'opaque' }] };
const success = () => Response.json({ candidates: [{ content }] });
const signal = () => AbortSignal.timeout(5000);

test('temporary Gemini errors retry unchanged generation and retain thought signatures', async () => {
  const requests: RequestInit[] = [], waits: number[] = [], logs: unknown[] = [];
  const responses = [Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 }), Response.json({}, { status: 502 }), success()];
  const generate = createGeminiGenerator(config, {
    fetch: (async (_url, init) => { requests.push(init!); return responses.shift()!; }) as typeof fetch,
    wait: async milliseconds => { waits.push(milliseconds); }, log: event => { logs.push(event); },
  });
  assert.deepEqual(await generate({ contents: [{ role: 'user', parts: [{ text: 'private user request' }] }] }, signal()), content);
  assert.equal(requests.length, 3);
  assert.deepEqual(waits, [750, 1500]);
  assert(requests.every(request => request.body === requests[0]!.body));
  assert.equal((requests[0]!.headers as Record<string, string>)['x-goog-api-key'], config.GEMINI_API_KEY);
  assert(!JSON.stringify(logs).includes(config.GEMINI_API_KEY));
  assert(!JSON.stringify(logs).includes('private user request'));
});

test('exhausted temporary failures report availability, not invalid credentials', async () => {
  let count = 0;
  const generate = createGeminiGenerator(config, {
    fetch: (async () => { count++; return Response.json({ error: { message: 'overloaded' } }, { status: 503 }); }) as typeof fetch,
    wait: async () => {}, log: () => {},
  });
  await assert.rejects(generate({}, signal()), error => error instanceof ApiError && error.code === 'GEMINI_UNAVAILABLE' && !error.message.includes('key'));
  assert.equal(count, 3);
});

test('invalid keys, permissions, models, schemas and quota are distinct non-retryable errors', async () => {
  const cases = [
    { status: 400, payload: { error: { details: [{ reason: 'API_KEY_INVALID' }], message: config.GEMINI_API_KEY } }, code: 'GEMINI_AUTH_ERROR' },
    { status: 403, payload: {}, code: 'GEMINI_PERMISSION_ERROR' },
    { status: 404, payload: {}, code: 'GEMINI_MODEL_UNAVAILABLE' },
    { status: 400, payload: {}, code: 'GEMINI_INVALID_REQUEST' },
    { status: 429, payload: {}, code: 'GEMINI_QUOTA' },
  ];
  for (const scenario of cases) {
    let count = 0;
    const logs: unknown[] = [];
    const generate = createGeminiGenerator(config, {
      fetch: (async () => { count++; return Response.json(scenario.payload, { status: scenario.status }); }) as typeof fetch,
      wait: async () => { assert.fail('Must not retry this rejection'); }, log: event => { logs.push(event); },
    });
    await assert.rejects(generate({}, signal()), error => error instanceof ApiError && error.code === scenario.code && !error.message.includes(config.GEMINI_API_KEY));
    assert.equal(count, 1);
    assert(!JSON.stringify(logs).includes(config.GEMINI_API_KEY));
  }
});

test('transport failure retries safely; abort stops the retry loop', async () => {
  let calls = 0;
  const generate = createGeminiGenerator(config, {
    fetch: (async () => { if (++calls === 1) throw new TypeError('fetch failed'); return success(); }) as typeof fetch,
    wait: async () => {}, log: () => {},
  });
  assert.deepEqual(await generate({}, signal()), content);
  assert.equal(calls, 2);
  const controller = new AbortController();
  const aborted = createGeminiGenerator(config, {
    fetch: (async () => { controller.abort(); throw new TypeError('fetch failed'); }) as typeof fetch,
    wait: async () => { assert.fail('Aborted generation must not retry'); }, log: () => {},
  });
  await assert.rejects(aborted({}, controller.signal), error => error instanceof ApiError && error.code === 'ASSISTANT_UNAVAILABLE');
});

test('successful but empty provider output is not retried', async () => {
  let calls = 0;
  const generate = createGeminiGenerator(config, {
    fetch: (async () => { calls++; return Response.json({ candidates: [] }); }) as typeof fetch,
    wait: async () => { assert.fail('Empty output must not retry'); }, log: () => {},
  });
  await assert.rejects(generate({}, signal()), error => error instanceof ApiError && error.code === 'ASSISTANT_EMPTY');
  assert.equal(calls, 1);
});
