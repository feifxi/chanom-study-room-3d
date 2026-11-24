import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { browser, createTestApp, LOOK, resetAccounts, signedUp } from '../../test/test-app.js';
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

const DAY = 24 * 60 * 60 * 1000;
const person = (handle: string) => signedUp(app, sent, handle);

/** Mai owns a room; returns her browser and the room's id. */
async function maisRoom(settings: object = {}) {
  const mai = await person('maimai');
  const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
  if (Object.keys(settings).length) await mai.patch(`/api/rooms/${room.id}`, settings).expect(200);
  return { mai, id: room.id as string };
}

/** Someone joins through Mai's member invite. */
async function joinByInvite(mai: Awaited<ReturnType<typeof person>>, id: string, handle: string) {
  const b = await person(handle);
  const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
  await b.post(`/api/invites/${code}/accept`).expect(200);
  return b;
}

describe('making a room', () => {
  it('makes you its owner, private, on the Free plan', async () => {
    const { mai, id } = await maisRoom();
    const room = (await mai.get(`/api/rooms/${id}`).expect(200)).body;
    expect(room).toMatchObject({
      name: 'Chanom Friends',
      emoji: '📚',
      visibility: 'private',
      capacity: 25,
      maxMembers: 150,
      memberCount: 1,
      owner: { handle: 'maimai' },
      me: { role: 'owner' },
    });
    expect((await mai.get('/api/rooms').expect(200)).body).toHaveLength(1);
  });

  it('hides a private room from everyone else', async () => {
    const { id } = await maisRoom();
    const jod = await person('jod');
    await jod.get(`/api/rooms/${id}`).expect(404);
    await jod.post(`/api/rooms/${id}/join`).expect(404);
  });

  it('needs a finished account', async () => {
    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.post('/api/rooms', { name: 'Nope', mapId: 'cafe' }).expect(403);
  });
});

describe('room settings', () => {
  it('refuses a blocked word in the name, description or rules', async () => {
    const { mai, id } = await maisRoom();
    await mai.post('/api/rooms', { name: 'Fuck club', mapId: 'library' }).expect(400);
    const refused = await mai.patch(`/api/rooms/${id}`, { description: 'no shit allowed' }).expect(400);
    expect(refused.body.message).toEqual(['description: That description has a word we don’t allow']);
    await mai.patch(`/api/rooms/${id}`, { rules: 'ห้ามพูดคำว่าควย' }).expect(400);
    await mai.patch(`/api/rooms/${id}`, { description: 'Cosy study in Scunthorpe' }).expect(200);
  });

  it('lets mods change safety and invites but not the room itself', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    await mai.put(`/api/rooms/${id}/members/${ken.id}/role`, { role: 'mod' }).expect(204);

    await ken.patch(`/api/rooms/${id}`, { slowMode: true, allowGuests: false }).expect(200);
    await ken.patch(`/api/rooms/${id}`, { name: 'Ken’s room' }).expect(403);
    await ken.patch(`/api/rooms/${id}`, { visibility: 'open' }).expect(403);
  });

  it('keeps capacity within the plan and Big maps for Plus', async () => {
    const { mai, id } = await maisRoom();
    await mai.patch(`/api/rooms/${id}`, { capacity: 10 }).expect(200);
    await mai.patch(`/api/rooms/${id}`, { capacity: 40 }).expect(400);
    const res = await mai.patch(`/api/rooms/${id}`, { size: 'big' }).expect(403);
    expect(res.body).toMatchObject({ code: 'plus_only' });
  });

  it('keeps members out of settings; the owner deletes by typing the name', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    await ken.patch(`/api/rooms/${id}`, { rules: 'x' }).expect(403);
    await ken.delete(`/api/rooms/${id}`, { name: 'Chanom Friends' }).expect(403);
    await mai.delete(`/api/rooms/${id}`, { name: 'wrong' }).expect(400);
    await mai.delete(`/api/rooms/${id}`, { name: 'chanom friends' }).expect(204);
    await ken.get(`/api/rooms/${id}`).expect(404);
  });
});

