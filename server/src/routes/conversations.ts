import { Router } from 'express';
import { z } from 'zod';
import { ApiError, unwrap } from '../errors.js';
import { uuid, groupSchema, messageSchema, historySchema, sequence, limit, searchSchema, encodeActivityCursor, decodeActivityCursor } from '../validation.js';
import type { Events } from '../events.js';
import type { SupabaseClient } from '@supabase/supabase-js';
const messageFields = 'id,conversation_id,seq,sender_id,client_message_id,body,kind,created_at,edited_at,deleted_at,attachments(*),message_reactions(*)';

export async function requireConversation(db: SupabaseClient, id: string) {
  // Always consult caller-scoped RLS; a shared cache can leak rooms after removal or role switching.
  const conversation = unwrap(await db.from('conversations').select('*').eq('id', id).maybeSingle());
  if (!conversation) throw new ApiError(404, 'NOT_FOUND', 'Conversation not found.');
  return conversation;
}
export function conversationRoutes(events: Events) {
  const router = Router();
  router.get('/', async (req, res) => {
    const input = z.object({ cursor: z.string().max(512).optional(), limit }).strict().parse(req.query);
    // Filter through the caller's indexed membership, rather than scanning all conversations through RLS.
    let query = req.db.from('conversations').select('*,my_membership:conversation_members!inner(user_id,left_at),conversation_members(user_id,role,last_read_seq,left_at,profiles(id,username,display_name,avatar_key))').eq('my_membership.user_id', req.user.id).is('my_membership.left_at', null).order('last_activity_at', { ascending: false }).order('id', { ascending: false }).limit(input.limit + 1);
    if (input.cursor) {
      const cursor = decodeActivityCursor(input.cursor);
      query = query.or(`last_activity_at.lt.${cursor.at},and(last_activity_at.eq.${cursor.at},id.lt.${cursor.id})`);
    }
    const rows = unwrap(await query) ?? [];
    const data = rows.slice(0, input.limit).map(({ my_membership: _membership, ...conversation }) => conversation);
    const last = data.at(-1);
    res.json({ data, next_cursor: rows.length > input.limit && last ? encodeActivityCursor(last.last_activity_at, last.id) : null });
  });
  router.post('/direct', async (req, res) => {
    const input = z.object({ user_id: uuid }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('create_direct_conversation', { p_other_user: input.user_id }));
    const members = unwrap(await req.db.from('conversation_members').select('*,profiles(id,username,display_name,avatar_key)').eq('conversation_id', data.id)) ?? [];
    events.setMembers(data.id, members.map((m: any) => m.user_id));
    const convWithMembers = { ...data, members, conversation_members: members };
    void events.safely(() => events.conversation(req.db, data.id, 'conversation:updated', { conversation_id: data.id }));
    res.status(200).json({ data: convWithMembers });
  });
  router.post('/groups', async (req, res) => {
    const input = groupSchema.parse(req.body);
    const data = unwrap(await req.db.rpc('create_group_conversation', { p_title: input.title, p_members: input.member_ids }));
    events.setMembers(data.id, [req.user.id, ...input.member_ids]);
    void events.safely(() => events.conversation(req.db, data.id, 'conversation:updated', { conversation_id: data.id }));
    res.status(201).json({ data });
  });
  router.get('/:conversationId', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const conversation = await requireConversation(req.db, id);
    const members = unwrap(await req.db.from('conversation_members').select('*,profiles(id,username,display_name,avatar_key)').eq('conversation_id', id)) ?? [];
    events.setMembers(id, members.map((m: any) => m.user_id));
    res.json({ data: { ...conversation, members, conversation_members: members } });
  });
  router.patch('/:conversationId', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const input = z.object({ title: z.string().trim().min(1).max(120) }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('rename_group', { p_conversation: id, p_title: input.title }));
    void events.safely(() => events.conversation(req.db, id, 'conversation:updated', { conversation_id: id }));
    res.json({ data });
  });
  router.post('/:conversationId/members', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const input = z.object({ user_id: uuid }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('change_group_member', { p_conversation: id, p_user: input.user_id, p_remove: false }));
    events.invalidateMembers(id);
    void events.safely(() => events.conversation(req.db, id, 'conversation:updated', { conversation_id: id }));
    res.status(201).json({ data });
  });
  router.delete('/:conversationId/members/:userId', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const userId = uuid.parse(req.params.userId);
    events.invalidateMembers(id);
    const members = unwrap(await req.db.from('conversation_members').select('user_id').eq('conversation_id', id).is('left_at', null)) ?? [];
    const data = unwrap(await req.db.rpc('change_group_member', { p_conversation: id, p_user: userId, p_remove: true }));
    events.user(userId, 'conversation:removed', { conversation_id: id });
    // Self-leavers lose read permission immediately. Send a data-free refresh hint to remaining users.
    for (const member of members) if (member.user_id !== userId) events.user(member.user_id, 'conversation:updated', { conversation_id: id });
    res.json({ data });
  });
  router.get('/:conversationId/messages/search', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const input = searchSchema.parse(req.query);
    await requireConversation(req.db, id);
    let query = req.db.from('messages').select(messageFields).eq('conversation_id', id).is('deleted_at', null).textSearch('search_vector', input.q, { type: 'websearch', config: 'simple' }).order('seq', { ascending: false }).limit(input.limit + 1);
    if (input.before_seq !== undefined) query = query.lt('seq', input.before_seq);
    const rows = unwrap(await query) ?? [];
    const data = rows.slice(0, input.limit);
    res.json({ data, next_cursor: rows.length > input.limit ? data.at(-1)?.seq : null });
  });
  router.get('/:conversationId/attachments', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    await requireConversation(req.db, id);
    const rows = unwrap(
      await req.db
        .from('attachments')
        .select('*')
        .eq('conversation_id', id)
        .not('message_id', 'is', null)
        .order('created_at', { ascending: false })
    ) ?? [];
    res.json({ data: rows });
  });
  router.get('/:conversationId/messages', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const input = historySchema.parse(req.query);
    let query = req.db.from('messages').select(messageFields).eq('conversation_id', id).order('seq', { ascending: input.after_seq !== undefined }).limit(input.limit + 1);
    if (input.before_seq !== undefined) query = query.lt('seq', input.before_seq);
    if (input.after_seq !== undefined) query = query.gt('seq', input.after_seq);
    const rows = unwrap(await query) ?? [];
    // Only verify conversation existence if 0 messages returned on base load to ensure 404 for invalid IDs
    if (rows.length === 0 && input.before_seq === undefined && input.after_seq === undefined) {
      await requireConversation(req.db, id);
    }
    const data = rows.slice(0, input.limit);
    res.json({ data, next_cursor: rows.length > input.limit ? data.at(-1)?.seq : null });
  });
  router.post('/:conversationId/messages', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const input = messageSchema.parse(req.body);
    const data = unwrap(await req.db.rpc('send_message', { p_conversation: id, p_client_id: input.client_message_id, p_body: input.body, p_attachments: input.attachment_ids }));
    void events.safely(() => events.conversation(req.db, id, 'message:new', data));
    res.status(200).json({ data });
  });
  router.post('/:conversationId/read', async (req, res) => {
    const id = uuid.parse(req.params.conversationId);
    const input = z.object({ seq: sequence }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('mark_conversation_read', { p_conversation: id, p_seq: input.seq }));
    void events.safely(() => events.conversation(req.db, id, 'conversation:read', { conversation_id: id, user_id: req.user.id, last_read_seq: data.last_read_seq }));
    res.json({ data });
  });
  return router;
}
