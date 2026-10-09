import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { z } from 'zod';
import { ApiError, unwrap } from './errors.js';
import type { ClientFactory } from './supabase.js';

// Credentials live outside the checkout and are never part of a client bundle.
export const simulationFile = fileURLToPath(new URL('../../../chat-simulation-accounts.json', import.meta.url));
export interface SimulationAccount { username: string; email: string; password: string; name: string; role: string; rooms: string[] }
export async function simulationAccounts(): Promise<SimulationAccount[]> {
  try {
    const data = JSON.parse(await readFile(simulationFile, 'utf8'));
    return z.array(z.object({ username: z.string(), email: z.email().endsWith('@simulation.invalid'), password: z.string().min(12), name: z.string(), role: z.string(), rooms: z.array(z.string()) })).parse(data.accounts);
  } catch { throw new ApiError(503, 'SIMULATION_NOT_SEEDED', 'Run npm run seed:simulation in server first.'); }
}
export function simulationRoutes(factory: ClientFactory, accounts = simulationAccounts) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/', async (_req, res) => {
    res.json({ data: (await accounts()).map(({ password: _password, ...account }) => account) });
  });
  router.post('/', async (req, res) => {
    const { username } = z.object({ username: z.string().max(80) }).strict().parse(req.body);
    const account = (await accounts()).find(item => item.username === username);
    if (!account) throw new ApiError(404, 'NOT_FOUND', 'Choose a seeded simulation account.');
    const data = unwrap(await factory().auth.signInWithPassword({ email: account.email, password: account.password }));
    if (data.user?.app_metadata?.simulation !== true) throw new ApiError(403, 'FORBIDDEN', 'This account is not a simulation account.');
    res.json({ data });
  });
  return router;
}
