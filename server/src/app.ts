import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import type { Config } from './config.js';
import { origins } from './config.js';
import { createClientFactory, authMiddleware, optionalAuthMiddleware, type ClientFactory } from './supabase.js';
import { ApiError, errorHandler } from './errors.js';
import { Events } from './events.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { conversationRoutes } from './routes/conversations.js';
import { messageRoutes } from './routes/messages.js';
import { attachmentRoutes } from './routes/attachments.js';
import { campusRoutes } from './routes/campus.js';
import { openapi } from './openapi.js';

export function createApp(config: Config, options: { factory?: ClientFactory; events?: Events } = {}) {
  const app = express();
  const factory = options.factory ?? createClientFactory(config);
  const events = options.events ?? new Events();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.use(helmet());
  app.use((_req, res, next) => { res.locals.requestId = randomUUID(); res.setHeader('X-Request-ID', res.locals.requestId); next(); });
  app.use(cors({ origin: (origin, callback) => callback(origin && !origins(config).includes(origin) ? new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.') : null, true) }));
  app.use(express.json({ limit: '128kb' }));
  app.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.get('/openapi.json', (_req, res) => res.json(openapi));
  app.get('/ready', async (_req, res) => {
    // A deliberately public, fixed-value function checks the migration and Data API without exposing data.
    const { data, error } = await factory().rpc('chat_health');
    res.status(error || data !== 'ok' ? 503 : 200).json({ data: { status: error || data !== 'ok' ? 'unavailable' : 'ready' } });
  });
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  if (config.NODE_ENV !== 'development') {
    app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } } }));
  }
  app.use('/api/auth', authRoutes(factory, events));
  app.use('/api/campus', optionalAuthMiddleware(factory), campusRoutes(factory, events));
  app.use('/api', authMiddleware(factory));
  app.use('/api/users', userRoutes());
  app.use('/api/conversations', conversationRoutes(events));
  app.use('/api/messages', messageRoutes(events));
  app.use('/api', attachmentRoutes(config));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found.')));
  app.use(errorHandler);
  return { app, factory, events };
}
