import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FOCUS_QUEUE, type FocusRound } from '@connecta/shared';
import { browser, createTestApp, LOOK, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import { AWAY_MS, PresenceService } from '../presence/presence.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { FocusService } from './focus.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let focus: FocusService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
  focus = app.get(FocusService);
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  await resetAccounts(prisma);
});

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;
let rounds = 0;
const round = (over: Partial<FocusRound>): FocusRound => ({
  id: `round-${++rounds}`,
  userId: '',
  roomId: '',
  subject: 'Calculus',
  startedAt: Date.now() - 25 * 60_000,
  endedAt: Date.now(),
  minutes: 25,
  ...over,
});

async function maisRoom() {
  const mai = await person('maimai');
  const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  return { mai, id };
}

describe('saving rounds', () => {
  it('the game server’s queued round is saved once, on the person’s own day', async () => {
    const { mai, id } = await maisRoom();
    await mai.put('/api/me/time-zone', { timeZone: 'Asia/Bangkok' }).expect(204);
    // 20:00 UTC is already tomorrow in Bangkok
    const r = round({
      userId: mai.id,
      roomId: id,
      startedAt: Date.parse('2026-11-23T19:40:00Z'),
      endedAt: Date.parse('2026-11-23T20:05:00Z'),
    });
    const queue = app.get<Queue>(getQueueToken(FOCUS_QUEUE));
    await queue.add('round', r, { jobId: r.id });
    for (let i = 0; i < 100 && !(await prisma.focusSession.count()); i++) await new Promise((res) => setTimeout(res, 20));
    await focus.save(r); // a retry
    const saved = await prisma.focusSession.findMany();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ userId: mai.id, roomId: id, subject: 'Calculus', minutes: 25 });
    expect(saved[0]!.day.toISOString().slice(0, 10)).toBe('2026-11-24');
  });

  it('never saves guests’ rounds; a deleted room keeps your minutes', async () => {
    const { mai, id } = await maisRoom();
    const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'guest' }).expect(200)).body;
    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.put('/api/me/guest', { name: 'Mint', look: LOOK, over13: true }).expect(200);
    await guest.post(`/api/invites/${code}/accept`).expect(200);
    const guestId = (await guest.get('/api/me').expect(200)).body.id as string;
    await focus.save(round({ userId: guestId, roomId: id }));
    expect(await prisma.focusSession.count()).toBe(0);

    await focus.save(round({ userId: mai.id, roomId: 'gone-room' }));
    expect((await prisma.focusSession.findFirstOrThrow()).roomId).toBeNull();
  });
});

describe('this room today', () => {
  it('members’ saved minutes since the viewer’s midnight, most first, capped at 12 hours', async () => {
    const { mai, id } = await maisRoom();
    const jod = await person('jod');
    const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    const now = Date.now();
    for (let i = 0; i < 16; i++) await focus.save(round({ userId: jod.id, roomId: id, minutes: 50, endedAt: now - i * 1000 }));
    await focus.save(round({ userId: mai.id, roomId: id, minutes: 25 }));
    // Two days ago: not today anywhere
    await focus.save(
      round({ userId: mai.id, roomId: id, minutes: 50, startedAt: now - 2 * 86_400_000, endedAt: now - 2 * 86_400_000 + 3_000_000 }),
    );

    const { rows } = (await mai.get(`/api/rooms/${id}/focus/today?tz=UTC`).expect(200)).body;
    expect(rows.map((r: { person: { handle: string }; minutes: number }) => [r.person.handle, r.minutes])).toEqual([
      ['jod', 720],
      ['maimai', 25],
    ]);
  });

  it('only for people who may walk in; time zones are checked', async () => {
    const { mai, id } = await maisRoom();
    const stranger = await person('stranger');
    await stranger.get(`/api/rooms/${id}/focus/today`).expect(404);
    await mai.get(`/api/rooms/${id}/focus/today?tz=Mars/Olympus`).expect(400);
    await mai.put('/api/me/time-zone', { timeZone: 'Nowhere/Land' }).expect(400);
    expect((await mai.get('/api/me').expect(200)).body.timeZone).toBe('UTC');
  });
});

describe('focusing in presence', () => {
  it('friends see "Focusing · Calculus" and never Away, unless activity is hidden', async () => {
    const { mai, id } = await maisRoom();
    const jod = await person('jod');
    await mai.post('/api/friends/requests', { handle: 'jod' }).expect(200);
    await jod.post(`/api/friends/requests/${mai.id}/accept`).expect(200);
    const presence = app.get(PresenceService);
    const view = async () =>
      (await jod.get('/api/friends').expect(200)).body.find((f: { person: { id: string } }) => f.person.id === mai.id).presence;

    // A browser tab idle past Away, and the game tab focusing
    await presence.tab(mai.id, 'web:1', { idleMs: AWAY_MS + 1000 });
    await presence.tab(mai.id, 'game:s1', { roomId: id, idleMs: AWAY_MS + 1000, focus: 'Calculus' });
    expect(await view()).toMatchObject({ status: 'online', activity: 'Focusing · Calculus' });

    await mai.patch('/api/me/privacy', { showActivity: false }).expect(200);
    expect(await view()).toMatchObject({ status: 'online', activity: null });

    await presence.tab(mai.id, 'game:s1', { focus: null });
    expect((await view()).status).toBe('idle');
  });
});

