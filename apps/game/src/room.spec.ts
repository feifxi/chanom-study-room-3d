import { Client, type Room } from '@colyseus/sdk';
import { listen } from 'colyseus';
import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GAME_CLOSE, GAME_ROOM, TICKET_AUDIENCE, type GamePresence, type GameTicket, type PlayerView } from '@connecta/shared';
import { mapDataFor } from '@connecta/shared/maps';
import { dispatch, links } from './links.js';
import { gameServer } from './server.js';

const SECRET = process.env.GAME_SECRET!;
const PORT = 4092;
const client = new Client(`http://localhost:${PORT}`);

type GameRoom = Room<unknown, { mapId: string; players: Map<string, PlayerView> }>;

const presence: GamePresence[] = [];
const spaces: string[] = [];

function ticket(over: Partial<GameTicket> = {}, opts: { secret?: string; expires?: string } = {}) {
  const t: GameTicket = {
    sub: 'u-mai',
    roomId: 'room-a',
    name: 'Mai',
    look: null,
    role: 'member',
    capacity: 25,
    mapId: 'library',
    ...over,
  };
  return new SignJWT({ ...t })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(TICKET_AUDIENCE)
    .setExpirationTime(opts.expires ?? '1m')
    .sign(new TextEncoder().encode(opts.secret ?? SECRET));
}

async function walkIn(over: Partial<GameTicket> = {}) {
  const roomId = over.roomId ?? 'room-a';
  const room = (await client.joinOrCreate(GAME_ROOM, { place: roomId, ticket: await ticket({ roomId, ...over }) })) as GameRoom;
  await until(() => room.state?.players?.has(room.sessionId));
  return room;
}

async function until(check: () => unknown, ms = 2000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
}

const closed = (room: GameRoom) => new Promise<number>((resolve) => room.onLeave((code) => resolve(code)));
const me = (room: GameRoom) => room.state.players.get(room.sessionId)!;

let server: ReturnType<typeof gameServer>;
const open: GameRoom[] = [];
const track = (r: GameRoom) => (open.push(r), r);

beforeAll(async () => {
  links.presence = (p) => presence.push(p);
  links.space = (id) => spaces.push(id);
  server = gameServer(SECRET);
  await listen(server, PORT);
});
afterEach(async () => {
  await Promise.allSettled(open.splice(0).map((r) => r.leave()));
  presence.length = 0;
  spaces.length = 0;
  await new Promise((r) => setTimeout(r, 50));
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe('walking in', () => {
  it('lets a ticket in, at the door, with the name, role and map from the ticket', async () => {
    const room = track(await walkIn({ role: 'mod' }));
    const p = me(room);
    const { spawn } = mapDataFor('library');
    expect(p).toMatchObject({ userId: 'u-mai', name: 'Mai', role: 'mod', seatId: '' });
    expect(Math.hypot(p.x - spawn.x, p.z - spawn.z)).toBeLessThan(1);
    expect(room.state.mapId).toBe('library');
    await until(() => presence.some((u) => u.userId === 'u-mai' && u.roomId === 'room-a'));
  });

  it('refuses a missing, forged, expired or other-room ticket', async () => {
    await expect(client.joinOrCreate(GAME_ROOM, { place: 'room-a' })).rejects.toThrow(/unauthorized/);
    const forged = await ticket({}, { secret: 'x'.repeat(40) });
    await expect(client.joinOrCreate(GAME_ROOM, { place: 'room-a', ticket: forged })).rejects.toThrow(/unauthorized/);
    const old = await ticket({}, { expires: '-1s' });
    await expect(client.joinOrCreate(GAME_ROOM, { place: 'room-a', ticket: old })).rejects.toThrow(/unauthorized/);
    const other = await ticket({ roomId: 'room-b' });
    await expect(client.joinOrCreate(GAME_ROOM, { place: 'room-a', ticket: other })).rejects.toThrow(/unauthorized/);
  });

  it('keeps rooms apart: people in another room never show up', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ roomId: 'room-b', sub: 'u-jod', name: 'Jod' }));
    expect(a.roomId).not.toBe(b.roomId);
    expect(a.state.players.size).toBe(1);
  });

  it('says full at capacity, but the owner and mods always fit; a leave then tells the waiting list', async () => {
    const one = track(await walkIn({ capacity: 1 }));
    await expect(walkIn({ sub: 'u-jod', capacity: 1 })).rejects.toThrow(/full/);
    const owner = track(await walkIn({ sub: 'u-owner', role: 'owner', capacity: 1 }));
    expect(owner.state.players.size).toBe(2);
    await one.leave();
    await owner.leave();
    await until(() => spaces.includes('room-a'));
  });

  it('one of you per room: a second tab takes over and the first is told why', async () => {
    const first = await walkIn();
    const code = closed(first);
    const second = track(await walkIn());
    expect(await code).toBe(GAME_CLOSE.elsewhere);
    await until(() => second.state.players.size === 1);
  });
});

