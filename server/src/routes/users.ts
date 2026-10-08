import { Router } from 'express';
import { z } from 'zod';
import { unwrap, ApiError } from '../errors.js';
import { profileSchema, uuid, limit } from '../validation.js';

export function userRoutes() {
  const router = Router();
  router.get('/', async (req, res) => {
    const input = z.object({ q: z.string().trim().max(80).regex(/^[a-zA-Z0-9_ ]*$/).default(''), after_id: uuid.optional(), limit }).strict().parse(req.query);
    let query = req.db.from('profiles').select('id,username,display_name,avatar_key,created_at').neq('id', req.user.id).order('id').limit(input.limit + 1);
    if (input.q) query = query.or(`username.ilike.%${input.q}%,display_name.ilike.%${input.q}%`);
    if (input.after_id) query = query.gt('id', input.after_id);
    const rows = unwrap(await query) ?? [];
    const data = rows.slice(0, input.limit);
    res.json({ data, next_cursor: rows.length > input.limit ? data.at(-1)?.id : null });
  });
  router.patch('/me', async (req, res) => {
    const input = profileSchema.parse(req.body);
    const data = unwrap(await req.db.from('profiles').update(input).eq('id', req.user.id).select().single());
    res.json({ data });
  });
  router.get('/:userId', async (req, res) => {
    const id = uuid.parse(req.params.userId);
    const data = unwrap(await req.db.from('profiles').select('*').eq('id', id).maybeSingle());
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    res.json({ data });
  });
  return router;
}
