import type { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { decodeJwt } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
});
afterAll(async () => {
  await app?.close();
  await redis.quit();
});
beforeEach(() => resetAccounts(prisma));
// Settings outlive the accounts: put them back as the migration left them
afterEach(async () => {
  await prisma.setting.deleteMany();
  await prisma.blockedWord.deleteMany({ where: { word: { in: ['zzbadword', 'scamlink.example'] } } });
  await app.get(SettingsService).publish();
  // Common room keys aren't per environment: don't leave a test notice for a running dev server
  await redis.del('common:notice');
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;

async function setup() {
  const t = await person('teamtam');
  await prisma.user.update({ where: { id: t.id }, data: { team: true } });
  const mai = await person('maimai');
  const jod = await person('jod');
  const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  await prisma.membership.create({ data: { roomId: id, userId: jod.id } });
  return { t, mai, jod, id };
}

describe('the admin site: rooms', () => {
  it('lists rooms by name or owner; closing and reopening email the owner, delisting leaves Discover', async () => {
    const { t, mai, jod, id } = await setup();
    await mai.get('/api/admin/rooms').expect(404);
    await prisma.room.update({ where: { id }, data: { visibility: 'open' } });
    expect((await t.get('/api/admin/rooms?q=@maimai').expect(200)).body.rooms).toMatchObject([
      { id, name: 'Chanom Friends', owner: { handle: 'maimai' }, members: 2, state: 'ok', visibility: 'open' },
    ]);
    expect((await t.get('/api/admin/rooms?filter=closed').expect(200)).body.total).toBe(0);

    await t.post(`/api/admin/rooms/${id}/actions`, { kind: 'relist', reason: 'nothing to undo' }).expect(400);
    await t.post(`/api/admin/rooms/${id}/actions`, { kind: 'delist', reason: 'x' }).expect(400);
    expect((await t.post(`/api/admin/rooms/${id}/actions`, { kind: 'delist', reason: 'Misleading name' }).expect(200)).body.state).toBe(
      'delisted',
    );
    expect((await jod.get('/api/rooms/listed').expect(200)).body).toEqual([]);
    expect(sent.findLast((m) => m.to === 'maimai@example.com')).toMatchObject({ subject: 'Chanom Friends was taken off Discover' });
    expect((await t.get('/api/admin/rooms?filter=listed').expect(200)).body.total).toBe(0);

    await t.post(`/api/admin/rooms/${id}/actions`, { kind: 'close', reason: 'Selling accounts' }).expect(200);
    expect((await jod.post(`/api/rooms/${id}/ticket`).expect(403)).body.code).toBe('closed');
    expect((await t.get('/api/admin/rooms?filter=closed').expect(200)).body.rooms[0]).toMatchObject({ id, state: 'closed' });
    // Reopened: back to how it was, on Discover too
    await t.post(`/api/admin/rooms/${id}/actions`, { kind: 'reopen', reason: 'Appeal accepted' }).expect(200);
    await jod.post(`/api/rooms/${id}/ticket`).expect(200);
    expect((await jod.get('/api/rooms/listed').expect(200)).body.map((r: { id: string }) => r.id)).toEqual([id]);
    expect(sent.findLast((m) => m.to === 'maimai@example.com')?.subject).toBe('Chanom Friends is open again');
    expect(await prisma.auditEntry.count({ where: { targetId: id } })).toBe(3);
  });
});

describe('the admin site: moderation', () => {
  it('a word added masks at once; switching the filter off lets everything through', async () => {
    const { t, mai, id } = await setup();
    await mai.get('/api/admin/moderation').expect(404);
    const before = (await t.get('/api/admin/moderation').expect(200)).body;
    expect(before).toMatchObject({ wordFilter: true, reportSteps: true, pictureCheck: true });
    // The migration's list, Thai included
    expect(before.words).toContain('เหี้ย');

    await t.post('/api/admin/moderation/words', { word: 'ZZBadWord' }).expect(200);
    await t.post('/api/admin/moderation/words', { word: 'zzbadword' }).expect(400);
    expect((await mai.post(`/api/rooms/${id}/messages`, { text: 'you zzbadword' }).expect(201)).body.text).toBe('you *********');
    await mai.patch(`/api/rooms/${id}`, { name: 'zzbadword club' }).expect(400);

    await t.delete('/api/admin/moderation/words/zzbadword').expect(200);
    expect((await mai.post(`/api/rooms/${id}/messages`, { text: 'you zzbadword' }).expect(201)).body.text).toBe('you zzbadword');

    expect((await t.patch('/api/admin/moderation', { wordFilter: false }).expect(200)).body.wordFilter).toBe(false);
    expect((await mai.post(`/api/rooms/${id}/messages`, { text: 'what the fuck' }).expect(201)).body.text).toBe('what the fuck');
    expect(await prisma.auditEntry.count({ where: { targetKind: 'setting' } })).toBe(3);
  });

  it('with report steps off, reports still reach the team but nobody is muted', async () => {
    const { t, id } = await setup();
    await t.patch('/api/admin/moderation', { reportSteps: false }).expect(200);
    const target = (await person('ployy')).id;
    const reporters = await Promise.all(['aa1', 'aa2', 'aa3'].map(person));
    await prisma.membership.createMany({ data: [target, ...reporters.map((r) => r.id)].map((userId) => ({ roomId: id, userId })) });
    for (const r of reporters) await r.post('/api/reports', { kind: 'person', userId: target, place: id, reason: 'spam' }).expect(200);
    expect(await prisma.report.count()).toBe(3);
    expect(await prisma.report.count({ where: { step: { not: null } } })).toBe(0);
    expect((await prisma.membership.findUnique({ where: { roomId_userId: { roomId: id, userId: target } } }))?.timedOutUntil).toBeNull();
  });
});

describe('the admin site: Common rooms', () => {
  it('holds a copy to 30 even when a bigger number was saved before the limit', async () => {
    await prisma.setting.upsert({
      where: { key: 'platform' },
      create: { key: 'platform', value: { commonCapacity: 50, commonFriendSeats: 5 } },
      update: { value: { commonCapacity: 50, commonFriendSeats: 5 } },
    });
    const settings = await app.get(SettingsService).publish();
    expect(settings).toMatchObject({ commonCapacity: 30, commonFriendSeats: 5 });
  });

  it('sets how full a copy gets, and posts a notice that walking in carries', async () => {
    const { t, jod } = await setup();
    await t.put('/api/admin/common/seats', { capacity: 10, friendSeats: 10 }).expect(400);
    // Never past the 30 a map is built for
    await t.put('/api/admin/common/seats', { capacity: 31, friendSeats: 5 }).expect(400);
    const after = (await t.put('/api/admin/common/seats', { capacity: 12, friendSeats: 2 }).expect(200)).body;
    expect(after).toMatchObject({ capacity: 12, friendSeats: 2, notice: null });
    const walk = (await jod.post('/api/common/cafe/ticket', {}).expect(200)).body;
    expect(walk.capacity).toBe(12);
    expect(decodeJwt(walk.ticket)).toMatchObject({ capacity: 12 });

    const posted = (await t.post('/api/admin/common/notice', { text: 'Quick restart at 03:00 🌙' }).expect(200)).body;
    expect(posted.notice.text).toBe('Quick restart at 03:00 🌙');
    expect(decodeJwt((await jod.post('/api/common/library/ticket', {}).expect(200)).body.ticket)).toMatchObject({
      notice: { text: 'Quick restart at 03:00 🌙' },
    });
  });
});
