import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createTestGateway, nextEvent, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AWAY_MS } from './presence.service.js';

let app: INestApplication;
let gateway: INestApplication;
let connect: (b: Browser) => Promise<Socket>;
let sent: Mail[];
let prisma: PrismaService;
const sockets: Socket[] = [];

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
  ({ gateway, connect } = await createTestGateway());
});
afterAll(async () => {
  for (const s of sockets) s.close();
  await gateway?.close();
  await app?.close();
});
beforeEach(async () => {
  for (const s of sockets.splice(0)) s.close();
  await resetAccounts(prisma);
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;
const live = async (b: Browser) => {
  const s = await connect(b);
  sockets.push(s);
  return s;
};
const settled = () => new Promise((r) => setTimeout(r, 150));

async function friends(a: Person, b: Person, bHandle: string) {
  await a.post('/api/friends/requests', { handle: bHandle }).expect(200);
  await b.post(`/api/friends/requests/${a.id}/accept`).expect(200);
}
const presenceOf = async (viewer: Browser, id: string) =>
  (await viewer.get('/api/friends').expect(200)).body.find((f: { person: { id: string } }) => f.person.id === id).presence;

/** Mai and Jod are friends; Mai has a private room */
async function setup() {
  const mai = await person('maimai');
  const jod = await person('jod');
  await friends(mai, jod, 'jod');
  const roomId = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  return { mai, jod, roomId };
}

describe('presence', () => {
  it('a friend comes online with an open tab, live, and goes offline with a last seen', async () => {
    const { mai, jod } = await setup();
    expect(await presenceOf(jod, mai.id)).toMatchObject({ status: 'offline', lastSeenAt: null, room: null });
    const jodLive = await live(jod);
    const coming = nextEvent<{ userId: string; presence: { status: string } }>(jodLive, 'presence');
    const maiLive = await live(mai);
    expect(await coming).toMatchObject({ userId: mai.id, presence: { status: 'online' } });

    const going = nextEvent(jodLive, 'presence');
    maiLive.close();
    expect(await going).toMatchObject({ presence: { status: 'offline' } });
    expect((await presenceOf(jod, mai.id)).lastSeenAt).toEqual(expect.any(String));
  });

  it('in a room: named to members, hidden for a private room you’re not in, and counted inside', async () => {
    const { mai, jod, roomId } = await setup();
    const maiLive = await live(mai);
    expect(await maiLive.emitWithAck('presence', { roomId, idleMs: 0 })).toEqual({ ok: true });
    await settled();
    // Jod isn't a member of Mai's private room
    expect((await presenceOf(jod, mai.id)).room).toMatchObject({ hidden: true, id: null, name: null, member: false });
    expect((await mai.get(`/api/rooms/${roomId}`).expect(200)).body.inside).toEqual([expect.objectContaining({ id: mai.id })]);

    const { code } = (await mai.post(`/api/rooms/${roomId}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    expect((await presenceOf(jod, mai.id)).room).toMatchObject({ hidden: false, id: roomId, name: 'Chanom Friends', member: true });

    // Watching the room's numbers
    const jodLive = await live(jod);
    await jodLive.emitWithAck('watch:inside', [roomId]);
    const leaving = nextEvent(jodLive, 'inside');
    await maiLive.emitWithAck('presence', { roomId: null });
    expect(await leaving).toEqual({ roomId, inside: 0 });
  });

  it('can’t claim a room you can’t walk into', async () => {
    const { jod, roomId } = await setup();
    const jodLive = await live(jod);
    expect(await jodLive.emitWithAck('presence', { roomId })).toEqual({ ok: false, error: 'not_found' });
  });

  it('away after 10 minutes without input in any tab', async () => {
    const { mai, jod } = await setup();
    const maiLive = await live(mai);
    await maiLive.emitWithAck('presence', { idleMs: AWAY_MS + 1000 });
    expect((await presenceOf(jod, mai.id)).status).toBe('idle');
    await maiLive.emitWithAck('presence', { idleMs: 0 });
    expect((await presenceOf(jod, mai.id)).status).toBe('online');
  });

  it('appear offline: friends see offline (no last seen), at once', async () => {
    const { mai, jod, roomId } = await setup();
    const maiLive = await live(mai);
    await maiLive.emitWithAck('presence', { roomId });
    const jodLive = await live(jod);
    const hiding = nextEvent(jodLive, 'presence');
    const me = (await mai.patch('/api/me/privacy', { appearOffline: true }).expect(200)).body;
    expect(me.appearOffline).toBe(true);
    expect(await hiding).toMatchObject({ presence: { status: 'offline', lastSeenAt: null, room: null } });
    expect(await presenceOf(jod, mai.id)).toMatchObject({ status: 'offline', room: null });
    expect((await mai.get(`/api/rooms/${roomId}`).expect(200)).body.inside).toEqual([]);
  });
});

describe('ask to join and invites', () => {
  it('asking to join a friend’s room: Send invite posts a link back', async () => {
    const { mai, jod, roomId } = await setup();
    await jod.post('/api/dms/with/maimai/ask').expect(400);
    const maiLive = await live(mai);
    await maiLive.emitWithAck('presence', { roomId });

    const ask = (await jod.post('/api/dms/with/maimai/ask').expect(201)).body;
    expect(ask).toMatchObject({ kind: 'ask', card: { roomId, state: 'open' } });
    // Only the one asked answers
    await jod.post(`/api/dms/asks/${ask.id}`, { send: true }).expect(403);
    const answered = (await mai.post(`/api/dms/asks/${ask.id}`, { send: true }).expect(201)).body;
    expect(answered.card.state).toBe('sent');
    await mai.post(`/api/dms/asks/${ask.id}`, { send: true }).expect(409);

    const page = (await jod.get(`/api/dms/${ask.dmId}/messages`).expect(200)).body.messages;
    const invite = page.find((m: { kind: string }) => m.kind === 'invite');
    expect(invite).toMatchObject({
      author: { id: mai.id },
      card: { roomId, invite: { kind: 'member' }, room: { name: 'Chanom Friends' } },
    });
    await jod.post(`/api/invites/${invite.card.invite.code}/accept`).expect(200);
  });

  it('invite to a room: a member invite, or a guest pass when members may not invite', async () => {
    const { mai, jod, roomId } = await setup();
    const { code } = (await mai.post(`/api/rooms/${roomId}/invites`, { kind: 'member' }).expect(200)).body;
    const ploy = await person('ployy');
    await friends(ploy, jod, 'jod');
    await ploy.post(`/api/invites/${code}/accept`).expect(200);

    const card = (await ploy.post('/api/dms/with/jod/invite', { roomId }).expect(201)).body;
    expect(card).toMatchObject({ kind: 'invite', card: { invite: { kind: 'member' }, room: { name: 'Chanom Friends' } } });
    await mai.patch(`/api/rooms/${roomId}`, { membersCanInvite: false }).expect(200);
    expect((await ploy.post('/api/dms/with/jod/invite', { roomId }).expect(201)).body.card.invite.kind).toBe('guest');
    // Room settings still refuse members' own links
    await ploy.post(`/api/rooms/${roomId}/invites`, { kind: 'guest' }).expect(403);
    await mai.patch(`/api/rooms/${roomId}`, { allowGuests: false }).expect(200);
    expect((await ploy.post('/api/dms/with/jod/invite', { roomId }).expect(403)).body.code).toBe('cant_invite');
    // Not your room
    await jod.post('/api/dms/with/ployy/invite', { roomId }).expect(404);
  });
});
