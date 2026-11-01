import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { FEEDBACK_COMMENT_MAX, FEEDBACK_TAGS, NAME_MAX } from '@study/shared';
import { recordFeedback } from '@study/db';
import { clientIp, type ApiDeps } from '../../deps';
import { metrics } from '../../metrics';
import { rateLimiter } from './rateLimiter';

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

/** POST /feedback: what someone thought, sent from the "before you go" card. */
export const feedbackRoutes = ({ db, trustProxy }: ApiDeps) => {
  const allow = rateLimiter(FEEDBACK_PER_MINUTE, 60_000);
  return new Hono().post('/feedback', bodyLimit({ maxSize: 8 * 1024 }), async (c) => {
    if (!db) return c.json({ error: 'feedback is off (no database)' }, 503);
    if (!allow(clientIp(c, trustProxy))) return c.json({ error: 'slow down' }, 429);
    // Parsed by hand (not zValidator) so a bad body is the same short 400 as before, without zod's details
    const parsed = feedbackSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'invalid feedback' }, 400);
    metrics.feedback.inc({ rating: String(parsed.data.rating) });
    await recordFeedback(db, {
      ...parsed.data,
      name: parsed.data.name || 'Guest',
      userAgent: (c.req.header('user-agent') ?? '').slice(0, 300),
    });
    return c.json({ ok: true }, 201);
  });
};
