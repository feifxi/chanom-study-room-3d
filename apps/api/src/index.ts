import { serve } from '@hono/node-server';
import { createDb, migrateDb } from '@study/db';
import { createApp } from './app';
import type { ApiDeps } from './deps';
import { AdminAuth } from './features/admin/auth';
import { gameLive } from './live';
import { log } from './log';

const PORT = Number(process.env.PORT ?? 2568);
const GAME_INTERNAL_URL = process.env.GAME_INTERNAL_URL ?? 'http://localhost:2567';

// The API owns the schema: it runs the migrations, and the game server only reads and writes rows.
// Postgres stays optional: without it stats and feedback answer 503 and the rooms still work.
async function connectDb(): Promise<ApiDeps['db']> {
  if (!process.env.DATABASE_URL) {
    log.info('db: DATABASE_URL not set, stats and feedback disabled');
    return null;
  }
  const { db, close } = createDb(process.env.DATABASE_URL);
  try {
    await migrateDb(db, process.env.MIGRATIONS_DIR);
    log.info('db: connected to Postgres, migrations applied');
    return db;
  } catch (err) {
    await close().catch(() => {});
    log.warn({ err }, 'db: Postgres unavailable; stats and feedback disabled');
    return null;
  }
}

const { app } = createApp({
  db: await connectDb(),
  auth: new AdminAuth(),
  live: gameLive(GAME_INTERNAL_URL),
  trustProxy: !!process.env.TRUST_PROXY,
});

const server = serve({ fetch: app.fetch, port: PORT }, () => log.info({ port: PORT }, 'api listening'));

// Docker stops containers with SIGTERM: finish in-flight requests, then exit
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
