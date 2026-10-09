import { Router } from 'express';
import { z } from 'zod';
import { unwrap } from '../errors.js';
import { uuid, reactionSchema } from '../validation.js';
import type { Events } from '../events.js';

export function messageRoutes(events: Events) {
  const router = Router();
  router.patch('/:messageId', async (req, res) => {
    const id = uuid.parse(req.params.messageId);
    const input = z.object({ body: z.string().trim().min(1).max(10000) }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('edit_message', { p_message: id, p_body: input.body }));
    void events.safely(() => events.conversation(req.db, data.conversation_id, 'message:updated', data));
    res.json({ data });
  });
  router.delete('/:messageId', async (req, res) => {
    const id = uuid.parse(req.params.messageId);
    const data = unwrap(await req.db.rpc('delete_message', { p_message: id }));
    void events.safely(() => events.conversation(req.db, data.conversation_id, 'message:deleted', data));
    res.json({ data });
  });
  const react = (remove: boolean) => async (req: import('express').Request, res: import('express').Response) => {
    const id = uuid.parse(req.params.messageId);
    const input = reactionSchema.parse(req.body);
    const data = unwrap(await req.db.rpc('react_to_message', { p_message: id, p_emoji: input.emoji, p_remove: remove }));
    void events.safely(() => events.conversation(req.db, data.conversation_id, 'message:reaction', { message_id: id, user_id: req.user.id, emoji: input.emoji, removed: remove }));
    res.json({ data });
  };
  router.post('/:messageId/reactions', react(false));
  router.delete('/:messageId/reactions', react(true));
  return router;
}
