import { z } from 'zod';
export const uuid = z.uuid().transform(value => value.toLowerCase());
export const sequence = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const limit = z.coerce.number().int().min(1).max(100).default(50);
export const registerSchema = z.object({ email: z.email().max(254), password: z.string().min(8).max(128), display_name: z.string().trim().min(1).max(80) }).strict();
export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128), display_name: z.string().trim().min(1).max(80).optional() }).strict();
export const refreshSchema = z.object({ refresh_token: z.string().min(1).max(4096) }).strict();
export const profileSchema = z.object({ username: z.string().regex(/^[a-z0-9_]{3,32}$/).optional(), display_name: z.string().trim().min(1).max(80).optional(), avatar_key: z.string().max(512).nullable().optional() }).strict().refine(x => Object.keys(x).length > 0, 'At least one field is required.');
export const messageSchema = z.object({ client_message_id: uuid, body: z.string().trim().max(10000).default(''), attachment_ids: z.array(uuid).max(10).default([]) }).strict().refine(x => x.body.length > 0 || x.attachment_ids.length > 0, 'A message needs text or attachments.');
export const groupSchema = z.object({ title: z.string().trim().min(1).max(120), member_ids: z.array(uuid).min(1).max(99) }).strict();
export const historySchema = z.object({ before_seq: sequence.optional(), after_seq: sequence.optional(), limit }).strict().refine(x => x.before_seq === undefined || x.after_seq === undefined, 'Use before_seq or after_seq, not both.');
export const reactionSchema = z.object({ emoji: z.string().trim().min(1).max(32) }).strict();
export const searchSchema = z.object({ q: z.string().trim().min(1).max(200), before_seq: sequence.optional(), limit }).strict();
const activityCursor = z.object({ at: z.iso.datetime({ offset: true }), id: uuid }).strict();
export function encodeActivityCursor(at: string, id: string) {
  return Buffer.from(JSON.stringify({ at, id })).toString('base64url');
}
export function decodeActivityCursor(cursor: string) {
  let data: unknown;
  try { data = JSON.parse(Buffer.from(cursor, 'base64url').toString()); } catch { data = null; }
  return activityCursor.parse(data);
}
