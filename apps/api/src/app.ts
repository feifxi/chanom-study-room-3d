import { Hono } from 'hono';
import type { ApiDeps } from './deps';
import { chaos, httpMetrics, registry } from './metrics';
import { statsRoutes } from './features/stats/routes';
import { feedbackRoutes } from './features/feedback/routes';
import { adminRoutes } from './features/admin/routes';

/**
 * The REST API (stats, leaderboard, feedback, admin). Public routes live under /api, which Caddy
 * sends here on the main domain; /metrics stays outside it so it's only reachable inside the network.
 */
export function createApp(deps: ApiDeps) {
  const app = new Hono();
  app.use(httpMetrics);
  const chaosMiddleware = chaos();
  if (chaosMiddleware) app.use(chaosMiddleware);

  app.get('/metrics', async (c) => c.body(await registry.metrics(), 200, { 'Content-Type': registry.contentType }));

  const api = new Hono()
    .get('/health', (c) => c.json({ ok: true, db: !!deps.db }, 200))
    .route('/', statsRoutes(deps))
    .route('/', feedbackRoutes(deps))
    .route('/', adminRoutes(deps));
  app.route('/api', api);
  return { app, api };
}

/** Route types for the web app's typed client: `hc<AppType>('/api')`. */
export type AppType = ReturnType<typeof createApp>['api'];
