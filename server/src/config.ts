import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  HOST: z.string().default('127.0.0.1'),
  CLIENT_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10).refine(value => {
    if (value.startsWith('sb_secret_')) return false;
    try { return JSON.parse(Buffer.from(value.split('.')[1] ?? '', 'base64url').toString()).role !== 'service_role'; }
    catch { return true; }
  }, 'Use a publishable key or legacy anon key for user-scoped database access.'),
  STORAGE_BUCKET: z.literal('chat-attachments').default('chat-attachments'),
  AVATARS_BUCKET: z.string().default('avatars'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(10485760).default(10485760),
  REDIS_URL: z.string().optional(),
});

export type Config = z.infer<typeof schema>;
export function loadConfig(env = process.env): Config {
  const parsed = schema.safeParse({ ...env, SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY });
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}. See .env.example.`);
  }
  return parsed.data;
}
export const origins = (config: Config) => config.CLIENT_ORIGINS.split(',').map(x => x.trim()).filter(Boolean);
