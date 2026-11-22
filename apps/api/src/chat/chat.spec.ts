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

const person = (handle: string) => signedUp(app, sent, handle);
const live = async (b: Browser) => {
  const s = await connect(b);
  sockets.push(s);
  return s;
};

/** Mai owns a room and Jod is a member. */
async function room() {
  const mai = await person('maimai');
  const jod = await person('jod');
  const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
  await jod.post(`/api/invites/${code}/accept`).expect(200);
  return { mai, jod, id };
}
const say = (b: Browser, id: string, text: string, replyToId?: string) => b.post(`/api/rooms/${id}/messages`, { text, replyToId });

describe('room chat', () => {
  it('saves messages for members, oldest first, paged by id', async () => {
    const { mai, jod, id } = await room();
    for (const text of ['one', 'two', 'three']) await say(mai, id, text).expect(201);
    const page = (await jod.get(`/api/rooms/${id}/messages?limit=2`).expect(200)).body;
    expect(page.messages.map((m: { text: string }) => m.text)).toEqual(['two', 'three']);
    expect(page.hasMore).toBe(true);
    const older = (await jod.get(`/api/rooms/${id}/messages?before=${page.messages[0].id}`).expect(200)).body;
    expect(older.messages.map((m: { text: string }) => m.text)).toEqual(['one']);
    expect(older.hasMore).toBe(false);
  });

  it('is only for members: not guests, not outsiders', async () => {
    const { id } = await room();
    const ploy = await person('ployy');
    await ploy.get(`/api/rooms/${id}/messages`).expect(404);
    await say(ploy, id, 'hi').expect(404);
  });

  it('quotes replies, and says when the original is gone', async () => {
    const { mai, jod, id } = await room();
    const first = (await say(mai, id, 'who’s free friday?').expect(201)).body;
    const reply = (await say(jod, id, 'me!', first.id).expect(201)).body;
    expect(reply.replyTo).toMatchObject({ id: first.id, text: 'who’s free friday?', deleted: false, author: { handle: 'maimai' } });
    await mai.delete(`/api/messages/${first.id}`).expect(204);
    const page = (await jod.get(`/api/rooms/${id}/messages`).expect(200)).body;
    expect(page.messages).toHaveLength(1);
    expect(page.messages[0].replyTo).toMatchObject({ deleted: true, text: '' });
  });

  it('edits your own messages only; the owner and mods delete anyone’s', async () => {
    const { mai, jod, id } = await room();
    const msg = (await say(jod, id, 'helo').expect(201)).body;
    await mai.patch(`/api/messages/${msg.id}`, { text: 'hacked' }).expect(403);
    expect((await jod.patch(`/api/messages/${msg.id}`, { text: 'hello' }).expect(200)).body).toMatchObject({
      text: 'hello',
      editedAt: expect.any(String),
    });
    const mine = (await say(mai, id, 'mine').expect(201)).body;
    await jod.delete(`/api/messages/${mine.id}`).expect(403);
    await mai.delete(`/api/messages/${msg.id}`).expect(204);
  });

  it('tracks @mentions of members, and @room only from the owner and mods', async () => {
    const { mai, jod, id } = await room();
    const ping = (await say(jod, id, '@maimai @ployy look @room').expect(201)).body;
    expect(ping.mentions).toEqual([mai.id]);
    expect(ping.mentionsRoom).toBe(false);
    expect((await say(mai, id, 'dinner @room').expect(201)).body.mentionsRoom).toBe(true);
  });

  it('counts reactions per emoji and person', async () => {
    const { mai, jod, id } = await room();
    const msg = (await say(mai, id, 'card night 🃏').expect(201)).body;
    await jod.put(`/api/messages/${msg.id}/reactions`, { emoji: '❤️' }).expect(200);
    const both = (await mai.put(`/api/messages/${msg.id}/reactions`, { emoji: '❤️' }).expect(200)).body;
    expect(both.reactions).toEqual([{ emoji: '❤️', userIds: [jod.id, mai.id] }]);
    const off = (await jod.delete(`/api/messages/${msg.id}/reactions`, { emoji: '❤️' }).expect(200)).body;
    expect(off.reactions).toEqual([{ emoji: '❤️', userIds: [mai.id] }]);
  });

  it('keeps timed-out members quiet', async () => {
    const { mai, jod, id } = await room();
    await mai.put(`/api/rooms/${id}/members/${jod.id}/timeout`, { duration: '10m' }).expect(204);
    expect((await say(jod, id, 'hey').expect(403)).body.code).toBe('timed_out');
  });

  it('counts unread messages and mentions for Home, until you read them', async () => {
    const { mai, jod, id } = await room();
    await say(mai, id, 'hi all').expect(201);
    const last = (await say(mai, id, '@jod you coming?').expect(201)).body;
    const home = (await jod.get('/api/rooms').expect(200)).body[0];
    expect(home.me).toMatchObject({ unread: 2, mentioned: true });
    // Your own messages never count
    expect((await mai.get('/api/rooms').expect(200)).body[0].me.unread).toBe(0);

    await jod.put(`/api/rooms/${id}/read`, { messageId: last.id }).expect(204);
    expect((await jod.get(`/api/rooms/${id}`).expect(200)).body.me).toMatchObject({ unread: 0, mentioned: false });
    expect((await jod.get(`/api/rooms/${id}/messages`).expect(200)).body.lastReadId).toBe(last.id);
  });
});

describe('live', () => {
  it('delivers new messages, edits and deletes to members watching the room', async () => {
    const { mai, jod, id } = await room();
    const socket = await live(jod);
    expect(await socket.emitWithAck('watch', id)).toEqual({ ok: true });

    const arriving = nextEvent<{ text: string; id: string }>(socket, 'message');
    const msg = (await say(mai, id, 'live!').expect(201)).body;
    expect((await arriving).text).toBe('live!');

    const gone = nextEvent<{ id: string }>(socket, 'message:deleted');
    await mai.delete(`/api/messages/${msg.id}`).expect(204);
    expect((await gone).id).toBe(msg.id);
  });

  it('passes "typing" to the others watching, never to outsiders', async () => {
    const { mai, jod, id } = await room();
    const [m, j] = [await live(mai), await live(jod)];
    await m.emitWithAck('watch', id);
    await j.emitWithAck('watch', id);
    const typing = nextEvent<{ person: { handle: string } }>(m, 'typing');
    j.emit('typing', id);
    expect((await typing).person.handle).toBe('jod');

    const ploy = await live(await person('ployy'));
    expect(await ploy.emitWithAck('watch', id)).toEqual({ ok: false, error: 'not_found' });
  });

  it('stops a kicked member’s tabs from getting the room', async () => {
    const { mai, jod, id } = await room();
    const socket = await live(jod);
    await socket.emitWithAck('watch', id);
    await mai.delete(`/api/rooms/${id}/members/${jod.id}`).expect(204);
    await new Promise((r) => setTimeout(r, 200));
    const nothing = nextEvent(socket, 'message');
    await say(mai, id, 'secret').expect(201);
    await expect(nothing).rejects.toThrow('No message event');
  });

  it('refuses connections without a finished account', async () => {
    const b = (await import('../../test/test-app.js')).browser(app);
    await expect(connect(b)).rejects.toThrow();
  });
});
