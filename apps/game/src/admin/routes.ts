import express, { type Application, type Request, type Response } from 'express';
import { matchMaker } from 'colyseus';
import { z } from 'zod';
import { FEEDBACK_COMMENT_MAX, FEEDBACK_TAGS, NAME_MAX, ROOM_NAME, type AdminOverview, type FeedbackRow } from '@study/shared';
import { deleteFeedback, getAdminSummary, listFeedback, recordFeedback } from '@study/db';
import { services, type StudyRoomMetadata } from '../rooms/StudyRoom';
import { presence } from '../presence';
import { ADMIN_COOKIE, AdminAuth, SESSION_DAYS, readCookie } from './auth';

const FEEDBACK_PER_MINUTE = 5;
const feedbackSchema = z.object({
  visitorId: z.string().regex(/^[\w-]{8,64}$/),
  name: z.string().trim().max(NAME_MAX).catch('Guest'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(FEEDBACK_COMMENT_MAX).catch(''),
  tags: z.array(z.enum(FEEDBACK_TAGS)).max(FEEDBACK_TAGS.length).catch([]),
  roomLabel: z.string().max(40).catch(''),
  minutesInRoom: z
    .number()
    .min(0)
    .max(24 * 60)
    .catch(0),
  usedVoice: z.boolean().catch(false),
  viewport: z.string().max(20).catch(''),
});

/** Tiny per-address rate limiter (in memory; good enough for one server). */
function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length <= limit;
  };
}

const ip = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown';

/** POST /feedback: what someone thought, sent from the "before you go" card. */
export function registerFeedbackRoute(app: Application) {
  const allow = rateLimiter(FEEDBACK_PER_MINUTE, 60_000);
  app.post('/feedback', express.json({ limit: '8kb' }), async (req, res) => {
    const db = services.db;
    if (!db) return void res.status(503).json({ error: 'feedback is off (no database)' });
    if (!allow(ip(req))) return void res.status(429).json({ error: 'slow down' });
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: 'invalid feedback' });
    await recordFeedback(db, {
      ...parsed.data,
      name: parsed.data.name || 'Guest',
      userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
    });
    res.status(201).json({ ok: true });
  });
}

export function registerAdminRoutes(app: Application, auth = new AdminAuth()) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = (value: string, maxAgeSec: number) =>
    `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${isProd ? '; Secure' : ''}`;
  /** Sends 503/401 and returns false unless the request carries a valid admin session. */
  const requireAdmin = (req: Request, res: Response) => {
    if (!auth.enabled) {
      res.status(503).json({ error: 'admin is off (set ADMIN_PASSWORD)' });
      return false;
    }
    if (!auth.verify(readCookie(req.headers.cookie, ADMIN_COOKIE))) {
      res.status(401).json({ error: 'sign in' });
      return false;
    }
    return true;
  };

  app.post('/admin/login', express.json({ limit: '1kb' }), (req, res) => {
    if (!auth.enabled) return void res.status(503).json({ error: 'admin is off (set ADMIN_PASSWORD)' });
    if (auth.isLockedOut(ip(req))) return void res.status(429).json({ error: 'Too many tries. Wait 10 minutes.' });
    const token = auth.login(ip(req), (req.body as { password?: unknown } | undefined)?.password);
    if (!token) return void res.status(401).json({ error: 'Wrong password' });
    res.setHeader('Set-Cookie', cookie(token, SESSION_DAYS * 86_400));
    res.json({ ok: true });
  });

  app.post('/admin/logout', (_req, res) => {
    res.setHeader('Set-Cookie', cookie('', 0));
    res.json({ ok: true });
  });

  app.get('/admin/overview', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = services.db;
    const [rooms, summary, feedback] = await Promise.all([
      liveRooms(),
      db ? getAdminSummary(db).catch(() => null) : Promise.resolve(null),
      db ? listFeedback(db, 100).catch(() => [] as FeedbackRow[]) : Promise.resolve([] as FeedbackRow[]),
    ]);
    const body: AdminOverview = {
      live: { online: presence.online, peakOnline: presence.peak, rooms },
      summary,
      feedback,
    };
    res.json(body);
  });

  app.delete('/admin/feedback/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    const db = services.db;
    if (!db || !Number.isInteger(id)) return void res.status(400).json({ error: 'bad id' });
    await deleteFeedback(db, id);
    res.json({ ok: true });
  });

  app.get('/admin/feedback.csv', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = services.db;
    const rows = db ? await listFeedback(db, 10_000) : [];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="chanom-feedback.csv"');
    res.send(feedbackCsv(rows));
  });
}

/** Every open room with its head count and NPCs. */
async function liveRooms() {
  const listings = await matchMaker.query({ name: ROOM_NAME });
  return listings
    .map((r) => {
      const local = matchMaker.getLocalRoomById(r.roomId) as { state?: { npcs?: Map<string, unknown> } } | undefined;
      return {
        label: (r.metadata as StudyRoomMetadata | undefined)?.label ?? 'Library',
        clients: r.clients,
        maxClients: r.maxClients,
        npcs: local?.state?.npcs?.size ?? 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

const CSV_COLUMNS: (keyof FeedbackRow)[] = [
  'createdAt',
  'rating',
  'tags',
  'comment',
  'name',
  'roomLabel',
  'minutesInRoom',
  'usedVoice',
  'viewport',
  'userAgent',
  'visitorId',
];

export function feedbackCsv(rows: FeedbackRow[]) {
  const cell = (v: unknown) => {
    const s = Array.isArray(v) ? v.join(' ') : String(v ?? '');
    // Quote everything; neutralise spreadsheet formulas
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  return [CSV_COLUMNS.join(','), ...rows.map((r) => CSV_COLUMNS.map((c) => cell(r[c])).join(','))].join('\n');
}
