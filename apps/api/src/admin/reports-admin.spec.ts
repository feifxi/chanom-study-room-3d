import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
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
beforeEach(() => resetAccounts(prisma));

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;

/** The team, and Mai's room with Jod and Ploy in it */
async function setup() {
  const t = await person('teamtam');
  await prisma.user.update({ where: { id: t.id }, data: { team: true } });
  const mai = await person('maimai');
  const jod = await person('jod');
  const ploy = await person('ployy');
  const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  await prisma.membership.createMany({ data: [jod, ploy].map((p) => ({ roomId: id, userId: p.id })) });
  return { t, mai, jod, ploy, id };
}

describe('the reports queue', () => {
  it('groups reports on the same message into one case, with what was said around it; delete + warn closes it', async () => {
    const { t, mai, jod, ploy, id } = await setup();
    await mai.get('/api/admin/reports').expect(404);
    await mai.post(`/api/rooms/${id}/messages`, { text: 'how was the exam?' }).expect(201);
    const bad = (await jod.post(`/api/rooms/${id}/messages`, { text: 'mind your own business' }).expect(201)).body;
    await mai.post('/api/reports', { kind: 'message', messageId: bad.id, reason: 'harass', details: 'rude' }).expect(200);
    await ploy.post('/api/reports', { kind: 'message', messageId: bad.id, reason: 'hate' }).expect(200);

    const { cases, open } = (await t.get('/api/admin/reports').expect(200)).body;
    expect(open).toBe(1);
    expect(cases[0]).toMatchObject({
      key: `message:${bad.id}`,
      kind: 'message',
      name: 'jod',
      reporters: 2,
      reasons: ['Harassment or bullying', 'Hate or discrimination'],
      details: ['rude'],
      where: 'Chanom Friends',
      context: [
        { text: 'how was the exam?', flagged: false },
        { text: 'mind your own business', flagged: true },
      ],
    });
    // A person action is the wrong kind for a message
    await t.post(`/api/admin/reports/message:${bad.id}/decide`, { action: 'ban' }).expect(400);
    await t.post(`/api/admin/reports/message:${bad.id}/decide`, { action: 'delete_warn', reason: 'Rude to a member' }).expect(204);

    expect((await prisma.message.findUnique({ where: { id: bad.id } }))?.deletedAt).not.toBeNull();
    expect(await prisma.accountAction.findMany({ where: { userId: jod.id } })).toMatchObject([
      { kind: 'warn', reason: 'Rude to a member' },
    ]);
    expect(sent.findLast((m) => m.to === 'jod@example.com')?.subject).toMatch(/warning/i);
    expect((await t.get('/api/admin/reports').expect(200)).body).toEqual({ cases: [], open: 0 });
    const done = (await t.get('/api/admin/reports?status=done').expect(200)).body.cases;
    expect(done[0]).toMatchObject({ status: 'done', outcome: 'Message deleted + warned', decidedBy: 'teamtam', reporters: 2, history: [] });
    expect(await prisma.auditEntry.count({ where: { action: { in: ['message.delete', 'report.delete_warn', 'account.warn'] } } })).toBe(3);
    // Already decided
    await t.post(`/api/admin/reports/message:${bad.id}/decide`, { action: 'dismiss' }).expect(404);
  });

  it('a person report: dismissing does nothing to them; sexual content goes to the top', async () => {
    const { t, mai, jod, ploy, id } = await setup();
    await mai.post('/api/reports', { kind: 'person', userId: ploy.id, place: id, reason: 'spam' }).expect(200);
    await mai.post('/api/reports', { kind: 'person', userId: jod.id, place: id, reason: 'sexual' }).expect(200);
    const { cases } = (await t.get('/api/admin/reports').expect(200)).body;
    expect(cases.map((c: { name: string; urgent: boolean }) => [c.name, c.urgent])).toEqual([
      ['jod', true],
      ['ployy', false],
    ]);
    await t.post(`/api/admin/reports/person:${ploy.id}/decide`, { action: 'dismiss' }).expect(204);
    expect(await prisma.accountAction.count()).toBe(0);
    await t.post(`/api/admin/reports/person:${jod.id}/decide`, { action: 'suspend_7d', reason: 'Sexual messages to a member' }).expect(204);
    expect((await prisma.user.findUnique({ where: { id: jod.id } }))?.suspendedUntil).not.toBeNull();
  });

  it('a room: delisting takes it off Discover; closing stops walking in and chat', async () => {
    const { t, mai, jod, ploy, id } = await setup();
    await prisma.room.update({ where: { id }, data: { visibility: 'open' } });
    await jod.post('/api/reports', { kind: 'room', place: id, reason: 'room_about', details: 'scam link' }).expect(200);
    const [c] = (await t.get('/api/admin/reports').expect(200)).body.cases;
    expect(c).toMatchObject({ kind: 'room', name: 'Chanom Friends', roomId: id, room: { description: expect.any(String) } });
    const listed = async () => (await ploy.get('/api/rooms/listed').expect(200)).body.map((r: { id: string }) => r.id);
    expect(await listed()).toContain(id);
    await t.post(`/api/admin/reports/room:${id}/decide`, { action: 'delist', reason: 'Scam link in the rules' }).expect(204);
    expect(await listed()).not.toContain(id);
    await jod.post(`/api/rooms/${id}/ticket`).expect(200);

    await jod.post('/api/reports', { kind: 'room', place: id, reason: 'room_inside' }).expect(200);
    await t.post(`/api/admin/reports/room:${id}/decide`, { action: 'close_suspend_owner', reason: 'Selling stolen accounts' }).expect(204);
    expect((await jod.post(`/api/rooms/${id}/ticket`).expect(403)).body.code).toBe('closed');
    expect((await jod.post(`/api/rooms/${id}/messages`, { text: 'hello?' }).expect(403)).body.code).toBe('closed');
    expect((await prisma.user.findUnique({ where: { id: mai.id } }))?.suspendedUntil).not.toBeNull();
  });
});
