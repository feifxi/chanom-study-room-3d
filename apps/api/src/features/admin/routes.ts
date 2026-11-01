import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AdminOverview, FeedbackRow } from '@study/shared';
import { deleteFeedback, getAdminSummary, listFeedback } from '@study/db';
import { clientIp, type ApiDeps } from '../../deps';
import { ADMIN_COOKIE, SESSION_DAYS } from './auth';
import { feedbackCsv } from './csv';

const OFF = { error: 'admin is off (set ADMIN_PASSWORD)' } as const;

/** /admin/*: password login (signed HttpOnly cookie), the overview, and feedback moderation. */
export const adminRoutes = ({ db, auth, live, trustProxy }: ApiDeps) => {
  const secure = process.env.NODE_ENV === 'production';
  const ip = (c: Context) => clientIp(c, trustProxy);

  /** 503 when admin is off, 401 without a valid session. */
  const requireAdmin = createMiddleware(async (c, next) => {
    if (!auth.enabled) return c.json(OFF, 503);
    if (!auth.verify(getCookie(c, ADMIN_COOKIE))) return c.json({ error: 'sign in' }, 401);
    await next();
  });

  return new Hono()
    .post('/admin/login', bodyLimit({ maxSize: 1024 }), async (c) => {
      if (!auth.enabled) return c.json(OFF, 503);
      if (auth.isLockedOut(ip(c))) return c.json({ error: 'Too many tries. Wait 10 minutes.' }, 429);
      const body = (await c.req.json().catch(() => null)) as { password?: unknown } | null;
      const token = auth.login(ip(c), body?.password);
      if (!token) return c.json({ error: 'Wrong password' }, 401);
      // Same origin as the page (Caddy routes /api/*), so SameSite=Lax is enough and no CORS is needed
      setCookie(c, ADMIN_COOKIE, token, { path: '/api', httpOnly: true, sameSite: 'Lax', secure, maxAge: SESSION_DAYS * 86_400 });
      return c.json({ ok: true }, 200);
    })
    .post('/admin/logout', (c) => {
      deleteCookie(c, ADMIN_COOKIE, { path: '/api', secure });
      return c.json({ ok: true }, 200);
    })
    .get('/admin/overview', requireAdmin, async (c) => {
      const [liveData, summary, feedback] = await Promise.all([
        live(),
        db ? getAdminSummary(db).catch(() => null) : null,
        db ? listFeedback(db, 100).catch(() => [] as FeedbackRow[]) : ([] as FeedbackRow[]),
      ]);
      const body: AdminOverview = { live: liveData, summary, feedback };
      return c.json(body, 200);
    })
    .delete('/admin/feedback/:id', requireAdmin, async (c) => {
      const id = Number(c.req.param('id'));
      if (!db || !Number.isInteger(id)) return c.json({ error: 'bad id' }, 400);
      await deleteFeedback(db, id);
      return c.json({ ok: true }, 200);
    })
    .get('/admin/feedback.csv', requireAdmin, async (c) => {
      const rows = db ? await listFeedback(db, 10_000) : [];
      c.header('Content-Disposition', 'attachment; filename="chanom-feedback.csv"');
      return c.body(feedbackCsv(rows), 200, { 'Content-Type': 'text/csv; charset=utf-8' });
    });
};
