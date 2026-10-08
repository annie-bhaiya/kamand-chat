import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function unwrap<T extends { error: unknown; data?: unknown }>(result: T): T extends { data: infer D } ? D : undefined {
  if (!result.error) return result.data as T extends { data: infer D } ? D : undefined;
  const e = result.error as { code?: string; status?: number; message?: string };
  if (e.code === '23505') throw new ApiError(409, 'CONFLICT', 'This value already exists.');
  if (e.code === '42501' || e.code === 'PGRST301' || e.code === 'PGRST302') throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this resource.');
  if (e.code === 'P0002' || e.code === 'PGRST116') throw new ApiError(404, 'NOT_FOUND', 'Resource not found.');
  if (['22023', '23514', '23503'].includes(e.code ?? '')) throw new ApiError(400, 'INVALID_REQUEST', e.message ?? 'Invalid request.');
  if (e.code === 'over_email_send_rate_limit' || e.message?.toLowerCase().includes('email rate limit')) {
    throw new ApiError(429, 'EMAIL_RATE_LIMITED', 'Email rate limit reached for Supabase. Please wait a few minutes before trying again.');
  }
  if (e.status === 429) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again later.');
  if (e.status && e.status >= 400 && e.status < 500) throw new ApiError(e.status, 'SUPABASE_REQUEST_FAILED', e.message ?? 'Request failed.');
  console.error(JSON.stringify({ event: 'supabase_error', code: e.code ?? 'unknown' }));
  throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'The database or authentication service is unavailable.');
}
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: err.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }, request_id: res.locals.requestId });
    return;
  }
  if (err instanceof MulterError) {
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: err.code, message: 'Upload rejected. Check the file size and field name.' } });
    return;
  }
  if (err?.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } }); return; }
  if (err instanceof SyntaxError && 'body' in err) { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } }); return; }
  const known = err instanceof ApiError;
  if (!known) console.error(JSON.stringify({ event: 'request_error', request_id: res.locals.requestId, method: req.method, path: req.path }));
  res.status(known ? err.status : 500).json({ error: { code: known ? err.code : 'INTERNAL_ERROR', message: known ? err.message : 'An unexpected error occurred.' }, request_id: res.locals.requestId });
};
