/**
 * Checks the study-stats queries and endpoints against a real Postgres:
 *   pnpm --filter @study/game stats-check   (game server running with DATABASE_URL)
 *
 * Seeds focus sessions for a throwaway visitor across several Thai days,
 * then verifies totals, the streak, the 7-day series and the leaderboard.
 */
import { eq } from 'drizzle-orm';
import { createDb, dayKey, focusSessions, upsertVisitor, visitors, type VisitorStatsView } from './_db';

const URL = process.env.GAME_URL ?? 'http://localhost:2567';
const { db, close } = createDb(process.env.DATABASE_URL ?? 'postgres://study:study@localhost:5433/study');
let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

const id = `test-${Date.now()}`;
const DAY = 86_400_000;
// Noon Thai time on a given day offset, so sessions never straddle midnight
const thaiNoon = (daysAgo: number) => new Date(`${dayKey(new Date(Date.now() - daysAgo * DAY))}T12:00:00+07:00`);
const session = (daysAgo: number, minutes: number) => {
  const startedAt = thaiNoon(daysAgo);
  return { visitorId: id, roomLabel: 'Library #1', subject: 'Test', startedAt, endedAt: new Date(startedAt.getTime() + minutes * 60_000), minutes };
};

try {
  await upsertVisitor(db, { id, name: 'StatsBot', look: {} });
  // Today 30+20, yesterday 45, two days ago 10, gap, five days ago 90 (outside the streak)
  await db.insert(focusSessions).values([session(0, 30), session(0, 20), session(1, 45), session(2, 10), session(5, 90)]);

  const stats = (await (await fetch(`${URL}/stats/${id}`)).json()) as VisitorStatsView;
  check('today sums every session today', stats.todayMin === 50, `${stats.todayMin} min`);
  check('streak counts back over consecutive days', stats.streakDays === 3, `${stats.streakDays} days`);
  check('week total covers the last 7 days', stats.weekMin === 195, `${stats.weekMin} min`);
  check('7-day series ends today', stats.last7.length === 7 && stats.last7[6]?.date === dayKey(new Date()) && stats.last7[6]?.minutes === 50);
  check('gap days show zero', stats.last7[3]?.minutes === 0 && stats.last7[1]?.minutes === 90, stats.last7.map((d) => d.minutes).join(','));

  const board = (await (await fetch(`${URL}/leaderboard?period=week`)).json()) as { name: string; minutes: number }[];
  check('leaderboard includes the visitor', board.some((r) => r.name === 'StatsBot' && r.minutes === 195));

  const unknown = (await (await fetch(`${URL}/stats/nobody-${Date.now()}`)).json()) as VisitorStatsView;
  check('a new visitor starts at zero', unknown.todayMin === 0 && unknown.streakDays === 0 && unknown.last7.length === 7);
} finally {
  await db.delete(visitors).where(eq(visitors.id, id)); // cascades to their sessions
  await close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
