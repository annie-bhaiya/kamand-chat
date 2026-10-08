import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';
import { unwrap, ApiError } from '../errors.js';
import { uuid } from '../validation.js';
import { requireConversation } from './conversations.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'video/webm', 'video/mp4']);
export function attachmentRoutes(config: Config) {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 1 }, fileFilter: (_req, file, done) => {
    if (!allowedTypes.has(file.mimetype)) return done(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'This file type is not supported.'));
    done(null, true);
  } });
  router.post('/conversations/:conversationId/attachments', async (req, _res, next) => {
    await requireConversation(req.db, uuid.parse(req.params.conversationId));
    next();
  }, upload.single('file'), async (req, res) => {
    const conversationId = uuid.parse(req.params.conversationId);
    if (!req.file || !req.file.size) throw new ApiError(400, 'FILE_REQUIRED', 'Upload a non-empty file using the file field.');
    const id = randomUUID();
    const objectKey = `${conversationId}/${req.user.id}/${id}`;
    const storage = req.db.storage.from(config.STORAGE_BUCKET);
    unwrap(await storage.upload(objectKey, req.file.buffer, { contentType: req.file.mimetype, upsert: false }));
    try {
      const data = unwrap(await req.db.from('attachments').insert({ id, conversation_id: conversationId, uploader_id: req.user.id, object_key: objectKey, original_name: req.file.originalname.slice(0, 255), mime_type: req.file.mimetype, size_bytes: req.file.size }).select().single());
      res.status(201).json({ data });
    } catch (error) {
      await storage.remove([objectKey]);
      throw error;
    }
  });
  router.get('/attachments/:attachmentId/url', async (req, res) => {
    const id = uuid.parse(req.params.attachmentId);
    const data = unwrap(await req.db.from('attachments').select('*').eq('id', id).maybeSingle());
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Attachment not found.');
    const signed = unwrap(await req.db.storage.from(config.STORAGE_BUCKET).createSignedUrl(data.object_key, 60, { download: data.original_name }));
    res.json({ data: { ...signed, expires_in: 60 } });
  });
  router.delete('/attachments/:attachmentId', async (req, res) => {
    const id = uuid.parse(req.params.attachmentId);
    const data = unwrap(await req.db.from('attachments').select('*').eq('id', id).maybeSingle());
    if (!data || data.uploader_id !== req.user.id || data.message_id) throw new ApiError(404, 'NOT_FOUND', 'Draft attachment not found.');
    // Delete the draft row first to arbitrate against a concurrent send linking this upload.
    const removed = unwrap(await req.db.from('attachments').delete().eq('id', id).is('message_id', null).select('id'));
    if (!removed?.length) throw new ApiError(409, 'CONFLICT', 'The attachment has already been sent.');
    unwrap(await req.db.storage.from(config.STORAGE_BUCKET).remove([data.object_key]));
    res.status(204).end();
  });
  return router;
}
