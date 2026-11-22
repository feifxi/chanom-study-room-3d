import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createTestGateway, nextEvent, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

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
beforeEach(() => resetAccounts(prisma));

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;
const live = async (b: Browser) => {
  const s = await connect(b);
  sockets.push(s);
  return s;
};

async function friends(a: Person, b: Person, bHandle: string) {
  await a.post('/api/friends/requests', { handle: bHandle }).expect(200);
  await b.post(`/api/friends/requests/${a.id}/accept`).expect(200);
}

/** Mai and Jod, friends, with their DM open */
async function pair() {
  const mai = await person('maimai');
  const jod = await person('jod');
  await friends(mai, jod, 'jod');
  const dm = (await mai.put('/api/dms/with/jod').expect(200)).body;
  return { mai, jod, dmId: dm.id as string };
}

describe('DMs', () => {
  it('one chat per pair, whoever opens it, and it stays out of lists until a message', async () => {
    const { mai, jod, dmId } = await pair();
    const fromJod = (await jod.put('/api/dms/with/maimai').expect(200)).body;
    expect(fromJod).toMatchObject({ id: dmId, friend: true, blocked: false, with: { handle: 'maimai' } });
    expect((await mai.get('/api/dms').expect(200)).body).toEqual([]);

    await mai.post(`/api/dms/${dmId}/messages`, { text: 'are you studying today?' }).expect(201);
    const [summary] = (await jod.get('/api/dms').expect(200)).body;
    expect(summary).toMatchObject({
      id: dmId,
      with: { handle: 'maimai' },
      unread: 1,
      last: { text: 'are you studying today?', mine: false },
    });
    expect((await mai.get('/api/dms').expect(200)).body[0]).toMatchObject({ unread: 0, last: { mine: true } });
  });

  it('arrives live for both, with typing, and reading clears the unread count', async () => {
    const { mai, jod, dmId } = await pair();
    const jodLive = await live(jod);
    const maiLive = await live(mai);

    const typing = nextEvent(jodLive, 'typing');
    maiLive.emit('typing:dm', dmId);
    expect(await typing).toMatchObject({ dmId, person: { handle: 'maimai' } });

    const arriving = nextEvent<{ id: string; dmId: string }>(jodLive, 'message');
    const msg = (await mai.post(`/api/dms/${dmId}/messages`, { text: 'come to the library 🐱 @jod' }).expect(201)).body;
    expect(await arriving).toMatchObject({ id: msg.id, dmId, roomId: null });
    expect(msg.mentions).toEqual([jod.id]);

    await jod.put(`/api/dms/${dmId}/read`, { messageId: msg.id }).expect(204);
    expect((await jod.get('/api/dms').expect(200)).body[0].unread).toBe(0);
  });

  it('reacting, editing and deleting work like room chat, and only the two can see it', async () => {
    const { mai, jod, dmId } = await pair();
    const msg = (await mai.post(`/api/dms/${dmId}/messages`, { text: 'hi' }).expect(201)).body;
    await jod.put(`/api/messages/${msg.id}/reactions`, { emoji: '💖' }).expect(200);
    await mai.patch(`/api/messages/${msg.id}`, { text: 'hi!!' }).expect(200);
    // Only your own, even for a friend
    await jod.delete(`/api/messages/${msg.id}`).expect(403);

    const ploy = await person('ployy');
    await ploy.get(`/api/dms/${dmId}/messages`).expect(404);
    await ploy.put(`/api/messages/${msg.id}/reactions`, { emoji: '😂' }).expect(404);

    const page = (await jod.get(`/api/dms/${dmId}/messages`).expect(200)).body;
    expect(page.messages[0]).toMatchObject({ text: 'hi!!', reactions: [{ emoji: '💖', userIds: [jod.id] }] });
    await mai.delete(`/api/messages/${msg.id}`).expect(204);
    expect((await jod.get(`/api/dms/${dmId}/messages`).expect(200)).body.messages).toEqual([]);
  });

  it('only friends: no new chat with a stranger, and unfriending makes it read-only history', async () => {
    const { mai, jod, dmId } = await pair();
    await person('ployy');
    expect((await mai.put('/api/dms/with/ployy').expect(200)).body).toMatchObject({ id: null, friend: false });
    await mai.put('/api/dms/with/nobody_here').expect(404);

    const msg = (await mai.post(`/api/dms/${dmId}/messages`, { text: 'gg last night' }).expect(201)).body;
    await jod.delete(`/api/friends/${mai.id}`).expect(204);

    const res = await mai.post(`/api/dms/${dmId}/messages`, { text: 'hello?' }).expect(403);
    expect(res.body.code).toBe('not_friends');
    await jod.put(`/api/messages/${msg.id}/reactions`, { emoji: '👍' }).expect(403);
    // The history stays, and your own messages are still yours to delete
    expect((await jod.put('/api/dms/with/maimai').expect(200)).body).toMatchObject({ id: dmId, friend: false });
    expect((await jod.get(`/api/dms/${dmId}/messages`).expect(200)).body.messages).toHaveLength(1);
    await mai.delete(`/api/messages/${msg.id}`).expect(204);
  });

  it('blocking stops messages both ways and shows as blocked to the blocker', async () => {
    const { mai, jod, dmId } = await pair();
    await mai.put(`/api/blocks/${jod.id}`).expect(204);
    expect((await mai.put('/api/dms/with/jod').expect(200)).body).toMatchObject({ id: dmId, friend: false, blocked: true });
    await jod.post(`/api/dms/${dmId}/messages`, { text: 'hey' }).expect(403);
    await mai.post(`/api/dms/${dmId}/messages`, { text: 'hey' }).expect(403);
  });

  it('shows the rooms you share', async () => {
    const { mai, jod } = await pair();
    const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id;
    await mai.post('/api/rooms', { name: 'Just Mai', mapId: 'cafe' }).expect(201);
    const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    expect((await jod.put('/api/dms/with/maimai').expect(200)).body.sharedRooms).toEqual([
      expect.objectContaining({ id, name: 'Chanom Friends' }),
    ]);
  });
});
