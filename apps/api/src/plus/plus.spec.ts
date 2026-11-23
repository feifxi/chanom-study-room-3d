import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameRoomEvent } from '@connecta/shared';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import { GameService } from '../game/game.service.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PlusEndingService } from './plus-ending.service.js';

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
    const on = (await mai.post('/api/plus/dev', { state: 'plus' }).expect(200)).body;
    expect(on.plus).toBe(true);
    expect((await mai.get('/api/me').expect(200)).body.plus).toBe(true);
    // Turning it on twice changes nothing new for rooms
    await mai.post('/api/plus/dev', { state: 'plus' }).expect(200);
    await mai.post('/api/plus/dev', { state: 'free' }).expect(200);
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

    await mai.post('/api/plus/dev', { state: 'plus' }).expect(200);
    const plus = (await mai.get(`/api/rooms/${room.id}`).expect(200)).body;
    expect(plus).toMatchObject({ ownerPlus: true, maxCapacity: 50, maxMembers: 1000 });
    const big = (await mai.patch(`/api/rooms/${room.id}`, { size: 'big', capacity: 100 }).expect(200)).body;
    expect(big).toMatchObject({ size: 'big', capacity: 100, maxCapacity: 100 });

    // A member's own Plus doesn't change someone else's room
    const jod = await person('jod.dev');
    await jod.post('/api/plus/dev', { state: 'plus' }).expect(200);
    const { code } = (await mai.post(`/api/rooms/${room.id}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    await mai.post('/api/plus/dev', { state: 'free' }).expect(200);
    expect((await jod.get(`/api/rooms/${room.id}`).expect(200)).body).toMatchObject({ ownerPlus: false, capacity: 25 });
  });

  it('you can make 10 rooms, 30 with Plus; pictures up to 10 MB, 50 MB with Plus', async () => {
    const mai = await person('maimai');
    for (let i = 0; i < 10; i++) await mai.post('/api/rooms', { name: `Room ${i}`, mapId: 'cafe' }).expect(201);
    expect((await mai.post('/api/rooms', { name: 'One more', mapId: 'cafe' }).expect(409)).body.code).toBe('too_many_owned');
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 20 * 1024 * 1024 }).expect(400);

    await mai.post('/api/plus/dev', { state: 'plus' }).expect(200);
    await mai.post('/api/rooms', { name: 'One more', mapId: 'cafe' }).expect(201);
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 20 * 1024 * 1024 }).expect(201);
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 51 * 1024 * 1024 }).expect(400);
  });
});

describe('when Plus ends (the sweep)', () => {
  const DAY = 86_400_000;
  const sweep = (now: Date) => app.get(PlusEndingService).sweep(now);
  const inbox = async (who: Person) =>
    (await who.get('/api/notifications').expect(200)).body.items as { kind: string; text: string; href: string }[];
  const plusMails = () => sent.filter((m) => /Plus|rooms go back/.test(m.subject));

  it('a cancelled owner hears it ending, keeps their room’s space for 7 days, then the room goes back to Free', async () => {
    const mai = await person('maimai');
    await mai.post('/api/plus/dev', { state: 'plus' }).expect(200);
    const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
    await mai.patch(`/api/rooms/${room.id}`, { size: 'big', capacity: 80 }).expect(200);
    await mai.post('/api/billing/cancel').expect(200);
    const until = new Date(Date.now() + 2 * DAY);
    await prisma.user.update({ where: { id: mai.id }, data: { plusUntil: until } });
    const at = (days: number) => new Date(until.getTime() + days * DAY);
    const mails = plusMails().length;

    expect(await sweep(at(-2.5))).toBe(1);
    expect((await inbox(mai))[0]).toMatchObject({ kind: 'plus', href: '/home/plus' });
    expect((await inbox(mai))[0]!.text).toContain('Your Plus ends on');
    // Once only
    expect(await sweep(at(-2.4))).toBe(0);

    const events: GameRoomEvent[] = [];
    const spy = vi.spyOn(app.get(GameService), 'roomEvent').mockImplementation((e) => void events.push(e));
    expect(await sweep(at(0.01))).toBe(1);
    expect(events).toContainEqual({ roomId: '*', type: 'plus', userId: mai.id, plus: false });
    spy.mockRestore();
    const ended = await inbox(mai);
    // One Plus item, the newest news
    expect(ended.filter((n) => n.kind === 'plus')).toHaveLength(1);
    expect(ended[0]!.text).toContain('Chanom Friends keeps its space for 7 more days');

    expect(await sweep(at(6.5))).toBe(1);
    expect((await inbox(mai))[0]!.text).toContain('Tomorrow your rooms go back to 25 people at once and Big maps switch to Cosy');
    expect(await prisma.room.findUniqueOrThrow({ where: { id: room.id } })).toMatchObject({ size: 'big', capacity: 80 });

    expect(await sweep(at(7.01))).toBe(1);
    expect(await prisma.room.findUniqueOrThrow({ where: { id: room.id } })).toMatchObject({ size: 'cosy', capacity: 25 });
    expect(await sweep(at(9))).toBe(0);
    expect(plusMails().length - mails).toBe(3);
    expect(plusMails().at(-1)).toMatchObject({ to: 'maimai@example.com', subject: 'Tomorrow your rooms go back to Free' });
  });

  it('PromptPay gets a pay-to-renew reminder; a card that renews hears nothing', async () => {
    const mai = await person('maimai');
    const jod = await person('jod.dev');
    const start = (await mai.post('/api/billing/checkout', { plan: 'yearly', method: 'promptpay' }).expect(200)).body;
    const until = new Date((await mai.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(200)).body.until);
    await jod.post('/api/plus/dev', { state: 'plus' }).expect(200);
    const jodUntil = (await prisma.user.findUniqueOrThrow({ where: { id: jod.id } })).plusUntil!;

    await sweep(new Date(until.getTime() - 2 * DAY));
    expect((await inbox(mai))[0]).toMatchObject({ kind: 'plus', href: '/checkout?plan=yearly&method=promptpay' });
    expect((await inbox(mai))[0]!.text).toContain('Pay ฿890 with PromptPay');

    // Not paid: Plus ends, and it no longer renews
    await sweep(new Date(until.getTime() + 60_000));
    expect((await inbox(mai))[0]!.text).toBe('Your Plus has ended. Get it again any time.');
    expect((await prisma.plusSubscription.findUniqueOrThrow({ where: { userId: mai.id } })).renews).toBe(false);

    // A card renews by itself: no reminder, and Stripe's renewal gets an hour to arrive
    await sweep(new Date(jodUntil.getTime() - 2 * DAY));
    await sweep(new Date(jodUntil.getTime() + 10 * 60_000));
    expect((await inbox(jod)).filter((n) => n.kind === 'plus')).toHaveLength(0);
  });

  it('a room keeps Plus space through the grace; personal perks end on the date', async () => {
    const mai = await person('maimai');
    await mai.post('/api/plus/dev', { state: 'plus' }).expect(200);
    const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
    await mai.patch(`/api/rooms/${room.id}`, { size: 'big' }).expect(200);
    await mai.post('/api/plus/dev', { state: 'grace' }).expect(200);
    expect((await mai.get('/api/me').expect(200)).body.plus).toBe(false);
    const seen = (await mai.get(`/api/rooms/${room.id}`).expect(200)).body;
    expect(seen).toMatchObject({ ownerPlus: true, size: 'big' });
    // Still Big, so other settings save; switching a Cosy room to Big needs Plus itself
    await mai.patch(`/api/rooms/${room.id}`, { slowMode: true }).expect(200);
    const other = (await mai.post('/api/rooms', { name: 'Second', mapId: 'cafe' }).expect(201)).body;
    expect((await mai.patch(`/api/rooms/${other.id}`, { size: 'big' }).expect(403)).body.code).toBe('plus_only');
  });
});
