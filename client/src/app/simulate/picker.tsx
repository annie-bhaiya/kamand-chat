'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import type { AuthSession } from '@/types/chat';

type Account = { username: string; email: string; name: string; role: string; rooms: string[] };
export default function SimulationPicker() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.request<Account[]>('/api/simulate').then(response => { if (active) setAccounts(response.data); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function signIn(username: string) {
    setBusy(username); setError('');
    try {
      const response = await api.request<{ session: AuthSession }>('/api/simulate', { method: 'POST', body: JSON.stringify({ username }) });
      if (!response.data.session) throw new Error('No session returned. Run the seed script and retry.');

      socketManager.disconnect();
      api.setSession(response.data.session);
      // A full remount clears the previous user's chat context after a role switch.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/');
    } catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed.'); setBusy(null); }
  }
  const filtered = accounts.filter(account => `${account.name} ${account.username} ${account.role} ${account.rooms.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="simulation-page">
    <Link href="/" className="btn btn-ghost">Back to Kamand Chat</Link>
    <h1>Test a campus role</h1>
    <p className="simulation-intro">Development only. Choose a demo account to test its rooms, student membership and campus tools.</p>
    <label htmlFor="account-search">Find an account or room</label>
    <input id="account-search" className="input-control" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search clubs, hostels, messes or students" />
    {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
    {loading ? <p role="status">Loading demo accounts…</p> : !filtered.length ? <p>No accounts match this search.</p> :
      <ul className="simulation-accounts">{filtered.map(account => <li key={account.username}>
        <div><h2>{account.name}</h2><p>{account.role} · @{account.username}</p><p>{account.rooms.length ? account.rooms.join(', ') : 'Student access · use this account to test adding and removing members'}</p></div>
        <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => signIn(account.username)}>{busy === account.username ? 'Signing in…' : 'Sign in'}</button>
      </li>)}</ul>}
  </main>;
}
