import { WebSocketTransport, defineRoom, defineServer, listen } from 'colyseus';
import { MIN_COUNTED_FOCUS_MIN, ROOM_NAME, type RoomListing } from '@study/shared';
import { createDb, recordFocus } from '@study/db';
import { StudyRoom, services } from './rooms/StudyRoom';
import { chaos, httpMetrics, metrics, metricsHandler } from './metrics';
import { log } from './log';
import { liveData, roomListing } from './live';

const PORT = Number(process.env.PORT ?? 2567);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

// Study stats are optional: without DATABASE_URL the rooms still work, just without history.
// The API server owns the schema and runs the migrations; this process only writes visits and focus.
if (process.env.DATABASE_URL) {
  const { db } = createDb(process.env.DATABASE_URL);
  services.db = db;
  services.recordFocus = (r) => {
    if (r.minutes < MIN_COUNTED_FOCUS_MIN) return;
    metrics.focusMinutes.inc(r.minutes);
    recordFocus(db, r).catch((err) => log.warn({ err }, 'stats: could not record focus'));
  };
  log.info('stats: writing visits and focus to Postgres');
} else {
  log.info('stats: DATABASE_URL not set, study stats disabled');
}

const server = defineServer({
  // Explicit, so the production bundle includes it (Colyseus would otherwise load it with a dynamic import)
  transport: new WebSocketTransport(),
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
      // The web origin fetches /rooms and POSTs JSON to matchmaking. No credentials: the REST API
      // (and its admin cookie) is same-origin under /api now.
      res.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      if (req.method === 'OPTIONS') return void res.sendStatus(204);
      next();
    });

    app.get('/health', (_req, res) => {
      res.json({ ok: true, stats: !!services.db });
    });

    app.get('/metrics', metricsHandler);

    // Public room list for the lobby.
    app.get('/rooms', async (_req, res) => {
      const listing: RoomListing[] = await roomListing();
      res.json(listing);
    });

    // Live head counts for the API's admin overview; never routed publicly
    app.get('/internal/live', async (_req, res) => {
      res.json(await liveData());
    });
  },
});

await listen(server, PORT);
log.info({ port: PORT }, 'game server listening');
