import { describe, expect, it } from 'vitest';
import type { AdminLive } from '@study/shared';
import { createApp } from './app';
import type { ApiDeps } from './deps';
import { AdminAuth } from './features/admin/auth';
import { metrics } from './metrics';

const LIVE: AdminLive = { online: 2, peakOnline: 5, rooms: [{ label: 'Library #1', clients: 2, maxClients: 20, npcs: 3 }] };

/** No database: the paths that don't need Postgres (auth, validation, the 503s) are what's tested here. */
const make = (over: Partial<ApiDeps> = {}) =>
  createApp({ db: null, auth: new AdminAuth('s3cret'), live: async () => LIVE, trustProxy: false, ...over }).app;

const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function signIn(app: ReturnType<typeof make>) {
  const res = await app.request('/api/admin/login', json({ password: 's3cret' }));
  expect(res.status).toBe(200);
  const cookie = res.headers.get('set-cookie')!;
  expect(cookie).toMatch(/chanom_admin=.+; Max-Age=604800; Path=\/api; HttpOnly; SameSite=Lax/);
  return cookie.split(';')[0]!;
}

describe('API', () => {
  it('reports health and whether the database is on', async () => {
    const res = await make().request('/api/health');
    expect(await res.json()).toEqual({ ok: true, db: false });
  });

  it('answers 503 for stats, leaderboard and feedback without a database', async () => {
    const app = make();
    expect((await app.request('/api/stats/visitor-123')).status).toBe(503);
    expect((await app.request('/api/leaderboard?period=week')).status).toBe(503);
    expect((await app.request('/api/feedback', json({ rating: 5 }))).status).toBe(503);
  });

  it('serves metrics outside /api only', async () => {
    const app = make();
    expect((await app.request('/metrics')).headers.get('content-type')).toContain('text/plain');
    expect((await app.request('/api/metrics')).status).toBe(404);
  });

  it('labels metrics with the route pattern, and unknown paths as unmatched', async () => {
    const app = make();
    await app.request('/api/stats/visitor-123');
    await app.request('/wp-login.php');
    const series = (await metrics.httpRequests.get()).values.map((v) => v.labels.route);
    expect(series).toContain('/api/stats/:visitorId');
    expect(series).toContain('unmatched');
    expect(series).not.toContain('/api/stats/visitor-123');
  });
});

describe('admin', () => {
  it('needs a session', async () => {
    const app = make();
    expect((await app.request('/api/admin/overview')).status).toBe(401);
    expect((await app.request('/api/admin/feedback.csv')).status).toBe(401);
    expect((await app.request('/api/admin/feedback/1', { method: 'DELETE' })).status).toBe(401);
  });

  it('is off without a password', async () => {
    const app = make({ auth: new AdminAuth('') });
    expect((await app.request('/api/admin/login', json({ password: '' }))).status).toBe(503);
    expect((await app.request('/api/admin/overview')).status).toBe(503);
  });

  it('rejects a wrong password and a malformed body', async () => {
    const app = make();
    expect((await app.request('/api/admin/login', json({ password: 'nope' }))).status).toBe(401);
    expect((await app.request('/api/admin/login', { method: 'POST', body: 'not json' })).status).toBe(401);
  });

  it('signs in and shows the overview with live data from the game server', async () => {
    const app = make();
    const cookie = await signIn(app);
    const res = await app.request('/api/admin/overview', { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ live: LIVE, summary: null, feedback: [] });
  });

  it('still shows the overview when the game server is down', async () => {
    const app = make({ live: async () => null });
    const cookie = await signIn(app);
    expect(await (await app.request('/api/admin/overview', { headers: { cookie } })).json()).toMatchObject({ live: null });
  });

  it('exports an empty CSV with a header', async () => {
    const app = make();
    const res = await app.request('/api/admin/feedback.csv', { headers: { cookie: await signIn(app) } });
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(await res.text()).toMatch(/^createdAt,rating,tags/);
  });

  it('locks an address out after five wrong passwords, using the proxy address when trusted', async () => {
    const app = make({ trustProxy: true });
    const from = (ip: string, password: string) =>
      app.request('/api/admin/login', { ...json({ password }), headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip } });
    for (let i = 0; i < 5; i++) await from('203.0.113.7', 'wrong');
    expect((await from('203.0.113.7', 's3cret')).status).toBe(429);
    expect((await from('203.0.113.8', 's3cret')).status).toBe(200);
  });
});
