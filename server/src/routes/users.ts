import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { unwrap, ApiError } from '../errors.js';
import { profileSchema, uuid, limit } from '../validation.js';

const allowedMimes = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, done) => {
    if (!allowedMimes.has(file.mimetype)) {
      return done(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only JPG, PNG, WebP, and GIF images are allowed.'));
    }
    done(null, true);
  },
});

export async function handleGetAvatar(req: import('express').Request, res: import('express').Response) {
  const id = uuid.parse(req.params.userId);
  if (!req.db) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Database client unavailable.');
  }

  // Check user profile for existing avatar_key
  const profile = unwrap(await req.db.from('profiles').select('avatar_key').eq('id', id).maybeSingle());
  if (profile?.avatar_key) {
    return res.redirect(profile.avatar_key);
  }

  throw new ApiError(404, 'NOT_FOUND', 'Avatar not found.');
}

export function publicUserRoutes() {
  const router = Router();
  router.get('/:userId/avatar', handleGetAvatar);
  return router;
}

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

  // Upload profile photo directly to the Supabase storage bucket
  router.post('/me/avatar', avatarUpload.single('file'), async (req, res) => {
    if (!req.file || !req.file.size) {
      throw new ApiError(400, 'FILE_REQUIRED', 'Upload an image file using the file field.');
    }
    const ext = allowedMimes.get(req.file.mimetype) || 'jpg';
    const objectKey = `${req.user.id}/avatar.${ext}`;

    const storage = req.db.storage.from('avatars');
    const uploadRes = await storage.upload(objectKey, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });
    unwrap(uploadRes);

    const { data: publicUrlData } = storage.getPublicUrl(objectKey);
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const data = unwrap(
      await req.db.from('profiles').update({ avatar_key: avatarUrl }).eq('id', req.user.id).select().single()
    );
    res.json({ data: { ...data, avatar_key: avatarUrl } });
  });

  // Delete profile photo from Supabase storage bucket and clear avatar_key
  router.delete('/me/avatar', async (req, res) => {
    const storage = req.db.storage.from('avatars');
    const filesToRemove = Array.from(allowedMimes.values()).map(
      (ext) => `${req.user.id}/avatar.${ext}`
    );
    await storage.remove(filesToRemove).catch(() => {});

    const data = unwrap(
      await req.db.from('profiles').update({ avatar_key: null }).eq('id', req.user.id).select().single()
    );
    res.json({ data: { ...data, avatar_key: null } });
  });

  router.get('/:userId/avatar', handleGetAvatar);

  router.get('/:userId', async (req, res) => {
    const id = uuid.parse(req.params.userId);
    const data = unwrap(await req.db.from('profiles').select('*').eq('id', id).maybeSingle());
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    res.json({ data });
  });

  return router;
}
