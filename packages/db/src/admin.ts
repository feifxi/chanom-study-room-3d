import { desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import type { Db } from './client';
import { feedback, focusSessions, visits } from './schema';
import { STATS_TZ, dayKey } from './stats';
import type { AdminSummary, FeedbackPayload, FeedbackRow, FeedbackTag } from '@study/shared';

/** Returns the visit id, so the room can close it when they leave. */
export async function startVisit(db: Db, v: { visitorId: string; roomLabel: string }) {
  const [row] = await db.insert(visits).values(v).returning({ id: visits.id });
  return row!.id;
}

export async function endVisit(db: Db, id: number) {
  await db.update(visits).set({ leftAt: new Date() }).where(eq(visits.id, id));
}

export async function recordFeedback(db: Db, f: FeedbackPayload & { userAgent: string }) {
  await db.insert(feedback).values(f);
}

export async function deleteFeedback(db: Db, id: number) {
  await db.delete(feedback).where(eq(feedback.id, id));
}

export async function listFeedback(db: Db, limit = 200): Promise<FeedbackRow[]> {
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(limit);
  return rows.map((r) => ({ ...r, tags: r.tags as FeedbackTag[], createdAt: r.createdAt.toISOString() }));
}

const visitDay = sql<string>`to_char(${visits.joinedAt} at time zone ${sql.raw(`'${STATS_TZ}'`)}, 'YYYY-MM-DD')`;

export async function getAdminSummary(db: Db, now = new Date()): Promise<AdminSummary> {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const today = dayKey(now);

  const [perDay, [allTime], [week], [focus], ratings] = await Promise.all([
    db
      .select({ day: visitDay, visitors: sql<number>`count(distinct ${visits.visitorId})::int` })
      .from(visits)
      .where(gte(visits.joinedAt, weekAgo))
      .groupBy(visitDay),
    db.select({ visitors: sql<number>`count(distinct ${visits.visitorId})::int` }).from(visits),
    db
      .select({
        visitors: sql<number>`count(distinct ${visits.visitorId})::int`,
        visits: sql<number>`count(*)::int`,
        // Only finished visits have a length
        avgMinutes: sql<number>`coalesce(avg(extract(epoch from (${visits.leftAt} - ${visits.joinedAt})) / 60) filter (where ${isNotNull(visits.leftAt)}), 0)::float`,
      })
      .from(visits)
      .where(gte(visits.joinedAt, weekAgo)),
    db
      .select({
        allTime: sql<number>`coalesce(sum(${focusSessions.minutes}), 0)::float`,
        week: sql<number>`coalesce(sum(${focusSessions.minutes}) filter (where ${gte(focusSessions.startedAt, weekAgo)}), 0)::float`,
      })
      .from(focusSessions),
    db
      .select({ rating: feedback.rating, n: sql<number>`count(*)::int` })
      .from(feedback)
      .groupBy(feedback.rating),
  ]);

  const byDay = new Map(perDay.map((r) => [r.day, r.visitors]));
  const daily = Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(new Date(now.getTime() - (6 - i) * 86_400_000));
    return { date, visitors: byDay.get(date) ?? 0 };
  });

  const distribution = [1, 2, 3, 4, 5].map((r) => ratings.find((x) => x.rating === r)?.n ?? 0);
  const count = distribution.reduce((a, b) => a + b, 0);
  const avgRating = count ? distribution.reduce((sum, n, i) => sum + n * (i + 1), 0) / count : null;

  return {
    visitors: { today: byDay.get(today) ?? 0, last7Days: week?.visitors ?? 0, allTime: allTime?.visitors ?? 0 },
    visits: { last7Days: week?.visits ?? 0, avgMinutes: week?.avgMinutes ?? 0 },
    focusMinutes: { last7Days: focus?.week ?? 0, allTime: focus?.allTime ?? 0 },
    feedback: { count, avgRating, distribution },
    daily,
  };
}
