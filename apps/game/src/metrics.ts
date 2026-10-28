import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { ROOM_NAME } from '@study/shared';

/** Prometheus metrics for the game server, scraped by the monitoring stack at /metrics. */
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'study_game_' });

export const metrics = {
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
