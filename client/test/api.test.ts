import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/lib/api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let client: ApiClient;
beforeEach(() => { localStorage.clear(); client = new ApiClient(); });

describe('session lifecycle', () => {
  it('persists a session returned by registration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ data: { user: { id: 'student' }, session: { access_token: 'access', refresh_token: 'refresh' } } })));
    await client.register({ email: 'student@example.test', password: 'password', display_name: 'Student' });
    expect(client.getAccessToken()).toBe('access');
    expect(localStorage.getItem('fc_refresh_token')).toBe('refresh');
  });
  it('deduplicates simultaneous refresh requests and rotates both tokens', async () => {
    client.setSession({ access_token: 'expired', refresh_token: 'old-refresh' });
    const fetch = vi.fn().mockResolvedValue(json({ data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } } }));
    vi.stubGlobal('fetch', fetch);
    expect(await Promise.all([client.refreshTokenIfNeeded(), client.refreshTokenIfNeeded()])).toEqual(['new-access', 'new-access']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getRefreshToken()).toBe('new-refresh');
  });
  it('does not resurrect a session when refresh finishes after logout', async () => {
    client.setSession({ access_token: 'expired', refresh_token: 'old-refresh' });
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    const refresh = client.refreshTokenIfNeeded();
    client.setSession(null);
    finish(json({ data: { session: { access_token: 'late', refresh_token: 'late-refresh' } } }));
    expect(await refresh).toBeNull();
    expect(client.getAccessToken()).toBeNull();
  });
  it('retains the session on a temporary refresh service failure', async () => {
    client.setSession({ access_token: 'access', refresh_token: 'refresh' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 503)));
    await client.refreshTokenIfNeeded();
    expect(client.getRefreshToken()).toBe('refresh');
  });
  it('retries a protected request with the refreshed access token', async () => {
    client.setSession({ access_token: 'expired', refresh_token: 'refresh' });
    const fetch = vi.fn().mockResolvedValueOnce(json({ error: { message: 'Expired' } }, 401))
      .mockResolvedValueOnce(json({ data: { session: { access_token: 'new', refresh_token: 'rotated' } } }))
      .mockResolvedValueOnce(json({ data: [] }));
    vi.stubGlobal('fetch', fetch);
    await client.getConversations();
    expect(new Headers(fetch.mock.calls[2][1].headers).get('Authorization')).toBe('Bearer new');
  });
  it('continues in memory when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    expect(() => client.setSession({ access_token: 'access', refresh_token: 'refresh' })).not.toThrow();
    expect(client.getAccessToken()).toBe('access');
  });
});
