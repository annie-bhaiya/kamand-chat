import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '../scripts/database.js';

// Dedicated development-project fixtures only. Application request handlers never
// insert users into Auth tables; production registration always uses Supabase Auth.
export async function createSqlFixtures() {
  const db = await createDatabaseClient();
  await db.connect();
  return {
    async createUser(email: string, password: string, displayName: string) {
      const id = randomUUID();
      await db.query('begin');
      try {
        await db.query(`insert into auth.users (
          instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
          raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at,
          confirmation_token,recovery_token,email_change,email_change_token_new
        ) values ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,
          extensions.crypt($3,extensions.gen_salt('bf',10)),now(),
          '{"provider":"email","providers":["email"]}'::jsonb,$4::jsonb,false,now(),now(),'','','','')`,
          [id, email, password, JSON.stringify({ display_name: displayName })]);
        await db.query(`insert into auth.identities (provider_id,user_id,identity_data,provider,created_at,updated_at)
          values ($1::text,$1::text::uuid,$2::jsonb,'email',now(),now())`, [id,JSON.stringify({ sub:id,email,email_verified:true })]);
        await db.query('commit');
        return id;
      } catch(error) { await db.query('rollback'); throw error; }
    },
    async releaseFiles(keys: string[], users: string[]) {
      // Only remove metadata for this run's files. Their owner subsequently deletes
      // the actual objects through the authenticated Storage API while still a member.
      await db.query('delete from public.attachments where object_key=any($1::text[]) and uploader_id=any($2::uuid[])', [keys,users]);
    },
    async cleanupUsers(users: string[]) {
      await db.query('begin');
      try {
        await db.query('delete from public.conversations where created_by=any($1::uuid[])', [users]);
        await db.query('delete from auth.users where id=any($1::uuid[])', [users]);
        await db.query('commit');
      } catch(error) { await db.query('rollback'); throw error; }
    },
    async close() { await db.end(); },
  };
}
