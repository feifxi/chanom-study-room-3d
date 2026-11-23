import type { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { decodeJwt } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import { PresenceService } from '../presence/presence.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CommonService } from './common.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let common: CommonService;
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
  common = app.get(CommonService);
});
afterAll(async () => {
  await app?.close();
  await redis.quit();
});
beforeEach(async () => {
  await resetAccounts(prisma);
  const keys = await redis.keys('common:*');
  if (keys.length) await redis.del(...keys);
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;

/** People made straight in the database: matchmaking only needs who they are */
async function crowd(count: number, prefix = 'p') {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${prefix}${i}`;
    await prisma.user.create({ data: { id, name: `P${i}`, email: `${id}@example.com`, handle: `${prefix}${i}` } });
    ids.push(id);
  }
  return ids;
}
const befriend = (a: string, b: string) =>
  prisma.friendship.createMany({
    data: [
      { userId: a, friendId: b },
      { userId: b, friendId: a },
    ],
  });

describe('Common rooms', () => {
  it('places strangers up to 20 in a copy, then opens the next; the ticket says Common', async () => {
    const mai = await person('maimai');
    const ids = await crowd(20);
    for (const id of ids) expect((await common.ticket(id, 'library', {})).n).toBe(1);
    const mine = (await mai.post('/api/common/library/ticket', {}).expect(200)).body;
    expect(mine).toMatchObject({ n: 2, place: 'common-library-2', name: 'Library Common Room #2', note: null });
    expect(decodeJwt(mine.ticket)).toMatchObject({
      roomId: 'common-library-2',
      role: 'member',
      capacity: 25,
      mapId: 'library',
      common: true,
    });
    const list = (await mai.get('/api/common').expect(200)).body;
    expect(list.find((t: { id: string }) => t.id === 'library')).toMatchObject({ here: 21, copies: 2 });
    await mai.post('/api/common/pool/ticket', {}).expect(404);
  });

  it('friends land together: the friend seats above 20, and joining a friend’s full copy says so', async () => {
    const mai = await person('maimai');
    const ids = await crowd(20);
    for (const id of ids) await common.ticket(id, 'cafe', {});
    // Mai's friend is in copy 1 (at 20): Walk in puts her there anyway
    await befriend(mai.id, ids[0]!);
    expect((await mai.post('/api/common/cafe/ticket', {}).expect(200)).body.n).toBe(1);
    // Joining a friend goes by where presence says they are
    const presence = app.get(PresenceService);
    await presence.openTab(ids[0]!, 'tab');
    await presence.tab(ids[0]!, 'tab', { roomId: 'common-cafe-1' });
    // Four more people joining p0 take the last seats
    const more = await crowd(4, 'q');
    for (const id of more) expect((await common.ticket(id, 'cafe', { with: ids[0] })).n).toBe(1);
    // 25: full, so p0's next friend lands elsewhere and is told
    const late = (await crowd(1, 'late'))[0]!;
    await befriend(late, ids[0]!);
    const t = await common.ticket(late, 'cafe', { with: ids[0] });
    expect(t.n).toBe(2);
    expect(t.note).toBe('P0’s copy is full, so you’re in #2.');
  });

  it('a copy closes once it’s empty and its number is used again; guests walk in as guests', async () => {
    const ids = await crowd(1);
    expect((await common.ticket(ids[0]!, 'rooftop', {})).n).toBe(1);
    const later = Date.now() + 61_000;
    const guest = await prisma.user.create({ data: { id: 'g1', name: 'Mint', email: 'g1@guest.local', isAnonymous: true } });
    const t = await common.ticket(guest.id, 'rooftop', {}, later);
    expect(t.n).toBe(1);
    expect(decodeJwt(t.ticket)).toMatchObject({ role: 'guest', name: 'Mint', handle: null });
  });
});
