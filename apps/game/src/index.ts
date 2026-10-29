import { defineRoom, defineServer, listen, matchMaker } from 'colyseus';
import { MIN_COUNTED_FOCUS_MIN, ROOM_NAME, type RoomListing } from '@study/shared';
import { createDb, getLeaderboard, getVisitorStats, migrateDb, recordFocus } from '@study/db';
import { StudyRoom, services, type StudyRoomMetadata } from './rooms/StudyRoom';
import { chaos, httpMetrics, metrics, metricsHandler } from './metrics';
import { log } from './log';
import { registerAdminRoutes, registerFeedbackRoute } from './admin/routes';

const PORT = Number(process.env.PORT ?? 2567);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

// Study stats are optional: without DATABASE_URL the rooms still work, just without history.
if (process.env.DATABASE_URL) {
  const { db, close } = createDb(process.env.DATABASE_URL);
  try {
    await migrateDb(db, process.env.MIGRATIONS_DIR);
    services.db = db;
    services.recordFocus = (r) => {
      if (r.minutes < MIN_COUNTED_FOCUS_MIN) return;
      metrics.focusMinutes.inc(r.minutes);
      recordFocus(db, r).catch((err) => log.warn({ err }, 'stats: could not record focus'));
    };
    log.info('stats: connected to Postgres');
  } catch (e) {
    await close().catch(() => {});
    log.warn({ err: e }, 'stats: Postgres unavailable; study stats disabled');
  }
} else {
  log.info('stats: DATABASE_URL not set, study stats disabled');
}

const server = defineServer({
  rooms: {
    // joinOrCreate fills the first open room; once it hits maxClients it locks
    // and the matchmaker opens a new one automatically.
    [ROOM_NAME]: defineRoom(StudyRoom),
  },
  express: (app) => {
    // Behind a reverse proxy (Caddy in production) the client address comes from X-Forwarded-For
    if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
    app.use(httpMetrics);
    const chaosMiddleware = chaos();
    if (chaosMiddleware) app.use(chaosMiddleware);
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
      // The admin page sends its session cookie; feedback posts JSON
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') return void res.sendStatus(204);
      next();
    });

    app.get('/health', (_req, res) => {
      res.json({ ok: true, stats: !!services.db });
    });

    app.get('/metrics', metricsHandler);

    // Public room list for the lobby.
    app.get('/rooms', async (_req, res) => {
      const rooms = await matchMaker.query({ name: ROOM_NAME });
      const listing: RoomListing[] = rooms
        .map((r) => ({
          roomId: r.roomId,
          label: (r.metadata as StudyRoomMetadata | undefined)?.label ?? 'Library',
          clients: r.clients,
          maxClients: r.maxClients,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      res.json(listing);
    });

    app.get('/stats/:visitorId', async (req, res) => {
      const db = services.db;
      if (!db) return void res.status(503).json({ error: 'stats disabled' });
      if (!/^[\w-]{8,64}$/.test(req.params.visitorId)) return void res.status(400).json({ error: 'bad id' });
      res.json(await getVisitorStats(db, req.params.visitorId));
    });

    registerFeedbackRoute(app);
    registerAdminRoutes(app);

    app.get('/leaderboard', async (req, res) => {
      const db = services.db;
      if (!db) return void res.status(503).json({ error: 'stats disabled' });
      const period = req.query.period === 'today' ? 'today' : 'week';
      res.json(await getLeaderboard(db, period));
    });
  },
});

await listen(server, PORT);
log.info({ port: PORT }, 'game server listening');
