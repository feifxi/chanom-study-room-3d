import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameRoomEvent } from '@connecta/shared';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import { GameService } from '../game/game.service.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  await resetAccounts(prisma);
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;

describe('Connecta Plus', () => {
  it('turns on (dev switch), shows on your account, and tells every room you’re in', async () => {
    const mai = await person('maimai');
    expect((await mai.get('/api/me').expect(200)).body).toMatchObject({ plus: false, plusUntil: null });
    const events: GameRoomEvent[] = [];
    const spy = vi.spyOn(app.get(GameService), 'roomEvent').mockImplementation((e) => void events.push(e));
    const on = (await mai.post('/api/plus/dev', { on: true }).expect(200)).body;
    expect(on.plus).toBe(true);
    expect((await mai.get('/api/me').expect(200)).body.plus).toBe(true);
    // Turning it on twice changes nothing new for rooms
    await mai.post('/api/plus/dev', { on: true }).expect(200);
    await mai.post('/api/plus/dev', { on: false }).expect(200);
    expect(events).toEqual([
      { roomId: '*', type: 'plus', userId: mai.id, plus: true },
      { roomId: '*', type: 'plus', userId: mai.id, plus: false },
    ]);
    spy.mockRestore();
    expect((await mai.get('/api/plus').expect(200)).body.plus).toBe(false);
  });

  it('a room follows its owner’s plan: people at once, members and Big maps', async () => {
    const mai = await person('maimai');
    const room = (await mai.post('/api/rooms', { name: 'Plus room', mapId: 'library' }).expect(201)).body;
    expect(room).toMatchObject({ ownerPlus: false, maxCapacity: 25, maxMembers: 150 });
    await mai.patch(`/api/rooms/${room.id}`, { size: 'big' }).expect(403);

    await mai.post('/api/plus/dev', { on: true }).expect(200);
    const plus = (await mai.get(`/api/rooms/${room.id}`).expect(200)).body;
    expect(plus).toMatchObject({ ownerPlus: true, maxCapacity: 50, maxMembers: 1000 });
    const big = (await mai.patch(`/api/rooms/${room.id}`, { size: 'big', capacity: 100 }).expect(200)).body;
    expect(big).toMatchObject({ size: 'big', capacity: 100, maxCapacity: 100 });

    // A member's own Plus doesn't change someone else's room
    const jod = await person('jod.dev');
    await jod.post('/api/plus/dev', { on: true }).expect(200);
    const { code } = (await mai.post(`/api/rooms/${room.id}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    await mai.post('/api/plus/dev', { on: false }).expect(200);
    expect((await jod.get(`/api/rooms/${room.id}`).expect(200)).body).toMatchObject({ ownerPlus: false, capacity: 25 });
  });

  it('you can make 10 rooms, 30 with Plus; pictures up to 10 MB, 50 MB with Plus', async () => {
    const mai = await person('maimai');
    for (let i = 0; i < 10; i++) await mai.post('/api/rooms', { name: `Room ${i}`, mapId: 'cafe' }).expect(201);
    expect((await mai.post('/api/rooms', { name: 'One more', mapId: 'cafe' }).expect(409)).body.code).toBe('too_many_owned');
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 20 * 1024 * 1024 }).expect(400);

    await mai.post('/api/plus/dev', { on: true }).expect(200);
    await mai.post('/api/rooms', { name: 'One more', mapId: 'cafe' }).expect(201);
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 20 * 1024 * 1024 }).expect(201);
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 51 * 1024 * 1024 }).expect(400);
  });
});
