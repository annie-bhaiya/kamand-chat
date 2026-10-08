import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

export async function createDatabaseClient() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in server/.env to connect to PostgreSQL.');
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL); }
  catch { throw new Error('DATABASE_URL must be a valid PostgreSQL connection string. URL-encode special characters in the password.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const ca = process.env.DATABASE_SSL_CA ? await readFile(process.env.DATABASE_SSL_CA, 'utf8') : undefined;
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return new pg.Client({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 15000, statement_timeout: 120000 });
}
