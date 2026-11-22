import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createTestGateway, nextEvent, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

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
const inbox = async (b: Browser) =>
  (await b.get('/api/notifications').expect(200)).body as {
    items: { kind: string; text: string; href: string; unread: boolean; id: string }[];
    unread: number;
  };

/** Mai's room with Jod in it */
async function room() {
  const mai = await person('maimai');
  const jod = await person('jod');
  const roomId = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  const { code } = (await mai.post(`/api/rooms/${roomId}/invites`, { kind: 'member' }).expect(200)).body;
  await jod.post(`/api/invites/${code}/accept`).expect(200);
  return { mai, jod, roomId };
}

describe('inbox', () => {
  it('friend requests and accepting, live; asking again doesn’t add a second item', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    const jodLive = await connect(jod);
    sockets.push(jodLive);
    const coming = nextEvent<{ notification: { kind: string; text: string }; unread: number }>(jodLive, 'notification');
    await mai.post('/api/friends/requests', { handle: 'jod' }).expect(200);
    expect(await coming).toMatchObject({
      notification: { kind: 'friend_request', text: '**maimai** sent you a friend request' },
      unread: 1,
    });
    await mai.post('/api/friends/requests', { handle: 'jod' }).expect(200);
    expect((await inbox(jod)).items).toHaveLength(1);

    await jod.post(`/api/friends/requests/${mai.id}/accept`).expect(200);
    expect((await inbox(mai)).items[0]).toMatchObject({
      kind: 'friend_accepted',
      text: '**jod** accepted your friend request',
      unread: true,
    });
  });

  it('someone who blocked you never hears about your request', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await jod.put(`/api/blocks/${mai.id}`).expect(204);
    await mai.post('/api/friends/requests', { handle: 'jod' }).expect(200);
    expect((await inbox(jod)).unread).toBe(0);
  });

  it('mentions and @room, by each member’s setting', async () => {
    const { mai, jod, roomId } = await room();
    await mai.post(`/api/rooms/${roomId}/messages`, { text: 'hi everyone' }).expect(201);
    expect((await inbox(jod)).unread).toBe(0);
    await mai.post(`/api/rooms/${roomId}/messages`, { text: '@jod library at 8?' }).expect(201);
    expect((await inbox(jod)).items[0]).toMatchObject({
      kind: 'mention',
      text: '**maimai** mentioned you in Chanom Friends: “@jod library at 8?”',
      href: `/r/${roomId}`,
    });
    await mai.post(`/api/rooms/${roomId}/messages`, { text: '@room snacks!' }).expect(201);
    expect((await inbox(jod)).items[0]!.text).toContain('pinged everyone');

    await jod.patch(`/api/rooms/${roomId}/me`, { notify: 'none' }).expect(200);
    await mai.post(`/api/rooms/${roomId}/messages`, { text: '@jod still there?' }).expect(201);
    expect((await inbox(jod)).items).toHaveLength(2);
    // Your own messages never notify you
    expect((await inbox(mai)).unread).toBe(0);
  });

  it('every message: one item per room that grows while unread', async () => {
    const { mai, jod, roomId } = await room();
    await jod.patch(`/api/rooms/${roomId}/me`, { notify: 'all' }).expect(200);
    await mai.post(`/api/rooms/${roomId}/messages`, { text: 'one' }).expect(201);
    expect((await inbox(jod)).items[0]!.text).toBe('**maimai** in Chanom Friends: “one”');
    await mai.post(`/api/rooms/${roomId}/messages`, { text: 'two' }).expect(201);
    await mai.post(`/api/rooms/${roomId}/messages`, { text: 'three' }).expect(201);
    const now = await inbox(jod);
    expect(now.items).toHaveLength(1);
    expect(now.items[0]!.text).toBe('**3 new messages** in Chanom Friends');

    await jod.post('/api/notifications/read', { ids: [now.items[0]!.id] }).expect(204);
    await mai.post(`/api/rooms/${roomId}/messages`, { text: 'four' }).expect(201);
    const after = await inbox(jod);
    expect(after.items).toHaveLength(2);
    expect(after.unread).toBe(1);
    await jod.post('/api/notifications/read', {}).expect(204);
    expect((await inbox(jod)).unread).toBe(0);
  });

  it('asking to join a room: its mods hear (one item that counts), and the asker hears when let in', async () => {
    const mai = await person('maimai');
    const roomId = (await mai.post('/api/rooms', { name: 'Exam Hall', mapId: 'library' }).expect(201)).body.id as string;
    await mai.patch(`/api/rooms/${roomId}`, { visibility: 'request' }).expect(200);
    const jod = await person('jod');
    const ploy = await person('ployy');
    await jod.post(`/api/rooms/${roomId}/requests`, {}).expect(200);
    expect((await inbox(mai)).items[0]!.text).toBe('**jod** wants to join Exam Hall');
    await ploy.post(`/api/rooms/${roomId}/requests`, {}).expect(200);
    const mods = await inbox(mai);
    expect(mods.items).toHaveLength(1);
    expect(mods.items[0]!.text).toBe('**2 people** want to join Exam Hall');

    await mai.post(`/api/rooms/${roomId}/requests/${jod.id}/accept`).expect(204);
    expect((await inbox(jod)).items[0]).toMatchObject({ kind: 'joined', text: 'You’re in! **Exam Hall** let you in' });
  });

  it('items older than 30 days go', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await mai.post('/api/friends/requests', { handle: 'jod' }).expect(200);
    await prisma.notification.updateMany({ data: { createdAt: new Date(Date.now() - 31 * 86_400_000) } });
    expect((await inbox(jod)).items).toHaveLength(0);
    expect(await app.get(NotificationsService).purge()).toBe(1);
  });
});

describe('muting a DM', () => {
  it('is yours alone and shows in the list', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await mai.post('/api/friends/requests', { handle: 'jod' }).expect(200);
    await jod.post(`/api/friends/requests/${mai.id}/accept`).expect(200);
    const dm = (await mai.put('/api/dms/with/jod').expect(200)).body;
    await jod.post(`/api/dms/${dm.id}/messages`, { text: 'hey' }).expect(201);
    await mai.put(`/api/dms/${dm.id}/mute`, { muted: true }).expect(204);
    expect((await mai.get('/api/dms').expect(200)).body[0]).toMatchObject({ muted: true, unread: 1 });
    expect((await jod.get('/api/dms').expect(200)).body[0].muted).toBe(false);
    expect((await mai.put('/api/dms/with/jod').expect(200)).body.muted).toBe(true);
    // DMs never go in the inbox
    expect((await inbox(mai)).items.every((n) => n.kind !== 'mention')).toBe(true);
  });
});
