import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { ClientFactory } from '../supabase.js';
import { authMiddleware, invalidateAuth } from '../supabase.js';
import { unwrap } from '../errors.js';
import { registerSchema, loginSchema, refreshSchema } from '../validation.js';
import type { Events } from '../events.js';

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const studentDirectory: Record<string, string> = {};
try {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const possiblePaths = [
    join(currentDir, '../../../client/users.json'),
    join(currentDir, '../../client/users.json'),
    join(process.cwd(), '../client/users.json'),
    join(process.cwd(), 'client/users.json'),
  ];
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.roll && item?.name) {
            studentDirectory[String(item.roll).toUpperCase()] = String(item.name);
          }
        }
      }
      break;
    }
  }
} catch {
  // Directory fallback is optional
}

export function authRoutes(factory: ClientFactory, events: Events, emailRedirectTo: string) {
  const router = Router();
  const limiter = process.env.NODE_ENV === 'development'
    ? (_req: any, _res: any, next: any) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 40,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' } }
      });
  router.post('/check', limiter, async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const result = unwrap(await factory().rpc('check_user_exists', { p_email: email }));
    res.json({ data: result });
  });
  router.post('/register', limiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const data = unwrap(await factory().auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo, data: { display_name: input.display_name } } }));
    res.status(201).json({ data: { user: data.user, session: data.session, requires_email_confirmation: !data.session } });
  });
  router.post('/login', limiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const client = factory();

    // Auto-detect if user exists in Supabase
    const checkResult = unwrap(await client.rpc('check_user_exists', { p_email: input.email }));
    const exists = Boolean(checkResult?.exists);
    const foundDisplayName = input.display_name || checkResult?.display_name;

    if (!exists) {
      // User is not created in Supabase yet.
      // Auto-detect and create user with that password, and trigger confirmation email.
      const rollMatch = input.email.match(/^([a-z0-9_]+)@students\.iitmandi\.ac\.in$/i);
      const rollNumber = rollMatch?.[1]?.toUpperCase();
      const displayName = foundDisplayName || (rollNumber ? (studentDirectory[rollNumber] || rollNumber) : 'Student');

      const signUpResult = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: {
            display_name: displayName,
            ...(rollNumber ? { username: rollNumber.toLowerCase() } : {}),
          },
        },
      });

      if (!signUpResult.error && signUpResult.data?.user) {
        // If identities is empty, the user already exists in auth.users, so attempt sign in
        if (signUpResult.data.user.identities && signUpResult.data.user.identities.length === 0) {
          const signInData = unwrap(await client.auth.signInWithPassword({ email: input.email, password: input.password }));
          res.json({ data: signInData });
          return;
        }

        res.status(200).json({
          data: {
            user: signUpResult.data.user,
            session: signUpResult.data.session,
            auto_created: true,
            requires_email_confirmation: !signUpResult.data.session,
          },
        });
        return;
      }

      // If user already registered in auth, fallback to signInWithPassword
      if (signUpResult.error && (signUpResult.error.message?.includes('already registered') || (signUpResult.error as any).code === 'user_already_exists')) {
        const signInData = unwrap(await client.auth.signInWithPassword({ email: input.email, password: input.password }));
        res.json({ data: signInData });
        return;
      }

      unwrap(signUpResult);
      return;
    }

    // User already exists in Supabase: login only!
    const data = unwrap(await client.auth.signInWithPassword({ email: input.email, password: input.password }));
    res.json({ data });
  });
  router.post('/refresh', limiter, async (req, res) => {
    const data = unwrap(await factory().auth.refreshSession(refreshSchema.parse(req.body)));
    res.json({ data });
  });
  router.post('/forgot-password', limiter, async (req, res) => {
    const { email } = z.object({ email: z.email().max(254) }).strict().parse(req.body);
    unwrap(await factory().auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo }));
    res.json({ data: { message: 'If an account exists, a password reset link has been sent.' } });
  });
  router.post('/reset-password', limiter, authMiddleware(factory), async (req, res) => {
    const input = refreshSchema.extend({ password: z.string().min(8).max(128) }).parse(req.body);
    const client = factory();
    unwrap(await client.auth.setSession({ access_token: req.accessToken, refresh_token: input.refresh_token }));
    unwrap(await client.auth.updateUser({ password: input.password }));
    invalidateAuth(req.accessToken);
    unwrap(await client.auth.signOut({ scope: 'local' }));
    events.logout(req.sessionId);
    res.status(204).end();
  });
  router.get('/me', authMiddleware(factory), async (req, res) => {
    const profile = unwrap(await req.db.from('profiles').select('*').eq('id', req.user.id).single());
    res.json({ data: { user: req.user, profile } });
  });
  router.post('/logout', authMiddleware(factory), async (req, res) => {
    const input = refreshSchema.parse(req.body);
    invalidateAuth(req.accessToken);
    // A separate client per request avoids sharing sessions between users.
    const client = factory();
    unwrap(await client.auth.setSession({ access_token: req.accessToken, refresh_token: input.refresh_token }));
    unwrap(await client.auth.signOut({ scope: 'local' }));
    events.logout(req.sessionId);
    res.status(204).end();
  });
  return router;
}
