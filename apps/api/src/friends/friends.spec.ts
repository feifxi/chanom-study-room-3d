import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import { AccountsService } from '../accounts/accounts.service.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
});
afterAll(() => app?.close());
beforeEach(() => resetAccounts(prisma));

const person = (handle: string) => signedUp(app, sent, handle);
const ask = (from: Browser, handle: string) => from.post('/api/friends/requests', { handle });
const handles = async (b: Browser) =>
  (await b.get('/api/friends').expect(200)).body.map((f: { person: { handle: string } }) => f.person.handle);

async function friends(a: Browser & { id: string }, b: Browser & { id: string }, bHandle: string) {
  await ask(a, bHandle).expect(200);
  await b.post(`/api/friends/requests/${a.id}/accept`).expect(200);
}

describe('adding a friend', () => {
  it('sends a request by exact @handle, and accepting makes you friends both ways', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    expect((await ask(mai, '@JOD').expect(200)).body).toMatchObject({ status: 'sent', person: { handle: 'jod' } });

    const forJod = (await jod.get('/api/friends/requests').expect(200)).body;
    expect(forJod.incoming).toHaveLength(1);
    expect((await mai.get('/api/friends/requests').expect(200)).body).toMatchObject({
      sent: [{ person: { handle: 'jod' } }],
      leftToday: 19,
    });

    await jod.post(`/api/friends/requests/${mai.id}/accept`).expect(200);
    expect(await handles(mai)).toEqual(['jod']);
    expect(await handles(jod)).toEqual(['maimai']);
    expect((await jod.get('/api/friends/requests').expect(200)).body.incoming).toHaveLength(0);
  });

  it('answers right away: no such handle, yourself, already friends', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    expect((await ask(mai, 'nobody_here').expect(404)).body.code).toBe('no_one');
    expect((await ask(mai, 'maimai').expect(400)).body.code).toBe('self');
    await friends(mai, jod, 'jod');
    expect((await ask(mai, 'jod').expect(409)).body.code).toBe('already_friends');
  });

  it('makes you friends at once when they had already asked you', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await ask(jod, 'maimai').expect(200);
    expect((await ask(mai, 'jod').expect(200)).body.status).toBe('friends');
    expect(await handles(jod)).toEqual(['maimai']);
  });

  it('is silent: ignoring hides it from you while the sender still sees Pending', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await ask(mai, 'jod').expect(200);
    await jod.post(`/api/friends/requests/${mai.id}/ignore`).expect(204);
    expect((await jod.get('/api/friends/requests').expect(200)).body.incoming).toHaveLength(0);
    expect((await mai.get('/api/friends/requests').expect(200)).body.sent).toHaveLength(1);
    // Asking again doesn't put it back in front of them
    await ask(mai, 'jod').expect(200);
    expect((await jod.get('/api/friends/requests').expect(200)).body.incoming).toHaveLength(0);
  });

  it('lets you cancel a request you sent', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await ask(mai, 'jod').expect(200);
    await mai.delete(`/api/friends/requests/${jod.id}`).expect(204);
    expect((await jod.get('/api/friends/requests').expect(200)).body.incoming).toHaveLength(0);
  });

  it('allows 20 requests a day', async () => {
    const mai = await person('maimai');
    await person('jod');
    const now = new Date();
    const users = Array.from({ length: 20 }, (_, i) => ({ id: `u${i}`, name: `U${i}`, email: `u${i}@x.test`, handle: `user${i}` }));
    await prisma.user.createMany({ data: users });
    await prisma.friendRequest.createMany({
      data: users.map((u) => ({ fromId: mai.id, toId: u.id, createdAt: now, expiresAt: new Date(now.getTime() + 1e9) })),
    });
    expect((await ask(mai, 'jod').expect(429)).body.code).toBe('too_many_today');
  });

  it('respects who they take requests from', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await jod.patch('/api/me/privacy', { requestsFrom: 'nobody' }).expect(200);
    expect((await ask(mai, 'jod').expect(403)).body.code).toBe('not_accepting');

    await jod.patch('/api/me/privacy', { requestsFrom: 'rooms' }).expect(200);
    await ask(mai, 'jod').expect(403);
    // Sharing a room is enough
    const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
    const { code } = (await mai.post(`/api/rooms/${room.id}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    await ask(mai, 'jod').expect(200);
    expect((await jod.get('/api/friends/requests').expect(200)).body.incoming[0].shared).toEqual(['Chanom Friends']);
  });

  it('is only for finished accounts', async () => {
    const mai = await person('maimai');
    await prisma.user.update({ where: { id: mai.id }, data: { deleteAt: new Date(Date.now() + 1e9) } });
    await mai.get('/api/friends').expect(403);
  });
});

describe('removing and blocking', () => {
  it('removes a friend for both, silently', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await friends(mai, jod, 'jod');
    await jod.delete(`/api/friends/${mai.id}`).expect(204);
    expect(await handles(mai)).toEqual([]);
  });

  it('blocking ends the friendship, and their requests never reach you', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await friends(mai, jod, 'jod');
    await mai.put(`/api/blocks/${jod.id}`).expect(204);
    expect(await handles(jod)).toEqual([]);
    expect((await mai.get('/api/blocks').expect(200)).body).toMatchObject([{ person: { handle: 'jod' } }]);

    // Jod sees "sent" (as if ignored); Mai never sees it, and can't add Jod until she unblocks
    expect((await ask(jod, 'maimai').expect(200)).body.status).toBe('sent');
    expect((await mai.get('/api/friends/requests').expect(200)).body.incoming).toHaveLength(0);
    expect((await ask(mai, 'jod').expect(403)).body.code).toBe('you_blocked');

    await mai.delete(`/api/blocks/${jod.id}`).expect(204);
    expect((await ask(mai, 'jod').expect(200)).body.status).toBe('friends');
  });

  it('takes a deleted account off everyone’s lists', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    await friends(mai, jod, 'jod');
    await prisma.user.update({ where: { id: jod.id }, data: { deleteAt: new Date(Date.now() - 1000) } });
    await app.get(AccountsService).purgeDue();
    expect(await handles(mai)).toEqual([]);
  });
});
