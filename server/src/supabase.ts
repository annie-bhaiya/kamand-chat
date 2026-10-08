import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';
import type { Config } from './config.js';
import { ApiError, unwrap } from './errors.js';

declare global {
  namespace Express {
    interface Request { db: SupabaseClient; user: User; accessToken: string; sessionId: string; }
  }
}
export type ClientFactory = (token?: string) => SupabaseClient;
export function createClientFactory(config: Config): ClientFactory {
  return (token?: string) => createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {}, fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
  });
}
// Only decode claims after Supabase has verified this token. Decoding is not authentication.
export function tokenClaims(token: string): { session_id?: string; exp?: number } {
  try { return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()); }
  catch { throw new ApiError(401, 'INVALID_TOKEN', 'Invalid access token.'); }
}
export async function authenticate(factory: ClientFactory, token: string) {
  const db = factory(token);
  const result = await db.auth.getUser(token);
  if (result.error || !result.data.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');
  const active = unwrap(await db.rpc('session_is_active'));
  const claims = tokenClaims(token);
  if (!active || !claims.session_id || !claims.exp || claims.exp * 1000 <= Date.now()) throw new ApiError(401, 'SESSION_EXPIRED', 'Please sign in again.');
  return { db, user: result.data.user, sessionId: claims.session_id, expiresAt: claims.exp * 1000 };
}
export function authMiddleware(factory: ClientFactory): RequestHandler {
  return async (req, _res, next) => {
    try {
      const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
      if (!match?.[1]) throw new ApiError(401, 'UNAUTHENTICATED', 'A Bearer access token is required.');
      const verified = await authenticate(factory, match[1]);
      Object.assign(req, verified, { accessToken: match[1] });
      next();
    } catch (error) { next(error); }
  };
}
