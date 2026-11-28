import type { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { decodeJwt, jwtVerify } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GAME_CHANNELS, TICKET_AUDIENCE, type GameRoomEvent, type GameTicket } from '@connecta/shared';
import { browser, createTestApp, createTestGateway, LOOK, resetAccounts, signedUp } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import { PresenceService } from '../presence/presence.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let sub: Redis;
let pub: Redis;
const events: GameRoomEvent[] = [];

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
  sub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  pub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  await sub.subscribe(GAME_CHANNELS.rooms);
  sub.on('message', (_c, raw) => events.push(JSON.parse(raw) as GameRoomEvent));
});
afterAll(async () => {
  await Promise.allSettled([sub.quit(), pub.quit()]);
  await app?.close();
});
beforeEach(async () => {
  events.length = 0;
  await resetAccounts(prisma);
});

const person = (handle: string) => signedUp(app, sent, handle);
const eventually = async (check: () => unknown) => {
  for (let i = 0; i < 50 && !check(); i++) await new Promise((r) => setTimeout(r, 20));
  expect(check()).toBeTruthy();
};

async function maisRoom() {
  const mai = await person('maimai');
  const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
  return { mai, id: room.id as string };
}
async function joinByInvite(mai: Awaited<ReturnType<typeof person>>, id: string, handle: string) {
  const b = await person(handle);
  const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
  await b.post(`/api/invites/${code}/accept`).expect(200);
  return b;
}

describe('join tickets', () => {
  it('gives members a signed minute-long ticket with their name, look, role and the room', async () => {
    const { mai, id } = await maisRoom();
    const { ticket, place } = (await mai.post(`/api/rooms/${id}/ticket`).expect(200)).body;
    expect(place).toBe(id);
    const { payload } = await jwtVerify(ticket, new TextEncoder().encode(process.env.GAME_SECRET), { audience: TICKET_AUDIENCE });
    expect(payload).toMatchObject({
      sub: mai.id,
      roomId: id,
      handle: 'maimai',
      name: 'maimai',
      look: LOOK,
      role: 'owner',
      capacity: 15,
      mapId: 'library',
      timedOutUntil: 0,
      guestVoice: false,
    } satisfies Partial<GameTicket>);
    expect(payload.exp! - payload.iat!).toBe(60);
  });

  it('lets guests in with a pass, and nobody else', async () => {
    const { mai, id } = await maisRoom();
    const jod = await person('jod');
    await jod.post(`/api/rooms/${id}/ticket`).expect(404);

    const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'guest' }).expect(200)).body;
    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.put('/api/me/guest', { name: 'Mint', look: LOOK, over13: true }).expect(200);
    await guest.post(`/api/invites/${code}/accept`).expect(200);
    const { ticket } = (await guest.post(`/api/rooms/${id}/ticket`).expect(200)).body;
    expect(decodeJwt(ticket)).toMatchObject({ role: 'guest', name: 'Mint', handle: null });

    // Kicking a guest ends their pass, inside 3D at once
    const guestId = (await guest.get('/api/me').expect(200)).body.id;
    await mai.delete(`/api/rooms/${id}/members/${guestId}`).expect(204);
    await eventually(() => events.some((e) => e.type === 'kick' && e.userId === guestId));
    await guest.post(`/api/rooms/${id}/ticket`).expect(404);
  });

  it('carries a time out, and a time out given while inside reaches the room at once', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    await mai.put(`/api/rooms/${id}/members/${ken.id}/timeout`, { duration: '10m' }).expect(204);
    await eventually(() => events.some((e) => e.type === 'timeout' && e.userId === ken.id));
    const until = (events.find((e) => e.type === 'timeout') as { until: number }).until;
    expect(until - Date.now()).toBeGreaterThan(9 * 60_000);
    const { ticket } = (await ken.post(`/api/rooms/${id}/ticket`).expect(200)).body;
    expect(decodeJwt(ticket).timedOutUntil).toBe(until);
  });

  it('refuses the banned', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    await mai.put(`/api/rooms/${id}/bans/${ken.id}`, {}).expect(204);
    await ken.post(`/api/rooms/${id}/ticket`).expect(403);
  });
});

describe('room events for the game server', () => {
  it('kick, ban, leave, a new role, a new map and guest voice reach the people inside', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    const jod = await joinByInvite(mai, id, 'jod');
    const pim = await joinByInvite(mai, id, 'pimpim');

    await mai.put(`/api/rooms/${id}/members/${ken.id}/role`, { role: 'mod' }).expect(204);
    await mai.patch(`/api/rooms/${id}`, { mapId: 'cafe' }).expect(200);
    await mai.patch(`/api/rooms/${id}`, { guestVoice: true }).expect(200);
    await mai.patch(`/api/rooms/${id}`, { guestVoice: true }).expect(200);
    await mai.delete(`/api/rooms/${id}/members/${jod.id}`).expect(204);
    await mai.put(`/api/rooms/${id}/bans/${pim.id}`, {}).expect(204);
    await ken.delete(`/api/rooms/${id}/me`).expect(204);
    await eventually(() => events.length >= 6);
    expect(events).toEqual([
      { roomId: id, type: 'role', userId: ken.id, role: 'mod' },
      { roomId: id, type: 'map', mapId: 'cafe' },
      { roomId: id, type: 'guestVoice', on: true },
      { roomId: id, type: 'kick', userId: jod.id },
      { roomId: id, type: 'ban', userId: pim.id },
      { roomId: id, type: 'left', userId: ken.id },
    ]);
  });

  it('deleting the room sends everyone out', async () => {
    const { mai, id } = await maisRoom();
    await mai.delete(`/api/rooms/${id}`).send({ name: 'Chanom Friends' }).expect(204);
    await eventually(() => events.some((e) => e.type === 'deleted' && e.roomId === id));
  });
});

describe('presence from the game server', () => {
  it('counts a game connection as being in the room, until it closes', async () => {
    const { gateway } = await createTestGateway();
    try {
      const { mai, id } = await maisRoom();
      const presence = app.get(PresenceService);
      const say = (roomId: string | null) =>
        pub.publish(GAME_CHANNELS.presence, JSON.stringify({ userId: mai.id, tabId: 'game:s1', roomId }));
      await say(id);
      for (let i = 0; i < 50 && !(await presence.inside(id)).includes(mai.id); i++) await new Promise((r) => setTimeout(r, 20));
      expect(await presence.inside(id)).toContain(mai.id);
      await say(null);
      for (let i = 0; i < 50 && (await presence.inside(id)).includes(mai.id); i++) await new Promise((r) => setTimeout(r, 20));
      expect(await presence.inside(id)).not.toContain(mai.id);
    } finally {
      await gateway.close();
    }
  });
});
