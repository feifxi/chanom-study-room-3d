import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from './client';
import { focusSessions, visitors } from './schema';

/** Study days are counted in Thai time. */
export const STATS_TZ = 'Asia/Bangkok';

export interface DayTotal {
  /** YYYY-MM-DD in STATS_TZ */
  date: string;
  minutes: number;
}

export interface VisitorStats {
  todayMin: number;
  weekMin: number;
  streakDays: number;
  /** Oldest first, always 7 entries ending today. */
  last7: DayTotal[];
}

export interface LeaderRow {
  name: string;
  minutes: number;
}

/** YYYY-MM-DD for a date in STATS_TZ. */
export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STATS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export async function upsertVisitor(db: Db, v: { id: string; name: string; look: unknown }) {
  await db
    .insert(visitors)
    .values({ id: v.id, name: v.name, look: v.look })
    .onConflictDoUpdate({ target: visitors.id, set: { name: v.name, look: v.look, lastSeenAt: new Date() } });
}

export async function recordFocus(
  db: Db,
  r: { visitorId: string; roomLabel: string; subject: string; startedAt: Date; endedAt: Date; minutes: number },
) {
  await db.insert(focusSessions).values(r);
}

const localDay = sql<string>`to_char(${focusSessions.startedAt} at time zone ${sql.raw(`'${STATS_TZ}'`)}, 'YYYY-MM-DD')`;

/** Minutes per Thai calendar day for the last `days` days. */
async function dailyTotals(db: Db, visitorId: string, days: number): Promise<Map<string, number>> {
  const since = new Date(Date.now() - (days + 1) * 86_400_000);
  const rows = await db
    .select({ day: localDay, minutes: sql<number>`sum(${focusSessions.minutes})::float` })
    .from(focusSessions)
    .where(and(eq(focusSessions.visitorId, visitorId), gte(focusSessions.startedAt, since)))
    .groupBy(localDay);
  return new Map(rows.map((r) => [r.day, Number(r.minutes)]));
}

export async function getVisitorStats(db: Db, visitorId: string, now = new Date()): Promise<VisitorStats> {
  const totals = await dailyTotals(db, visitorId, 90);
  const today = dayKey(now);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, minutes: Math.round(totals.get(date) ?? 0) };
  });

  // A streak survives until the end of today: count back from today, or from yesterday if today is still empty
  let streakDays = 0;
  let cursor = (totals.get(today) ?? 0) >= 1 ? today : addDays(today, -1);
  while ((totals.get(cursor) ?? 0) >= 1) {
    streakDays++;
    cursor = addDays(cursor, -1);
  }

  return {
    todayMin: Math.round(totals.get(today) ?? 0),
    weekMin: last7.reduce((n, d) => n + d.minutes, 0),
    streakDays,
    last7,
  };
}

export async function getTodayMinutes(db: Db, visitorId: string, now = new Date()): Promise<number> {
  return (await getVisitorStats(db, visitorId, now)).todayMin;
}

/** Top visitors by focus minutes over the last 7 days (or since the start of today). */
export async function getLeaderboard(db: Db, period: 'today' | 'week', limit = 10, now = new Date()): Promise<LeaderRow[]> {
  const since = period === 'today' ? new Date(`${dayKey(now)}T00:00:00+07:00`) : new Date(now.getTime() - 7 * 86_400_000);
  const total = sql<number>`sum(${focusSessions.minutes})::float`;
  const rows = await db
    .select({ name: visitors.name, minutes: total })
    .from(focusSessions)
    .innerJoin(visitors, eq(visitors.id, focusSessions.visitorId))
    .where(gte(focusSessions.startedAt, since))
    .groupBy(visitors.id, visitors.name)
    .orderBy(desc(total))
    .limit(limit);
  return rows.map((r) => ({ name: r.name, minutes: Math.round(Number(r.minutes)) }));
}
