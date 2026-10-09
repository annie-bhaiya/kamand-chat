import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient } from './database.js';

const client = await createDatabaseClient();
try {
  await client.connect();
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtextextended('first-commit-migrations',0))");
  await client.query('create schema if not exists supabase_migrations');
  await client.query('create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)');
  const directory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  for (const file of (await readdir(directory)).filter(x => /^\d+_.+\.sql$/.test(x)).sort()) {
    const version = file.split('_')[0]!;
    if ((await client.query('select version from supabase_migrations.schema_migrations where version=$1', [version])).rowCount) continue;
    const sql = await readFile(`${directory}/${file}`, 'utf8');
    await client.query(sql);
    await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)', [version, file.replace(/^\d+_/, '').replace(/\.sql$/, ''), [sql]]);
    console.log(`Applied ${file}`);
  }
  await client.query("NOTIFY pgrst, 'reload schema'");
  await client.query('commit');
  console.log('Database migrations are up to date and PostgREST schema reloaded.');
} catch (error) {
  await client.query('rollback').catch(() => {});
  // Do not log connection strings or passwords.
  const code = (error as { code?: string }).code ?? 'connection_or_sql_error';
  console.error(`Migration failed: ${code}`);
  if (['ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'].includes(code)) {
    console.error('If your Supabase direct database endpoint is IPv6-only, use the Session pooler connection string from the project Connect dialog on an IPv4-only network.');
  }
  process.exitCode = 1;
} finally { await client.end(); }
