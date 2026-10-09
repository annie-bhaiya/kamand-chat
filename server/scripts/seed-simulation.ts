import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createDatabaseClient } from './database.js';
import { CAMPUS_ROOMS } from '../src/campus-data.js';
import { simulationFile, type SimulationAccount } from '../src/simulation.js';

if (process.env.NODE_ENV !== 'development') throw new Error('Simulation seeding requires NODE_ENV=development.');
const previous: SimulationAccount[] = await readFile(simulationFile, 'utf8').then(text => JSON.parse(text).accounts).catch(() => []);
const definitions: Omit<SimulationAccount, 'password' | 'email'>[] = [];
for (const room of CAMPUS_ROOMS.filter(room => room.category === 'clubs')) {
  definitions.push({ username: `demo_coord_${room.slug.replaceAll('-', '_')}`, name: `${room.name} Coordinator (Demo)`, role: 'Club coordinator', rooms: [room.slug] });
}
const clusters = [...new Set(CAMPUS_ROOMS.filter(room => room.category === 'hostels').map(room => room.hostelCluster || room.name))];
for (const cluster of clusters) {
  definitions.push({ username: `demo_care_${cluster.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name: `${cluster} Caretaker (Demo)`, role: 'Hostel caretaker', rooms: CAMPUS_ROOMS.filter(room => room.category === 'hostels' && (room.hostelCluster || room.name) === cluster).map(room => room.slug) });
}
for (const room of CAMPUS_ROOMS.filter(room => room.category === 'messes')) {
  definitions.push({ username: `demo_manager_${room.slug.replaceAll('-', '_')}`, name: `${room.name} Manager (Demo)`, role: 'Mess manager', rooms: [room.slug] });
}
for (let i = 1; i <= 3; i++) definitions.push({ username: `demo_student_${i}`, name: `Demo Student ${i}`, role: 'Student', rooms: [] });
const accounts: SimulationAccount[] = definitions.map(item => ({ ...item, email: `${item.username}@simulation.invalid`, password: previous.find(account => account.username === item.username)?.password || randomBytes(18).toString('base64url') }));
const db = await createDatabaseClient();
try {
  await db.connect();
  await db.query('begin');
  for (const account of accounts) {
    const found = (await db.query('select id,raw_app_meta_data from auth.users where email=$1', [account.email])).rows[0];
    if (found && found.raw_app_meta_data?.simulation !== true) throw new Error('Refusing to overwrite a non-demo account.');
    const id = found?.id || randomUUID();
    const appMetadata = JSON.stringify({ provider: 'email', providers: ['email'], simulation: true, campus_rooms: account.rooms });
    if (!found) {
      // Development fixture only; the Auth schema was checked against this project's version.
      await db.query(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
        values('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt($3,extensions.gen_salt('bf')),now(),$4,$5,now(),now(),'','','','')`, [id, account.email, account.password, appMetadata, JSON.stringify({ display_name: account.name })]);
      await db.query(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values($1,$2,$3,'email',now(),now())`, [id, id, JSON.stringify({ sub: id, email: account.email, email_verified: true, phone_verified: false })]);
    } else await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [id, appMetadata]);
    await db.query("update public.profiles set username=$2,display_name=$3,hostel='Parashar',hostel_block='P2',branch='btech-cse',mess='Pine Mess',chat_only=false where id=$1", [id, account.username, account.name]);
    for (const slug of account.rooms) {
      let room = (await db.query('select * from private.campus_rooms where slug=$1 for update', [slug])).rows[0];
      if (!room) throw new Error(`Catalogue entry missing: ${slug}`);
      if (!room.conversation_id) {
        const conversation = (await db.query("insert into public.conversations(type,title,created_by,campus_room_slug) values('group',$1,$2,$3) returning id", [room.title, id, slug])).rows[0];
        await db.query('update private.campus_rooms set conversation_id=$2 where slug=$1', [slug, conversation.id]);
        room.conversation_id = conversation.id;
      }
      await db.query("insert into public.conversation_members(conversation_id,user_id,role) values($1,$2,'owner') on conflict(conversation_id,user_id) do update set role='owner',left_at=null", [room.conversation_id, id]);
    }
  }
  // Save before committing, so a file-write failure never creates inaccessible credentials.
  await writeFile(simulationFile, JSON.stringify({ note: 'Development dummy accounts. Open http://localhost:3000/simulate. Username is the selector; email/password also work through normal sign-in. Do not commit this file.', accounts }, null, 2) + '\n');
  await db.query('commit');
  console.log(`Seeded ${accounts.length} accounts. Credentials: ${simulationFile}`);
} catch (error) { await db.query('rollback').catch(() => {}); throw error; }
finally { await db.end(); }
