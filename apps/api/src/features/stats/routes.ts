import { Hono } from 'hono';
import { getLeaderboard, getVisitorStats } from '@study/db';
import type { ApiDeps } from '../../deps';

const VISITOR_ID = /^[\w-]{8,64}$/;

/** GET /stats/:visitorId (my study history) and GET /leaderboard?period=week|today. */
export const statsRoutes = ({ db }: ApiDeps) =>
  new Hono()
    .get('/stats/:visitorId', async (c) => {
      if (!db) return c.json({ error: 'stats disabled' }, 503);
      const id = c.req.param('visitorId');
      if (!VISITOR_ID.test(id)) return c.json({ error: 'bad id' }, 400);
      return c.json(await getVisitorStats(db, id), 200);
    })
    .get('/leaderboard', async (c) => {
      if (!db) return c.json({ error: 'stats disabled' }, 503);
      const period = c.req.query('period') === 'today' ? 'today' : 'week';
      return c.json(await getLeaderboard(db, period), 200);
    });
