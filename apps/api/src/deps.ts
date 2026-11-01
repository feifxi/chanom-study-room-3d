import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { AdminLive } from '@study/shared';
import type { Db } from '@study/db';
import type { AdminAuth } from './features/admin/auth';

/** What the routes need from the outside world; tests pass fakes. */
export interface ApiDeps {
  /** null when DATABASE_URL isn't set or Postgres is down: stats and feedback answer 503 */
  db: Db | null;
  auth: AdminAuth;
  /** Live rooms and head counts from the game server; null when it can't be reached */
  live: () => Promise<AdminLive | null>;
  /** Behind one reverse proxy (Caddy): the client address is the last X-Forwarded-For entry */
  trustProxy: boolean;
}

/** The caller's address, for rate limits and the admin login lockout. */
export function clientIp(c: Context, trustProxy: boolean) {
  if (trustProxy) {
    const last = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (last) return last;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown'; // app.request() in tests has no socket
  }
}
