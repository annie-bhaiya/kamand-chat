import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { attachRealtime } from './realtime.js';

const config = loadConfig();
const { app, factory, events } = createApp(config);
const http = createServer(app);
const io = attachRealtime(http, config, factory, events);
let closeRedis: (() => Promise<void>) | undefined;
if (config.REDIS_URL) {
  const [{ createAdapter }, { createClient }] = await Promise.all([import('@socket.io/redis-adapter'), import('redis')]);
  const publisher = createClient({ url: config.REDIS_URL });
  const subscriber = publisher.duplicate();
  publisher.on('error', () => console.error('Redis publisher unavailable.'));
  subscriber.on('error', () => console.error('Redis subscriber unavailable.'));
  await Promise.all([publisher.connect(), subscriber.connect()]);
  io.adapter(createAdapter(publisher, subscriber));
  closeRedis = async () => { await Promise.all([publisher.close(), subscriber.close()]); };
}
http.listen(config.PORT, config.HOST, () => console.log(`Chat API listening on http://${config.HOST}:${config.PORT}`));
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const timer = setTimeout(() => process.exit(1), 10000).unref();
  await new Promise<void>(resolve => io.close(() => resolve()));
  await closeRedis?.();
  clearTimeout(timer);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
