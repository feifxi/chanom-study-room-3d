import { Injectable, NotFoundException } from '@nestjs/common';
import { DAILY_RANK_CAP_MIN, FOCUS_PRESETS, dayIn, startOfDayIn, type FocusRound } from '@connecta/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { RoomToday } from './focus.schemas.js';

/** No round is longer than the longest preset */
const LONGEST_ROUND = Math.max(...FOCUS_PRESETS.map((p) => p.focus));

/**
 * Focus minutes (feature 8, docs/v2/features/08-study-tools.md): the game server times each round
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
      where: { roomId, endedAt: { gte: startOfDayIn(tz, now) }, user: { deletedAt: null } },
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

  /** The web app keeps your time zone current, so your days start at your midnight. */
  async setTimeZone(userId: string, timeZone: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { timeZone } });
  }
}
