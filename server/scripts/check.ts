import { loadConfig } from '../src/config.js';
import { createClientFactory } from '../src/supabase.js';
import { unwrap } from '../src/errors.js';

const config = loadConfig();
try {
  const result = unwrap(await createClientFactory(config)().rpc('chat_health'));
  if (result !== 'ok') throw new Error('Schema check failed.');
  const response = await fetch(`${config.SUPABASE_URL}/auth/v1/health`, { headers: { apikey: config.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Auth health returned ${response.status}.`);
  console.log('Supabase Data API, migration health function, and Auth are reachable.');
} catch {
  console.error('Supabase verification failed. Check SUPABASE_URL, the publishable key, and whether the migration has been applied.');
  process.exitCode = 1;
}
