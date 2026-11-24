import { SHOP_ITEMS, dayIn, questsFor } from '@connecta/shared';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DAY, HOUR, NOW, TIME_ZONE, id, random, type Who } from './kit.js';

/**
 * Coins as quests would have paid them over the last two months, then Shop buys once each person
 * had saved enough (the looks in people.ts wear them), and today's quests part done.
 */
const BUYS: Partial<Record<Who, [string, string?][]>> = {
  fei: [['flowerCrown'], ['hoodie'], ['catTux', 'Mochi']],
  ploy: [['bunnyEars'], ['overalls'], ['catSiamese', 'Tofu']],
  earth: [['raincoat']],
  nam: [['starClips']],
  mook: [['catMidnight', 'Bean']],
};
/** How keen each is on quests: the chance a quest got done on a day */
const KEEN: Record<Who, number> = { fei: 0.9, ter: 0.6, view: 0.5, ploy: 0.9, nam: 0.7, bow: 0.6, pim: 0.3, mook: 0.85, earth: 0.75 };
const DAYS = 60;

const dateOf = (day: string) => new Date(`${day}T00:00:00Z`);

export async function seedCoins(prisma: PrismaClient) {
  let earnedAll = 0;
  for (const who of Object.keys(KEEN) as Who[]) {
    const userId = id[who];
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } });
    const rand = random(userId.length * 31 + who.charCodeAt(0));
    const queue = [...(BUYS[who] ?? [])];
    const entries: { userId: string; amount: number; reason: string; createdAt: Date }[] = [];
    const owned: { userId: string; itemId: string; name: string | null; boughtAt: Date }[] = [];
    let balance = 0;
    // Past days: quests paid in the evening
    for (let daysAgo = DAYS; daysAgo >= 1; daysAgo--) {
      const at = NOW - daysAgo * DAY;
      if (at < user.createdAt.getTime()) continue;
      questsFor(userId, dayIn(TIME_ZONE, at)).forEach((q, i) => {
        if (rand() > KEEN[who]) return;
        entries.push({ userId, amount: q.coins, reason: `quest:${q.id}`, createdAt: new Date(at + (i + 1) * HOUR) });
        balance += q.coins;
      });
      // The next thing on their wish list, once they can afford it
      const next = queue[0] && SHOP_ITEMS.find((s) => s.id === queue[0]![0]);
      if (next && balance >= next.price) {
        const boughtAt = new Date(at + 5 * HOUR);
        entries.push({ userId, amount: -next.price, reason: `shop:${next.id}`, createdAt: boughtAt });
        owned.push({ userId, itemId: next.id, name: queue[0]![1] ?? null, boughtAt });
        balance -= next.price;
        queue.shift();
      }
    }
    if (queue.length) throw new Error(`Seed: ${who} couldn't afford ${queue.map((q) => q[0]).join(', ')}; raise KEEN or DAYS`);

    // Today: the first quest done and paid, the second on its way, the third not started
    const today = dayIn(TIME_ZONE, NOW);
    const [first, second, third] = questsFor(userId, today) as [ReturnType<typeof questsFor>[number], ...ReturnType<typeof questsFor>];
    const doneToday = rand() < KEEN[who];
    const progress = [
      { questId: first.id, progress: doneToday ? first.goal : 0, paidAt: doneToday ? new Date(NOW - HOUR) : null },
      { questId: second!.id, progress: Math.floor(second!.goal / 2), paidAt: null },
      { questId: third!.id, progress: 0, paidAt: null },
    ];
    if (doneToday) {
      entries.push({ userId, amount: first.coins, reason: `quest:${first.id}`, createdAt: new Date(NOW - HOUR) });
      balance += first.coins;
    }
    await prisma.questProgress.createMany({ data: progress.map((p) => ({ userId, day: dateOf(today), ...p })) });
    await prisma.coinEntry.createMany({ data: entries });
    await prisma.ownedItem.createMany({ data: owned });
    await prisma.user.update({ where: { id: userId }, data: { coins: balance } });
    earnedAll += entries.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0);
  }
  const bought = Object.values(BUYS).reduce((n, b) => n + b.length, 0);
  console.log(`Coins: ${earnedAll.toLocaleString('en')} earned from quests, ${bought} Shop items (3 pets), today's quests part done`);
}