describe('my numbers', () => {
  it('the last 7 days in my time zone, the daily average over days I focused, subjects grouped', async () => {
    const { mai, id } = await maisRoom();
    const now = Date.now();
    const at = (daysAgo: number, minutes: number, subject: string) =>
      focus.save(round({ userId: mai.id, roomId: id, subject, minutes, startedAt: now - daysAgo * 86_400_000 - 60_000, endedAt: now }));
    await at(0, 25, 'Calculus');
    await at(0, 50, ' calculus ');
    await at(2, 25, 'calculus');
    await at(2, 25, '');
    await at(9, 50, 'Long ago');

    const res = (await mai.get('/api/focus/me?tz=UTC').expect(200)).body;
    expect(res.days).toHaveLength(7);
    expect(res).toMatchObject({ today: 75, week: 125, dailyAverage: 63 });
    expect(res.subjects).toEqual([
      { name: 'calculus', minutes: 100 },
      { name: 'No subject', minutes: 25 },
    ]);
  });
});

describe('rankings', () => {
  const rank = async (b: Browser, scope: string, period = 'today') =>
    (await b.get(`/api/focus/rankings?scope=${scope}&period=${period}&tz=UTC`).expect(200)).body;
  const befriend = async (a: Person, b: Person, bHandle: string) => {
    await a.post('/api/friends/requests', { handle: bHandle }).expect(200);
    await b.post(`/api/friends/requests/${a.id}/accept`).expect(200);
  };
  const minutesOf = (userId: string, minutes: number, roomId: string) =>
    focus.save(round({ userId, roomId, minutes, startedAt: Date.now() - 60_000 }));

  it('friends: you and the friends who focused, 12 hours a day at most; the rest are counted', async () => {
    const { mai, id } = await maisRoom();
    const jod = await person('jod');
    const ken = await person('ken');
    const stranger = await person('stranger');
    await befriend(mai, jod, 'jod');
    await befriend(mai, ken, 'ken');
    for (let i = 0; i < 16; i++) await minutesOf(jod.id, 50, id); // 800 → 720
    await minutesOf(mai.id, 25, id);
    await minutesOf(stranger.id, 50, id);

    const res = await rank(mai, 'friends');
    expect(
      res.rows.map((r: { person: { handle: string }; minutes: number; rank: number }) => [r.rank, r.person.handle, r.minutes]),
    ).toEqual([
      [1, 'jod', 720],
      [2, 'maimai', 25],
    ]);
    expect(res).toMatchObject({ me: { rank: 2, minutes: 25 }, idleFriends: 1 });
    // Ken hasn't focused: he's left out, but sees himself
    expect((await rank(ken, 'friends')).rows.map((r: { person: { handle: string } }) => r.person.handle)).toEqual(['maimai', 'ken']);
  });

  it('everyone: 18+ listed by default, under 18 only by choice; blocked people never show; turning it off is at once', async () => {
    const { mai, id } = await maisRoom();
    const jod = await person('jod');
    const young = await person('young');
    await prisma.user.update({ where: { id: young.id }, data: { birthday: new Date('2012-01-01') } });
    await minutesOf(mai.id, 25, id);
    await minutesOf(jod.id, 50, id);
    await minutesOf(young.id, 40, id);
    focus.forgetEveryone();

    expect((await young.get('/api/me').expect(200)).body.showOnEveryone).toBe(false);
    let res = await rank(mai, 'everyone');
    expect(res.rows.map((r: { person: { handle: string } }) => r.person.handle)).toEqual(['jod', 'maimai']);
    expect(res.me).toEqual({ rank: 2, minutes: 25 });
    // Not listed: no rank, but the list is there
    expect(await rank(young, 'everyone')).toMatchObject({
      me: null,
      rows: [{ person: { handle: 'jod' } }, { person: { handle: 'maimai' } }],
    });

    await young.patch('/api/me/privacy', { showOnEveryone: true }).expect(200);
    expect((await rank(mai, 'everyone')).rows.map((r: { person: { handle: string } }) => r.person.handle)).toEqual([
      'jod',
      'young',
      'maimai',
    ]);

    // Mai blocks Jod: neither sees the other, and Mai's rank still counts Jod
    await mai.put(`/api/blocks/${jod.id}`).expect((r) => expect(r.status).toBeLessThan(300));
    res = await rank(mai, 'everyone');
    expect(res.rows.map((r: { person: { handle: string } }) => r.person.handle)).toEqual(['young', 'maimai']);
    expect(res.rows[0].rank).toBe(2);
    expect(res.me.rank).toBe(3);
    expect((await rank(jod, 'everyone')).rows.map((r: { person: { handle: string } }) => r.person.handle)).toEqual(['jod', 'young']);

    await mai.patch('/api/me/privacy', { showOnEveryone: false }).expect(200);
    expect((await rank(young, 'everyone')).rows.map((r: { person: { handle: string } }) => r.person.handle)).toEqual(['jod', 'young']);
    expect((await rank(mai, 'everyone')).me).toBeNull();
  });

  it('this week starts Monday; checks its query', async () => {
    const { mai } = await maisRoom();
    await mai.get('/api/focus/rankings?scope=friends&period=month').expect(400);
    expect((await rank(mai, 'friends', 'week')).me).toEqual({ rank: null, minutes: 0 });
  });
});
