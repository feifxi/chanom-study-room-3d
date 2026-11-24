import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dayIn, QUESTS_QUEUE, questsFor, type QuestEvent } from '@connecta/shared';
import { browser, createTestApp, LOOK, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { QuestsService } from './quests.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let quests: QuestsService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
  quests = app.get(QuestsService);
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  await resetAccounts(prisma);
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;
const event = (userId: string, counts: QuestEvent['counts'], amount = 1, at = Date.now()): QuestEvent => ({ userId, counts, amount, at });

describe('daily quests', () => {
  it('today’s three with progress; each pays its coins once, with a coin entry', async () => {
    const mai = await person('maimai');
    const today = (await mai.get('/api/quests/today').expect(200)).body;
    const mine = questsFor(mai.id, dayIn('UTC', Date.now()));
    expect(today).toMatchObject({ coins: 0, quests: mine.map((q) => ({ id: q.id, progress: 0, goal: q.goal })) });

    // Through the queue, like the game server
    const queue = app.get<Queue>(getQueueToken(QUESTS_QUEUE));
    const [focus, together, play] = mine as [(typeof mine)[0], (typeof mine)[0], (typeof mine)[0]];
    await queue.add('event', event(mai.id, focus.counts, 1));
    for (let i = 0; i < 100 && !(await prisma.questProgress.count()); i++) await new Promise((r) => setTimeout(r, 20));
    expect((await mai.get('/api/quests/today').expect(200)).body.quests[0].progress).toBe(1);

    // All three done, at once and more than needed: paid once each
    await Promise.all(
      [focus, together, play].flatMap((q) => Array.from({ length: 3 }, () => quests.count(event(mai.id, q.counts, q.goal)))),
    );
    const after = (await mai.get('/api/quests/today').expect(200)).body;
    expect(after.coins).toBe(focus.coins + together.coins + play.coins);
    expect(after.quests.map((q: { progress: number; goal: number }) => q.progress === q.goal)).toEqual([true, true, true]);
    const entries = await prisma.coinEntry.findMany({ where: { userId: mai.id } });
    expect(entries.map((e) => e.reason).sort()).toEqual(mine.map((q) => `quest:${q.id}`).sort());
  });

  it('counts on your own day; things not in today’s quests count nothing; anonymous guests earn nothing', async () => {
    const mai = await person('maimai');
    await mai.put('/api/me/time-zone', { timeZone: 'Asia/Bangkok' }).expect(204);
    // 20:00 UTC is already tomorrow in Bangkok
    const at = Date.parse('2026-11-23T20:00:00Z');
    const q = questsFor(mai.id, '2026-11-24')[0]!;
    await quests.count(event(mai.id, q.counts, 1, at));
    const row = await prisma.questProgress.findFirstOrThrow({ where: { userId: mai.id } });
    expect(row.day.toISOString().slice(0, 10)).toBe('2026-11-24');
    // A play-group count that isn't today's play quest
    const play = questsFor(mai.id, '2026-11-24')[2]!;
    const other = (['pets', 'buddy', 'played'] as const).find((c) => c !== play.counts)!;
    await quests.count(event(mai.id, other, 1, at));
    expect(await prisma.questProgress.count()).toBe(1);

    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.put('/api/me/guest', { name: 'Mint', look: LOOK, over13: true }).expect(200);
    const guestId = (await guest.get('/api/me').expect(200)).body.id as string;
    for (const c of ['focusMinutes', 'focusRounds', 'roomMinutes', 'said', 'pets', 'buddy', 'played'] as const)
      await quests.count(event(guestId, c, 100));
    expect(await prisma.questProgress.count({ where: { userId: guestId } })).toBe(0);
  });

  it('Room chat counts towards saying things', async () => {
    const mai = await person('maimai');
    const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
    for (let i = 0; i < 2; i++) await mai.post(`/api/rooms/${id}/messages`, { text: `hi ${i}` }).expect(201);
    const together = (await mai.get('/api/quests/today').expect(200)).body.quests[1];
    // say-5 counts the messages; on a "30 min with others" day they count nothing
    expect(together.progress).toBe(together.id === 'say-5' ? 2 : 0);
  });

  it('forgets progress older than a week (paid coins stay in the ledger)', async () => {
    const mai = (await signedUp(app, sent, 'maimai')) as Browser & { id: string };
    const day = (d: string) => ({ userId: mai.id, day: new Date(d), questId: 'say-5', progress: 1 });
    await prisma.questProgress.createMany({ data: [day('2026-11-01'), day('2026-11-20')] });
    expect(await quests.purgeOld(new Date('2026-11-24T12:00:00Z'))).toBe(1);
    expect(await prisma.questProgress.count({ where: { userId: mai.id } })).toBe(1);
  });
});
