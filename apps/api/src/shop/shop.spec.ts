import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameRoomEvent } from '@connecta/shared';
import { browser, createTestApp, LOOK, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
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
const coins = (id: string, n: number) => prisma.user.update({ where: { id }, data: { coins: n } });

describe('the Shop', () => {
  it('buys with coins once, with a coin entry; not enough coins or a second buy is refused', async () => {
    const mai = await person('maimai');
    expect((await mai.get('/api/shop/wardrobe').expect(200)).body).toEqual({ coins: 0, owned: [] });
    expect((await mai.post('/api/shop/items/halo/buy').expect(400)).body.code).toBe('not_enough_coins');
    await mai.post('/api/shop/items/a-crown/buy').expect(404);

    await coins(mai.id, 500);
    expect((await mai.post('/api/shop/items/halo/buy').expect(200)).body).toEqual({ coins: 200, owned: ['halo'] });
    await mai.post('/api/shop/items/halo/buy').expect(409);
    const entries = await prisma.coinEntry.findMany({ where: { userId: mai.id } });
    expect(entries).toEqual([expect.objectContaining({ amount: -300, reason: 'shop:halo' })]);
  });

  it('two buys at once never spend more than you have', async () => {
    const mai = await person('maimai');
    await coins(mai.id, 300);
    const results = await Promise.all([mai.post('/api/shop/items/bunnyEars/buy'), mai.post('/api/shop/items/bearEars/buy')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect((await mai.get('/api/shop/wardrobe').expect(200)).body).toMatchObject({ coins: 100 });
    // The same item twice at once: one buy
    await coins(mai.id, 1000);
    const same = await Promise.all([mai.post('/api/shop/items/halo/buy'), mai.post('/api/shop/items/halo/buy')]);
    expect(same.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await mai.get('/api/shop/wardrobe').expect(200)).body).toMatchObject({ coins: 700 });
  });

  it('a look may only use what you own; a saved look goes to every room you’re in', async () => {
    const mai = await person('maimai');
    const events: GameRoomEvent[] = [];
    const spy = vi.spyOn(app.get(GameService), 'roomEvent').mockImplementation((e) => void events.push(e));
    const look = { ...LOOK, accessory: 'witchHat', style: 'yukata' };
    expect((await mai.patch('/api/me/profile', { look }).expect(400)).body.code).toBe('not_owned');
    await coins(mai.id, 2000);
    await mai.post('/api/shop/items/witchHat/buy').expect(200);
    await mai.patch('/api/me/profile', { look }).expect(400); // the yukata isn't yours yet
    await mai.post('/api/shop/items/yukata/buy').expect(200);
    const me = (await mai.patch('/api/me/profile', { look }).expect(200)).body;
    expect(me.look).toMatchObject({ accessory: 'witchHat', style: 'yukata' });
    expect(events).toEqual([{ roomId: '*', type: 'look', userId: mai.id, look: expect.objectContaining({ style: 'yukata' }) }]);
    spy.mockRestore();

    // A guest (no account) picks from the free set only
    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.put('/api/me/guest', { name: 'Mint', look }).expect(400);
    await guest.put('/api/me/guest', { name: 'Mint', look: LOOK }).expect(200);
  });
});
