import type { NextFunction, Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { ROOM_NAME } from '@study/shared';
import { log } from './log';

/** Prometheus metrics for the game server, scraped by the monitoring stack at /metrics. */
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'study_game_' });

export const metrics = {
  // --- RED for HTTP (rooms list, health; the REST API has its own server, apps/api) ---
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
  // --- Real-time sessions ---
  disconnects: new Counter({
    name: 'study_disconnects_total',
    help: 'How sessions end or wobble: left (pressed Leave / closed cleanly), dropped (connection lost), reconnected, timed_out (never came back)',
    labelNames: ['kind'] as const,
    registers: [registry],
  }),
  npcTick: new Histogram({
    name: 'study_npc_tick_seconds',
    help: 'Time to simulate one 10 Hz NPC tick for a room',
    buckets: [0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1],
    registers: [registry],
  }),

  joins: new Counter({ name: 'study_joins_total', help: 'Players who joined a study room', registers: [registry] }),
  chatMessages: new Counter({ name: 'study_chat_messages_total', help: 'Chat messages broadcast', registers: [registry] }),
  focusMinutes: new Counter({ name: 'study_focus_minutes_total', help: 'Focus minutes recorded to stats', registers: [registry] }),
  rooms: new Gauge({
    name: 'study_rooms',
    help: 'Open study rooms',
    registers: [registry],
    async collect() {
      this.set((await matchMaker.query({ name: ROOM_NAME })).length);
    },
  }),
  players: new Gauge({
    name: 'study_players',
    help: 'Players connected across all rooms',
    registers: [registry],
    async collect() {
      const rooms = await matchMaker.query({ name: ROOM_NAME });
      this.set(rooms.reduce((n, r) => n + r.clients, 0));
    },
  }),
};

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', registry.contentType);
  res.send(await registry.metrics());
}

const SLOW_REQUEST_S = 1;

/** Known routes, so requests answered before routing (e.g. by middleware) still get a useful label. */
const ROUTE_PATTERNS: [RegExp, string][] = [
  [/^\/matchmake(\/|$)/, '/matchmake'],
  [/^\/(rooms|health|metrics|internal\/live)$/, ''],
];

/** Route label from a raw path; anything unknown collapses to "unmatched" to keep label cardinality bounded. */
export function routeFromPath(path: string) {
  for (const [re, label] of ROUTE_PATTERNS) if (re.test(path)) return label || path;
  return 'unmatched';
}

/** Express middleware: count and time every request, and log failures and slow ones. */
export function httpMetrics(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    // The route pattern (/stats/:visitorId), not the raw URL, to keep label cardinality small
    const route = req.route ? `${req.baseUrl}${String(req.route.path)}` : routeFromPath(req.path);
    metrics.httpRequests.inc({ route, method: req.method, code: String(res.statusCode) });
    metrics.httpDuration.observe({ route, method: req.method }, seconds);
    if (res.statusCode >= 500) log.error({ route, method: req.method, code: res.statusCode, seconds }, 'http request failed');
    else if (seconds > SLOW_REQUEST_S) log.warn({ route, method: req.method, code: res.statusCode, seconds }, 'slow http request');
  });
  next();
}

/**
 * Chaos switches for SRE practice (off unless the env vars are set): fail a share of HTTP
 * requests with 503 and/or add latency, so you can watch SLOs burn and alerts fire.
 *   CHAOS_ERROR_RATE=0.2 CHAOS_LATENCY_MS=400 pnpm dev
 */
export function chaos() {
  const errorRate = Number(process.env.CHAOS_ERROR_RATE ?? 0);
  const latencyMs = Number(process.env.CHAOS_LATENCY_MS ?? 0);
  if (!errorRate && !latencyMs) return null;
  log.warn({ errorRate, latencyMs }, 'CHAOS is on: API requests will fail or slow down on purpose');
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/metrics' || req.path === '/health' || req.method === 'OPTIONS') return next();
    const go = () => (Math.random() < errorRate ? res.status(503).json({ error: 'chaos' }) : next());
    if (latencyMs) setTimeout(go, latencyMs * (0.5 + Math.random()));
    else go();
  };
}
