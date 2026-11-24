import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DAILY_RANK_CAP_MIN,
  FOCUS_PRESETS,
  addDays,
  dayIn,
  midnightIn,
  startOfDayIn,
  startOfWeekIn,
  type FocusRound,
} from '@connecta/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import { requireSignedUp } from '../accounts/signed-up.js';
import { listedOnEveryone, listedWhere } from './everyone.js';
import type { MyFocus, Ranking, RoomToday } from './focus.schemas.js';

/** Everyone's totals are shared by every viewer whose day or week starts at the same instant, for this long */
const EVERYONE_CACHE_MS = 5 * 60_000;
const TOP = 10;

type Total = { userId: string; minutes: number };

/** Minutes per person, at most 12 hours of each of their days ("day" is theirs: their own time zone) */
function cappedTotals(rows: { userId: string; day: Date; minutes: number }[]): Map<string, number> {
  const perDay = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.userId} ${r.day.toISOString()}`;
    perDay.set(key, (perDay.get(key) ?? 0) + r.minutes);
  }
  const totals = new Map<string, number>();
  for (const [key, minutes] of perDay) {
    const userId = key.split(' ')[0]!;
    totals.set(userId, (totals.get(userId) ?? 0) + Math.min(minutes, DAILY_RANK_CAP_MIN));
  }
  return totals;
}

/** Ties share a rank: one more than how many did better */
const rankOf = (sorted: Total[], minutes: number) => sorted.filter((t) => t.minutes > minutes).length + 1;

/** No round is longer than the longest preset */
const LONGEST_ROUND = Math.max(...FOCUS_PRESETS.map((p) => p.focus));

/**
 * Focus minutes (feature 8, docs/features/08-study-tools.md): the game server times each round
 * and queues it; this saves it against the person's own day, and reads the rankings.
 */
@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  /** A round from the game server. Saved once (its id), for full accounts only, on their own day. */
  async save(round: FocusRound): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: round.userId } });
    if (!user || user.isAnonymous || user.deletedAt) return;
    const room = await this.prisma.room.findUnique({ where: { id: round.roomId }, select: { id: true } });
    const minutes = Math.min(Math.max(0, Math.floor(round.minutes)), LONGEST_ROUND);
    if (minutes < 1) return;
    await this.prisma.focusSession.createMany({
      data: [
        {
          id: round.id,
          userId: user.id,
          roomId: room?.id ?? null,
          subject: round.subject.slice(0, 24),
          startedAt: new Date(round.startedAt),
          endedAt: new Date(round.endedAt),
          minutes,
          day: new Date(`${dayIn(user.timeZone, round.startedAt)}T00:00:00Z`),
        },
      ],
      skipDuplicates: true,
    });
  }

  /**
   * Members' saved minutes in this room since the viewer's midnight, capped at 12 hours each. For
   * whoever may walk in: members, and guests while their pass lasts.
   */
  async roomToday(roomId: string, userId: string, tz: string, now = new Date()): Promise<RoomToday> {
    const [member, guest] = await Promise.all([
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      this.prisma.guestVisit.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);
    if (!member && !(guest && guest.until > now)) throw new NotFoundException();
    const sums = await this.prisma.focusSession.groupBy({
      by: ['userId'],
      where: { roomId, startedAt: { gte: startOfDayIn(tz, now) }, user: { deletedAt: null } },
      _sum: { minutes: true },
    });
    const users = await this.prisma.user.findMany({ where: { id: { in: sums.map((s) => s.userId) } } });
    const byId = new Map(users.map((u) => [u.id, u]));
    const rows = sums.flatMap((s) => {
      const user = byId.get(s.userId);
      return user ? [{ person: toPerson(user), minutes: Math.min(s._sum.minutes ?? 0, DAILY_RANK_CAP_MIN) }] : [];
    });
    return { rows: rows.sort((a, b) => b.minutes - a.minutes) };
  }

  /** My numbers (only you): the last 7 days in `tz`, and minutes per subject over them. Everything counts (no cap). */
  async mine(userId: string, tz: string, now = new Date()): Promise<MyFocus> {
    await requireSignedUp(this.prisma, userId);
    const today = dayIn(tz, now);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const rounds = await this.prisma.focusSession.findMany({
      where: { userId, startedAt: { gte: midnightIn(tz, dates[0]!) } },
      select: { startedAt: true, minutes: true, subject: true },
    });
    const byDay = new Map(dates.map((d) => [d, 0]));
    const subjects = new Map<string, { minutes: number; spellings: Map<string, number> }>();
    for (const r of rounds) {
      const day = dayIn(tz, r.startedAt);
      if (byDay.has(day)) byDay.set(day, byDay.get(day)! + r.minutes);
      const name = r.subject.trim().replace(/\s+/g, ' ');
      const key = name.toLowerCase();
      const s = subjects.get(key) ?? { minutes: 0, spellings: new Map<string, number>() };
      s.minutes += r.minutes;
      s.spellings.set(name, (s.spellings.get(name) ?? 0) + r.minutes);
      subjects.set(key, s);
    }
    const days = dates.map((date) => ({ date, minutes: byDay.get(date)! }));
    const week = days.reduce((n, d) => n + d.minutes, 0);
    const focusedDays = days.filter((d) => d.minutes > 0).length;
    return {
      today: days[6]!.minutes,
      week,
      dailyAverage: focusedDays ? Math.round(week / focusedDays) : 0,
      days,
      subjects: [...subjects.values()]
        .map((s) => ({ name: [...s.spellings].sort((a, b) => b[1] - a[1])[0]![0] || 'No subject', minutes: s.minutes }))
        .sort((a, b) => b.minutes - a.minutes),
    };
  }

  /**
   * A ranking since the viewer's midnight (today) or Monday (this week), in `tz`, 12 hours a day at
   * most. Friends: you and the friends who focused. Everyone: the top 10 of those listed, skipping
   * anyone you blocked or who blocked you (your rank still counts everyone).
   */
  async ranking(userId: string, scope: 'friends' | 'everyone', period: 'today' | 'week', tz: string, now = new Date()): Promise<Ranking> {
    const me = await requireSignedUp(this.prisma, userId);
    const from = period === 'today' ? startOfDayIn(tz, now) : startOfWeekIn(tz, now);
    if (scope === 'friends') return this.friendsRanking(userId, from);

    const sorted = await this.everyoneTotals(period, from, now);
    const listed = listedOnEveryone(me, now);
    const mine = sorted.find((t) => t.userId === userId)?.minutes ?? 0;
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ userId }, { blockedId: userId }] },
      select: { userId: true, blockedId: true },
    });
    const hidden = new Set(blocks.map((b) => (b.userId === userId ? b.blockedId : b.userId)));
    const top = sorted.filter((t) => !hidden.has(t.userId)).slice(0, TOP);
    const people = new Map((await this.prisma.user.findMany({ where: { id: { in: top.map((t) => t.userId) } } })).map((u) => [u.id, u]));
    return {
      rows: top.flatMap((t) => {
        const user = people.get(t.userId);
        return user ? [{ rank: rankOf(sorted, t.minutes), person: toPerson(user), minutes: t.minutes }] : [];
      }),
      me: listed ? { rank: mine > 0 ? rankOf(sorted, mine) : null, minutes: mine } : null,
      idleFriends: 0,
    };
  }

  private async friendsRanking(userId: string, from: Date): Promise<Ranking> {
    const friends = await this.prisma.friendship.findMany({ where: { userId, friend: { deletedAt: null } }, select: { friendId: true } });
    const ids = [userId, ...friends.map((f) => f.friendId)];
    const rows = await this.prisma.focusSession.findMany({
      where: { userId: { in: ids }, startedAt: { gte: from } },
      select: { userId: true, day: true, minutes: true },
    });
    const totals = cappedTotals(rows);
    const sorted: Total[] = ids
      .map((id) => ({ userId: id, minutes: totals.get(id) ?? 0 }))
      .filter((t) => t.minutes > 0 || t.userId === userId)
      .sort((a, b) => b.minutes - a.minutes);
    const people = new Map((await this.prisma.user.findMany({ where: { id: { in: sorted.map((t) => t.userId) } } })).map((u) => [u.id, u]));
    const mine = totals.get(userId) ?? 0;
    return {
      rows: sorted.flatMap((t) => {
        const user = people.get(t.userId);
        return user ? [{ rank: rankOf(sorted, t.minutes), person: toPerson(user), minutes: t.minutes }] : [];
      }),
      me: { rank: mine > 0 ? rankOf(sorted, mine) : null, minutes: mine },
      idleFriends: friends.filter((f) => !totals.get(f.friendId)).length,
    };
  }

  /** Everyone listed who focused since `from`, most first; cached for a few minutes per window */
  private everyoneCache = new Map<string, { at: number; totals: Total[] }>();
  private async everyoneTotals(period: string, from: Date, now: Date): Promise<Total[]> {
    const key = `${period} ${from.toISOString()}`;
    const hit = this.everyoneCache.get(key);
    if (hit && now.getTime() - hit.at < EVERYONE_CACHE_MS) return hit.totals;
    const rows = await this.prisma.focusSession.groupBy({
      by: ['userId', 'day'],
      where: { startedAt: { gte: from }, user: listedWhere(now) },
      _sum: { minutes: true },
    });
    const totals = [...cappedTotals(rows.map((r) => ({ userId: r.userId, day: r.day, minutes: r._sum.minutes ?? 0 })))]
      .map(([userId, minutes]) => ({ userId, minutes }))
      .filter((t) => t.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    // Old windows go as new ones come in
    for (const [k, v] of this.everyoneCache) if (now.getTime() - v.at >= EVERYONE_CACHE_MS) this.everyoneCache.delete(k);
    this.everyoneCache.set(key, { at: now.getTime(), totals });
    return totals;
  }

  /** Tests and a changed listing setting start fresh */
  forgetEveryone() {
    this.everyoneCache.clear();
  }

  /** The web app keeps your time zone current, so your days start at your midnight. */
  async setTimeZone(userId: string, timeZone: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { timeZone } });
  }
}
