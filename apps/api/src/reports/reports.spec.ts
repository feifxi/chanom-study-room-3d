import type { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import { CommonService } from '../common/common.service.js';
import type { Mail } from '../mail/mail.service.js';
import { PresenceService } from '../presence/presence.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { REPORTS_PER_HOUR, ReportsService } from './reports.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let reports: ReportsService;
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
  reports = app.get(ReportsService);
});
afterAll(async () => {
  await app?.close();
  await redis.quit();
});
beforeEach(async () => {
  await resetAccounts(prisma);
  const keys = [...(await redis.keys('reports:*')), ...(await redis.keys('common:*')), ...(await redis.keys('presence:inside:common-*'))];
  if (keys.length) await redis.del(...keys);
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;

/** People made straight in the database: the automatic steps only need who they are */
async function crowd(count: number, prefix: string, guest = false) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${prefix}${i}`;
    await prisma.user.create({ data: { id, name: `P${i}`, email: `${id}@example.com`, handle: guest ? null : id, isAnonymous: guest } });
    ids.push(id);
  }
  return ids;
}

/** Mai owns a room; Jod and the crowd are members */
async function room(members: string[]) {
  const mai = await person('maimai');
  const jod = await person('jod');
  const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
  await jod.post(`/api/invites/${code}/accept`).expect(200);
  await prisma.membership.createMany({ data: members.map((userId) => ({ roomId: id, userId })) });
  return { mai, jod, id };
}

describe('reports', () => {
  it('keep a message with what was said around it, for the team only', async () => {
    const { mai, jod, id } = await room([]);
    await mai.post(`/api/rooms/${id}/messages`, { text: 'how was the exam?' }).expect(201);
    const bad = (await jod.post(`/api/rooms/${id}/messages`, { text: 'mind your own business' }).expect(201)).body;
    await mai.post('/api/reports', { kind: 'message', messageId: bad.id, reason: 'harass', details: 'rude' }).expect(200);
    const [row] = await prisma.report.findMany();
    expect(row).toMatchObject({
      kind: 'message',
      userId: jod.id,
      place: id,
      reason: 'harass',
      details: 'rude',
      reporterId: mai.id,
      counted: true,
    });
    expect(row!.context).toMatchObject({
      reported: { handle: 'jod' },
      message: { text: 'mind your own business' },
      around: [{ text: 'how was the exam?' }],
      placeName: 'Chanom Friends',
    });
    // Someone outside the room can't report what they can't see; nobody reports themselves
    const ploy = await person('ployy');
    await ploy.post('/api/reports', { kind: 'message', messageId: bad.id, reason: 'harass' }).expect(404);
    await jod.post('/api/reports', { kind: 'person', userId: jod.id, reason: 'spam' }).expect(400);
  });

  it('3 accounts in 10 minutes mute someone in the room for 15 minutes; one account counts once, guests not at all', async () => {
    const crowdIds = await crowd(3, 'm');
    const [guest] = await crowd(1, 'g', true);
    const { jod, id } = await room(crowdIds);
    const say = (text: string) => jod.post(`/api/rooms/${id}/messages`, { text });
    const now = Date.now();
    await reports.report(crowdIds[0]!, { kind: 'person', userId: jod.id, place: id, reason: 'harass' }, now);
    await reports.report(crowdIds[0]!, { kind: 'person', userId: jod.id, place: id, reason: 'harass' }, now + 1000);
    await reports.report(guest!, { kind: 'person', userId: jod.id, place: id, reason: 'harass' }, now + 2000);
    await say('still here').expect(201);
    await reports.report(crowdIds[1]!, { kind: 'person', userId: jod.id, place: id, reason: 'harass' }, now + 3000);
    await say('still here').expect(201);
    await reports.report(crowdIds[2]!, { kind: 'person', userId: jod.id, place: id, reason: 'harass', bubbles: ['go away'] }, now + 4000);
    expect((await say('hello?').expect(403)).body).toMatchObject({ code: 'timed_out' });
    const member = await prisma.membership.findUnique({ where: { roomId_userId: { roomId: id, userId: jod.id } } });
    expect(member!.timedOutUntil!.getTime()).toBe(now + 4000 + 15 * 60_000);
    const rows = await prisma.report.findMany({ orderBy: { createdAt: 'asc' } });
    expect(rows.map((r) => r.counted)).toEqual([true, true, false, true, true]);
    expect(rows.at(-1)).toMatchObject({ step: 'muted', context: { bubblesSeen: ['go away'] } });
  });

  it('one account sends at most 10 reports an hour', async () => {
    const [mai] = await crowd(1, 'r');
    const { jod } = await room([mai!]);
    const send = () => reports.report(mai!, { kind: 'person', userId: jod.id, reason: 'spam' });
    for (let i = 0; i < REPORTS_PER_HOUR; i++) await send();
    await expect(send()).rejects.toMatchObject({ status: 429 });
    // An hour on, they may again
    await expect(reports.report(mai!, { kind: 'person', userId: jod.id, reason: 'spam' }, Date.now() + 61 * 60_000)).resolves.toBeTruthy();
  });

  it('never mutes the owner, and reports older than the window don’t add up', async () => {
    const crowdIds = await crowd(3, 'm');
    const { mai, jod, id } = await room(crowdIds);
    const now = Date.now();
    for (const [i, r] of crowdIds.entries())
      await reports.report(r, { kind: 'person', userId: mai.id, place: id, reason: 'harass' }, now + i);
    await mai.post(`/api/rooms/${id}/messages`, { text: 'still mine' }).expect(201);
    await reports.report(crowdIds[0]!, { kind: 'person', userId: jod.id, place: id, reason: 'spam' }, now);
    await reports.report(crowdIds[1]!, { kind: 'person', userId: jod.id, place: id, reason: 'spam' }, now + 1000);
    await reports.report(crowdIds[2]!, { kind: 'person', userId: jod.id, place: id, reason: 'spam' }, now + 11 * 60_000);
    await jod.post(`/api/rooms/${id}/messages`, { text: 'fine' }).expect(201);
  });

  it('never takes an automatic step against a team account', async () => {
    const crowdIds = await crowd(3, 'm');
    const { jod, id } = await room(crowdIds);
    await prisma.user.update({ where: { id: jod.id }, data: { team: true } });
    for (const r of crowdIds) await reports.report(r, { kind: 'person', userId: jod.id, place: id, reason: 'spam' });
    await jod.post(`/api/rooms/${id}/messages`, { text: 'still here' }).expect(201);
    expect(await prisma.report.count({ where: { step: { not: null } } })).toBe(0);
  });

  it('5 accounts in a Common copy put someone out of Common rooms for an hour', async () => {
    const presence = app.get(PresenceService);
    const [target, ...others] = await crowd(7, 'c');
    const place = 'common-cafe-1';
    for (const id of [target!, ...others.slice(0, 5)]) {
      await presence.openTab(id, 'tab');
      await presence.tab(id, 'tab', { roomId: place });
    }
    // Someone not in the copy doesn't count
    await reports.report(others[5]!, { kind: 'person', userId: target!, place, reason: 'hate' });
    for (const r of others.slice(0, 4)) await reports.report(r, { kind: 'person', userId: target!, place, reason: 'hate' });
    const common = app.get(CommonService);
    await common.ticket(target!, 'library', {});
    await reports.report(others[4]!, { kind: 'person', userId: target!, place, reason: 'hate' });
    await expect(common.ticket(target!, 'library', {})).rejects.toMatchObject({ response: { code: 'common_out' } });
    expect(await redis.pttl(`common:out:${target}`)).toBeGreaterThan(59 * 60_000);
    expect((await prisma.report.findMany({ where: { step: 'common_out' } })).length).toBe(1);
  });

  it('a room goes to the team (not your own), with the right reasons; reporting can block', async () => {
    const { mai, jod, id } = await room([]);
    await mai.post('/api/reports', { kind: 'room', place: id, reason: 'room_inside' }).expect(400);
    await jod.post('/api/reports', { kind: 'room', place: id, reason: 'harass' }).expect(400);
    await jod.post('/api/reports', { kind: 'room', place: id, reason: 'room_about', details: 'scam link in the rules' }).expect(200);
    expect(await prisma.report.findFirst({ where: { kind: 'room' } })).toMatchObject({
      place: id,
      context: { room: { name: 'Chanom Friends', ownerId: mai.id } },
    });
    await jod.post('/api/reports', { kind: 'person', userId: mai.id, reason: 'spam', block: true }).expect(200);
    expect(await prisma.block.findFirst({ where: { userId: jod.id, blockedId: mai.id } })).not.toBeNull();
  });
});