describe('moving and sitting', () => {
  it('applies a move and its sequence number, but caps the speed', async () => {
    const room = track(await walkIn());
    // Movement allowance builds up with time, from zero at the door
    await new Promise((r) => setTimeout(r, 300));
    const start = { ...me(room) };
    room.send('move', { x: start.x, z: start.z - 0.5, yaw: 0, moving: true, seq: 7 });
    await until(() => me(room).moveSeq === 7);
    expect(me(room).z).toBeCloseTo(start.z - 0.5, 1);
    // A teleport across the room only gets as far as the time allows
    room.send('move', { x: start.x, z: start.z - 30, yaw: 0, moving: true, seq: 8 });
    await until(() => me(room).moveSeq === 8);
    expect(start.z - me(room).z).toBeLessThan(10);
  });

  it('sits only within reach of a free seat, and stands up at its stand-up spot', async () => {
    const map = mapDataFor('library');
    const seat = map.seats[0]!;
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    // Too far
    a.send('sit', { seatId: seat.id });
    await new Promise((r) => setTimeout(r, 150));
    expect(me(a).seatId).toBe('');
    // Walk over in small steps (the speed cap), then sit
    const goTo = async (r: GameRoom, to: { x: number; z: number }) => {
      for (let seq = 1; Math.hypot(me(r).x - to.x, me(r).z - to.z) > 0.5; seq++) {
        r.send('move', { x: to.x, z: to.z, yaw: 0, moving: true, seq: 100 + seq });
        await new Promise((res) => setTimeout(res, 120));
      }
    };
    await goTo(a, seat);
    a.send('sit', { seatId: seat.id });
    await until(() => me(a).seatId === seat.id);
    await goTo(b, seat);
    b.send('sit', { seatId: seat.id });
    await new Promise((r) => setTimeout(r, 150));
    expect(me(b).seatId).toBe('');
    a.send('stand', {});
    await until(() => me(a).seatId === '');
    expect(me(a).x).toBeCloseTo(seat.out.x, 1);
  }, 15_000);
});

describe('room events from the API', () => {
  it('kick and ban remove the person with a reason code', async () => {
    const a = await walkIn();
    const code = closed(a);
    dispatch({ roomId: 'room-a', type: 'ban', userId: 'u-mai' });
    expect(await code).toBe(GAME_CLOSE.banned);
    await until(() => presence.some((u) => u.userId === 'u-mai' && u.roomId === null));
  });

  it('a role change shows at once; a map change moves everyone to the new door', async () => {
    const room = track(await walkIn());
    dispatch({ roomId: 'room-a', type: 'role', userId: 'u-mai', role: 'mod' });
    await until(() => me(room).role === 'mod');
    dispatch({ roomId: 'room-a', type: 'map', mapId: 'cafe' });
    await until(() => room.state.mapId === 'cafe');
    const { spawn } = mapDataFor('cafe');
    await until(() => Math.hypot(me(room).x - spawn.x, me(room).z - spawn.z) < 1);
  });

  it('a deleted room sends everyone out', async () => {
    const room = await walkIn();
    const code = closed(room);
    dispatch({ roomId: 'room-a', type: 'deleted' });
    expect(await code).toBe(GAME_CLOSE.gone);
  });
});
