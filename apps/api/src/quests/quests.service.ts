import { Injectable } from '@nestjs/common';
import { dayIn, questsFor, type QuestCount, type QuestDone, type QuestEvent } from '@connecta/shared';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { QuestsToday } from './quests.schemas.js';

/** A step is never more than this (a focus round is at most the longest preset; the rest count 1) */
const STEP_MAX = 120;

const dateOf = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * Daily quests and coins (spec 15): the game server reports what it sees (a job each), Room chat is
 * counted here, and a quest pays out once, in the same transaction as the coins it adds.
 */
@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
  ) {}

  /** Quests are daily: a week back is plenty for "today" in any time zone */
  async purgeOld(now = new Date()): Promise<number> {
    const { count } = await this.prisma.questProgress.deleteMany({ where: { day: { lt: new Date(now.getTime() - 7 * 86_400_000) } } });
    return count;
  }

  /** Your three for today, with progress, and your coins */
  async today(userId: string, now = Date.now()): Promise<QuestsToday> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timeZone: true, coins: true } });
    const day = dayIn(user.timeZone, now);
    const rows = await this.prisma.questProgress.findMany({ where: { userId, day: dateOf(day) } });
    const progress = new Map(rows.map((r) => [r.questId, r.progress]));
    return {
      day,
      coins: user.coins,
      quests: questsFor(userId, day).map(({ id, emoji, title, goal, unit, coins }) => ({
        id,
        emoji,
        title,
        goal,
        unit,
        coins,
        progress: Math.min(goal, progress.get(id) ?? 0),
      })),
    };
  }

  /** One thing that happened. Accounts only (not anonymous guests), on the person's own day. */
  async count(event: QuestEvent): Promise<void> {
    const amount = Math.min(STEP_MAX, Math.floor(event.amount));
    if (!(amount > 0)) return;
    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
      select: { id: true, timeZone: true, isAnonymous: true, deletedAt: true },
    });
    if (!user || user.isAnonymous || user.deletedAt) return;
    const day = dayIn(user.timeZone, event.at);
    const quest = questsFor(user.id, day).find((q) => q.counts === event.counts);
    if (!quest) return;
    const key = { userId: user.id, day: dateOf(day), questId: quest.id };
    const done = await this.prisma.$transaction(async (tx) => {
      const row = await tx.questProgress.upsert({
        where: { userId_day_questId: key },
        create: { ...key, progress: amount },
        update: { progress: { increment: amount } },
      });
      if (row.progress < quest.goal || row.paidAt) return null;
      // Pays once: only the update that finds it unpaid adds the coins
      const paid = await tx.questProgress.updateMany({
        where: { ...key, paidAt: null },
        data: { paidAt: new Date(), progress: quest.goal },
      });
      if (!paid.count) return null;
      const { coins } = await tx.user.update({
        where: { id: user.id },
        data: { coins: { increment: quest.coins } },
        select: { coins: true },
      });
      await tx.coinEntry.create({ data: { userId: user.id, amount: quest.coins, reason: `quest:${quest.id}` } });
      return { id: quest.id, emoji: quest.emoji, title: quest.title, coins: quest.coins, balance: coins } satisfies QuestDone;
    });
    // Your tabs: a toast when one's done, and the lists refresh either way
    if (done) this.live.toUser(user.id, 'quest:done', done);
    else this.live.toUser(user.id, 'quests', {});
  }

  /** Room chat counts towards "say things" (bubbles come from the game server) */
  said(userId: string) {
    return this.count({ userId, counts: 'said' satisfies QuestCount, amount: 1, at: Date.now() });
  }
}