describe('roles', () => {
  it('lets the owner hand the room over and stay as a mod', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    await mai.delete(`/api/rooms/${id}/me`).expect(409);
    await mai.put(`/api/rooms/${id}/owner`, { userId: ken.id }).expect(200);
    expect((await ken.get(`/api/rooms/${id}`)).body.me.role).toBe('owner');
    expect((await mai.get(`/api/rooms/${id}`)).body.me.role).toBe('mod');
  });

  it('lets mods act on members only, never on the owner or other mods', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    const jod = await joinByInvite(mai, id, 'jod');
    const ploy = await joinByInvite(mai, id, 'ployy');
    await mai.put(`/api/rooms/${id}/members/${ken.id}/role`, { role: 'mod' }).expect(204);
    await mai.put(`/api/rooms/${id}/members/${jod.id}/role`, { role: 'mod' }).expect(204);

    await ken.delete(`/api/rooms/${id}/members/${jod.id}`).expect(403);
    await ken.delete(`/api/rooms/${id}/members/${mai.id}`).expect(403);
    await ken.put(`/api/rooms/${id}/members/${ploy.id}/role`, { role: 'mod' }).expect(403);
    await ploy.delete(`/api/rooms/${id}/members/${ken.id}`).expect(403);

    await ken.put(`/api/rooms/${id}/members/${ploy.id}/timeout`, { duration: '1h' }).expect(204);
    const members = (await mai.get(`/api/rooms/${id}/members`).expect(200)).body;
    expect(members.map((m: { role: string }) => m.role)).toEqual(['owner', 'mod', 'mod', 'member']);
    expect(members[3].timedOutUntil).not.toBeNull();

    await ken.delete(`/api/rooms/${id}/members/${ploy.id}`).expect(204);
    await ploy.get(`/api/rooms/${id}`).expect(404);
  });
});

describe('invites', () => {
  it('gives back the same link until you ask for a fresh one', async () => {
    const { mai, id } = await maisRoom();
    const a = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
    const b = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
    const c = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member', fresh: true }).expect(200)).body;
    const never = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member', expiry: 'never' }).expect(200)).body;
    expect(b.code).toBe(a.code);
    expect(c.code).not.toBe(a.code);
    expect(never).toMatchObject({ expiry: 'never', expiresAt: null });
    expect((await mai.get(`/api/rooms/${id}/invites`).expect(200)).body).toHaveLength(3);
  });

  it('shows a preview to anyone and stops working once cancelled', async () => {
    const { mai, id } = await maisRoom();
    const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' })).body;
    const preview = (await browser(app).get(`/api/invites/${code}`).expect(200)).body;
    expect(preview).toMatchObject({ kind: 'member', room: { name: 'Chanom Friends', memberCount: 1 }, by: { handle: 'maimai' } });

    await mai.delete(`/api/invites/${code}`).expect(204);
    await browser(app).get(`/api/invites/${code}`).expect(404);
  });

  it('lets members invite only when the room allows it', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    await ken.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200);
    await mai.patch(`/api/rooms/${id}`, { membersCanInvite: false }).expect(200);
    await ken.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(403);
  });

  it('lets a guest walk in with a guest pass, without joining', async () => {
    const { mai, id } = await maisRoom();
    const { code, expiresAt } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'guest' }).expect(200)).body;
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.put('/api/me/guest', { name: 'Mint', look: LOOK, over13: true }).expect(200);
    // Guests can't use member invites
    const member = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' })).body;
    await guest.post(`/api/invites/${member.code}/accept`).expect(403);

    const accepted = (await guest.post(`/api/invites/${code}/accept`).expect(200)).body;
    expect(accepted).toMatchObject({ roomId: id, guestUntil: expiresAt });
    const room = (await guest.get(`/api/rooms/${id}`).expect(200)).body;
    expect(room.me).toMatchObject({ role: null, guestUntil: expiresAt });
    expect(room.memberCount).toBe(1);
  });

  it('makes no guest passes when the room has no guests', async () => {
    const { mai, id } = await maisRoom({ allowGuests: false });
    const res = await mai.post(`/api/rooms/${id}/invites`, { kind: 'guest' }).expect(403);
    expect(res.body).toMatchObject({ code: 'no_guests' });
  });
});

