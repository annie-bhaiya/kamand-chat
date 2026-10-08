import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { z } from 'zod';
import { authenticate, type ClientFactory } from './supabase.js';
import { origins, type Config } from './config.js';
import { uuid } from './validation.js';
import { ApiError } from './errors.js';
import type { Events } from './events.js';
import { requireConversation } from './routes/conversations.js';

export function attachRealtime(http: HttpServer, config: Config, factory: ClientFactory, events: Events) {
  const io = new Server(http, { cors: { origin: origins(config) }, maxHttpBufferSize: 16384, allowRequest: (req, done) => done(null, !req.headers.origin || origins(config).includes(req.headers.origin)) });
  events.io = io;
  io.use(async (socket, next) => {
    try {
      const token = z.string().min(1).max(8192).parse(socket.handshake.auth.token);
      const verified = await authenticate(factory, token);
      Object.assign(socket.data, verified, { token });
      next();
    } catch { next(new Error('Authentication failed.')); }
  });
  io.on('connection', socket => {
    socket.join(`user:${socket.data.user.id}`);
    socket.join(`session:${socket.data.sessionId}`);
    const expiry = setTimeout(() => { socket.emit('session:expired'); socket.disconnect(true); }, Math.min(socket.data.expiresAt - Date.now(), 2147483647));
    let lastTypingAt = 0;
    socket.on('typing', async (payload, ack) => {
      try {
        if (Date.now() - lastTypingAt < 1000) throw new ApiError(429, 'RATE_LIMITED', 'Typing updates are limited to once per second.');
        lastTypingAt = Date.now();
        const input = z.object({ conversation_id: uuid, is_typing: z.boolean() }).strict().parse(payload);
        const verified = await authenticate(factory, socket.data.token);
        await requireConversation(verified.db, input.conversation_id);
        await events.conversation(verified.db, input.conversation_id, 'typing', { ...input, user_id: verified.user.id });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) { if (typeof ack === 'function') ack({ ok: false, error: error instanceof ApiError ? error.code : 'INVALID_REQUEST' }); }
    });
    // Supabase sign-out revokes refresh tokens. Check auth.sessions for externally revoked sessions too.
    const sessionCheck = setInterval(async () => {
      try { await authenticate(factory, socket.data.token); } catch { socket.disconnect(true); }
    }, 30000);
    socket.on('disconnect', () => { clearTimeout(expiry); clearInterval(sessionCheck); });
  });
  return io;
}
