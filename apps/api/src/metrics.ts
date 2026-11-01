import type { Context, MiddlewareHandler } from 'hono';
import { matchedRoutes } from 'hono/route';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { log } from './log';

/**
 * Prometheus metrics for the API, scraped at /metrics. The HTTP metric names match the ones the
 * game server used to export for these routes, so the SLO rules and the dashboard keep working
 * (Prometheus adds job="api" to tell the two apart).
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'study_api_' });

export const metrics = {
  httpRequests: new Counter({
    name: 'study_http_requests_total',
    help: 'HTTP requests by route, method and status code',
    labelNames: ['route', 'method', 'code'] as const,
    registers: [registry],
  }),
  httpDuration: new Histogram({
    name: 'study_http_request_duration_seconds',
    help: 'HTTP request latency by route',
    labelNames: ['route', 'method'] as const,
    // 0.3 s is the latency SLO threshold, so it needs its own bucket
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2.5, 5],
    registers: [registry],
  }),
  feedback: new Counter({
    name: 'study_feedback_total',
    help: 'Feedback received, by rating',
    labelNames: ['rating'] as const,
    registers: [registry],
  }),
};

const SLOW_REQUEST_S = 1;

/**
 * The route pattern that answered (/api/stats/:visitorId), not the raw URL, to keep label cardinality
 * small. A request no route matched (scanners, typos) only went through middleware: "unmatched".
 */
export function routeLabel(c: Context) {
  const route = matchedRoutes(c)[c.req.routeIndex];
  if (!route || route.path.endsWith('*')) return 'unmatched';
  return route.path;
}

/** Count and time every request, and log failures and slow ones. */
export const httpMetrics: MiddlewareHandler = async (c, next) => {
  const start = process.hrtime.bigint();
  await next();
  const seconds = Number(process.hrtime.bigint() - start) / 1e9;
  const route = routeLabel(c);
  const { method } = c.req;
  const code = c.res.status;
  metrics.httpRequests.inc({ route, method, code: String(code) });
  metrics.httpDuration.observe({ route, method }, seconds);
  if (code >= 500) log.error({ route, method, code, seconds }, 'http request failed');
  else if (seconds > SLOW_REQUEST_S) log.warn({ route, method, code, seconds }, 'slow http request');
};

/**
 * Chaos switches for SRE practice (off unless the env vars are set): fail a share of API
 * requests with 503 and/or add latency, so you can watch SLOs burn and alerts fire.
 *   CHAOS_ERROR_RATE=0.2 CHAOS_LATENCY_MS=400 pnpm dev
 */
export function chaos(): MiddlewareHandler | null {
  const errorRate = Number(process.env.CHAOS_ERROR_RATE ?? 0);
  const latencyMs = Number(process.env.CHAOS_LATENCY_MS ?? 0);
  if (!errorRate && !latencyMs) return null;
  log.warn({ errorRate, latencyMs }, 'CHAOS is on: API requests will fail or slow down on purpose');
  return async (c, next) => {
    if (c.req.path === '/metrics' || c.req.path === '/api/health') return next();
    if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs * (0.5 + Math.random())));
    if (Math.random() < errorRate) return c.json({ error: 'chaos' }, 503);
    return next();
  };
}