describe('getting in', () => {
  it('lets anyone join an Open room, and find it in Discover', async () => {
    const { id } = await maisRoom({ visibility: 'open', tags: ['Study'], language: 'Thai' });
    const jod = await person('jod');
    const listed = (await jod.get('/api/rooms/listed?tag=Study').expect(200)).body;
    expect(listed).toMatchObject([{ id, visibility: 'open', me: { role: null } }]);
    expect((await jod.get('/api/rooms/listed?tag=Games').expect(200)).body).toHaveLength(0);
    // Signed-out visitors browse Discover too (the cards say "Sign up to join")
    expect((await browser(app).get('/api/rooms/listed?tag=Study').expect(200)).body).toMatchObject([{ id, me: { role: null } }]);

    await jod.post(`/api/rooms/${id}/join`).expect(200);
    expect((await jod.get(`/api/rooms/${id}`)).body.me.role).toBe('member');
    await jod.delete(`/api/rooms/${id}/me`).expect(204);
  });

  it('asks first in an Ask-to-join room; a decline waits 7 days', async () => {
    const { mai, id } = await maisRoom({ visibility: 'request' });
    const jod = await person('jod');
    await jod.post(`/api/rooms/${id}/join`).expect(403);
    const asked = (await jod.post(`/api/rooms/${id}/requests`, { note: 'I’m in Mai’s class 👋' }).expect(200)).body;
    expect(asked.me).toMatchObject({ role: null, requested: true });

    expect((await mai.get(`/api/rooms/${id}`)).body.requestCount).toBe(1);
    const requests = (await mai.get(`/api/rooms/${id}/requests`).expect(200)).body;
    expect(requests).toMatchObject([{ person: { handle: 'jod' }, note: 'I’m in Mai’s class 👋' }]);

    await mai.post(`/api/rooms/${id}/requests/${jod.id}/decline`).expect(204);
    const again = await jod.post(`/api/rooms/${id}/requests`, {}).expect(409);
    expect(again.body).toMatchObject({ code: 'too_soon' });
    expect((await jod.get(`/api/rooms/${id}`)).body.me.askAgainAt).not.toBeNull();

    // A week later they can ask again, and get let in
    await prisma.joinRequest.updateMany({ data: { declinedAt: new Date(Date.now() - 8 * DAY) } });
    await jod.post(`/api/rooms/${id}/requests`, {}).expect(200);
    await mai.post(`/api/rooms/${id}/requests/${jod.id}/accept`).expect(204);
    expect((await jod.get(`/api/rooms/${id}`)).body.me.role).toBe('member');
  });

  it('keeps banned people out of joining, asking and guest passes', async () => {
    const { mai, id } = await maisRoom({ visibility: 'open' });
    const jod = await person('jod');
    await jod.post(`/api/rooms/${id}/join`).expect(200);
    await mai.put(`/api/rooms/${id}/bans/${jod.id}`, { reason: 'Spamming links' }).expect(204);

    await jod.post(`/api/rooms/${id}/join`).expect(403);
    const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'guest' })).body;
    await jod.post(`/api/invites/${code}/accept`).expect(403);
    const bans = (await mai.get(`/api/rooms/${id}/bans`).expect(200)).body;
    expect(bans).toMatchObject([{ person: { handle: 'jod' }, by: { handle: 'maimai' }, reason: 'Spamming links' }]);

    await mai.delete(`/api/rooms/${id}/bans/${jod.id}`).expect(204);
    await jod.post(`/api/rooms/${id}/join`).expect(200);
    // Both are in the team's audit log, as a room mod's (not a team) action
    const log = await prisma.auditEntry.findMany({ where: { targetId: jod.id }, orderBy: { id: 'asc' } });
    expect(log.map((e) => [e.action, e.byId, e.reason])).toEqual([
      ['roommod.ban', mai.id, 'Spamming links'],
      ['roommod.unban', mai.id, ''],
    ]);
  });
});

describe('deleting an account', () => {
  it('hands each room to the picked member, and deletes rooms with nobody else', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    const jod = await joinByInvite(mai, id, 'jod');
    await mai.put(`/api/rooms/${id}/members/${ken.id}/role`, { role: 'mod' }).expect(204);
    const solo = (await mai.post('/api/rooms', { name: 'Just me', mapId: 'cafe' }).expect(201)).body;

    // Picks Jod over the mod
    await mai.post('/api/me/deletion', { handle: 'maimai', heirs: { [id]: jod.id } }).expect(200);
    await app.get(AccountsService).purgeDue(new Date(Date.now() + 8 * DAY));

    expect((await jod.get(`/api/rooms/${id}`)).body).toMatchObject({ me: { role: 'owner' }, memberCount: 2 });
    expect(await prisma.room.findUnique({ where: { id: solo.id } })).toBeNull();
  });

  it('falls back to a mod when no one was picked, and forgets the pick when the account is kept', async () => {
    const { mai, id } = await maisRoom();
    const ken = await joinByInvite(mai, id, 'kenken');
    const jod = await joinByInvite(mai, id, 'jod');
    await mai.put(`/api/rooms/${id}/members/${ken.id}/role`, { role: 'mod' }).expect(204);

    await mai.post('/api/me/deletion', { handle: 'maimai', heirs: { [id]: jod.id } }).expect(200);
    await mai.delete('/api/me/deletion').expect(200);
    await mai.post('/api/me/deletion', { handle: 'maimai' }).expect(200);
    await app.get(AccountsService).purgeDue(new Date(Date.now() + 8 * DAY));

    expect((await ken.get(`/api/rooms/${id}`)).body.me.role).toBe('owner');
  });
});
