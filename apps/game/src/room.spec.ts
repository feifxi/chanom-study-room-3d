import { Client, type Room } from '@colyseus/sdk';
import { listen } from 'colyseus';
import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GAME_CLOSE, GAME_ROOM, TICKET_AUDIENCE, type GamePresence, type GameTicket, type PlayerView, type Said } from '@connecta/shared';
import { mapDataFor } from '@connecta/shared/maps';
import { dispatch, links } from './links.js';
import { decodeJwt } from 'jose';
import { gameServer } from './server.js';
import { liveKitVoice, voice } from './voice.js';

const SECRET = process.env.GAME_SECRET!;
const PORT = 4092;
const client = new Client(`http://localhost:${PORT}`);

type GameRoom = Room<unknown, { mapId: string; players: Map<string, PlayerView> }>;

const presence: GamePresence[] = [];
/** Each test walks into a room of its own (an empty room closes only a second after the last leave) */
let ROOM = '';
let rooms = 0;
const spaces: string[] = [];

function ticket(over: Partial<GameTicket> = {}, opts: { secret?: string; expires?: string } = {}) {
  const t = {
    sub: 'u-mai',
    roomId: ROOM,
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
  const roomId = over.roomId ?? ROOM;
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

/** What the room asked of LiveKit (the passes are real; the calls to LiveKit's API are recorded) */
const lk: string[] = [];
const passes = liveKitVoice({ url: 'http://localhost:7880', publicUrl: 'ws://lk.test', key: 'devkey', secret: 'secret' });

beforeAll(async () => {
  voice.current = {
    pass: passes.pass,
    allow: (room, id, talk) => lk.push(`${talk ? 'allow' : 'hush'} ${id}`),
    muteMic: (room, id) => lk.push(`mic off ${id}`),
    remove: (room, id) => lk.push(`remove ${id}`),
  };
  links.presence = (p) => presence.push(p);
  links.space = (id) => spaces.push(id);
  server = gameServer(SECRET);
  await listen(server, PORT);
});
beforeEach(() => {
  ROOM = `room-${++rooms}`;
});
afterEach(async () => {
  await Promise.allSettled(open.splice(0).map((r) => r.leave()));
  presence.length = 0;
  spaces.length = 0;
  lk.length = 0;
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
    await until(() => presence.some((u) => u.userId === 'u-mai' && u.roomId === ROOM));
  });

  it('refuses a missing, forged, expired or other-room ticket', async () => {
    await expect(client.joinOrCreate(GAME_ROOM, { place: ROOM })).rejects.toThrow(/unauthorized/);
    const forged = await ticket({}, { secret: 'x'.repeat(40) });
    await expect(client.joinOrCreate(GAME_ROOM, { place: ROOM, ticket: forged })).rejects.toThrow(/unauthorized/);
    const old = await ticket({}, { expires: '-1s' });
    await expect(client.joinOrCreate(GAME_ROOM, { place: ROOM, ticket: old })).rejects.toThrow(/unauthorized/);
    const other = await ticket({ roomId: `${ROOM}-b` });
    await expect(client.joinOrCreate(GAME_ROOM, { place: ROOM, ticket: other })).rejects.toThrow(/unauthorized/);
  });

  it('keeps rooms apart: people in another room never show up', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ roomId: `${ROOM}-b`, sub: 'u-jod', name: 'Jod' }));
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
    await until(() => spaces.includes(ROOM));
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
    dispatch({ roomId: ROOM, type: 'ban', userId: 'u-mai' });
    expect(await code).toBe(GAME_CLOSE.banned);
    await until(() => presence.some((u) => u.userId === 'u-mai' && u.roomId === null));
  });

  it('a role change shows at once; a map change moves everyone to the new door', async () => {
    const room = track(await walkIn());
    dispatch({ roomId: ROOM, type: 'role', userId: 'u-mai', role: 'mod' });
    await until(() => me(room).role === 'mod');
    dispatch({ roomId: ROOM, type: 'map', mapId: 'cafe' });
    await until(() => room.state.mapId === 'cafe');
    const { spawn } = mapDataFor('cafe');
    await until(() => Math.hypot(me(room).x - spawn.x, me(room).z - spawn.z) < 1);
  });

  it('a deleted room sends everyone out', async () => {
    const room = await walkIn();
    const code = closed(room);
    dispatch({ roomId: ROOM, type: 'deleted' });
    expect(await code).toBe(GAME_CLOSE.gone);
  });
});

/** Everything a client hears said, in order. */
function hear(room: GameRoom) {
  const heard: Said[] = [];
  room.onMessage('said', (m: Said) => heard.push(m));
  return heard;
}
const quietly = (ms = 200) => new Promise((r) => setTimeout(r, ms));

/** Walks a client somewhere in small steps (the speed cap), from wherever it is. */
async function walkTo(r: GameRoom, to: { x: number; z: number }) {
  for (let seq = 1; Math.hypot(me(r).x - to.x, me(r).z - to.z) > 0.3; seq++) {
    r.send('move', { x: to.x, z: to.z, yaw: 0, moving: true, seq: 1000 + seq });
    await new Promise((res) => setTimeout(res, 120));
  }
}

describe('bubbles and status', () => {
  it('a bubble reaches everyone, trimmed to 120 characters, and clears your typing dots', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heard = hear(b);
    a.send('typing', { typing: true });
    await until(() => b.state.players.get(a.sessionId)?.typing === true);
    a.send('say', { text: `  ${'x'.repeat(200)}  ` });
    await until(() => heard.length === 1);
    expect(heard[0]).toEqual({ id: a.sessionId, text: 'x'.repeat(120) });
    await until(() => b.state.players.get(a.sessionId)?.typing === false);
  });

  it('a bubble said in a private zone stays in it, unless you talk to everyone', async () => {
    const zone = mapDataFor('library').zones[0]!;
    const inside = track(await walkIn({ role: 'mod' }));
    const outside = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heardOutside = hear(outside);
    const heardInside = hear(inside);
    await walkTo(inside, zone.area);
    inside.send('say', { text: 'just us' });
    await until(() => heardInside.length === 1);
    await quietly();
    expect(heardOutside).toHaveLength(0);
    // Lines from outside still reach the zone
    outside.send('say', { text: 'hello room' });
    await until(() => heardInside.length === 2);
    inside.send('stage', { on: true });
    await until(() => me(inside).stage);
    await quietly(500);
    inside.send('say', { text: 'everyone!' });
    await until(() => heardOutside.some((m) => m.text === 'everyone!'));
  }, 20_000);

  it('a timed-out person can’t say or type, and is told until when', async () => {
    const until1 = Date.now() + 60_000;
    const a = track(await walkIn({ timedOutUntil: until1 }));
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heard = hear(b);
    let quiet = 0;
    a.onMessage('quiet', (m: { until: number }) => (quiet = m.until));
    a.send('say', { text: 'hi' });
    await until(() => quiet === until1);
    a.send('typing', { typing: true });
    await quietly();
    expect(heard).toHaveLength(0);
    expect(b.state.players.get(a.sessionId)?.typing).toBe(false);
    // A time out given while inside works at once too
    dispatch({ roomId: ROOM, type: 'timeout', userId: 'u-jod', until: until1 });
    let jodQuiet = 0;
    b.onMessage('quiet', (m: { until: number }) => (jodQuiet = m.until));
    await quietly(100);
    b.send('say', { text: 'hey' });
    await until(() => jodQuiet === until1);
  });

  it('status: focus with a subject, then away; only the owner and mods talk to everyone', async () => {
    const a = track(await walkIn());
    a.send('status', { status: 'focus', subject: 'Calculus but a very long subject name' });
    await until(() => me(a).status === 'focus');
    expect(me(a).subject).toBe('Calculus but a very long'.slice(0, 24));
    expect(me(a).focusSince).toBeGreaterThan(0);
    a.send('stage', { on: true });
    await quietly();
    expect(me(a).stage).toBe(false);
    dispatch({ roomId: ROOM, type: 'role', userId: 'u-mai', role: 'mod' });
    await until(() => me(a).role === 'mod');
    a.send('stage', { on: true });
    await until(() => me(a).stage);
    a.send('status', { status: 'away' });
    await until(() => me(a).status === 'away');
    expect(me(a).stage).toBe(false);
    expect(me(a).focusSince).toBe(0);
  });

  it('a new look shows for everyone, at most once every 5 seconds; guests keep theirs', async () => {
    const a = track(await walkIn());
    const pink = { hair: '#f59ac0', outfit: '#ff6fa8', accessory: 'catEars' };
    a.send('look', { look: pink });
    await until(() => JSON.parse(me(a).look).accessory === 'catEars');
    a.send('look', { look: { ...pink, accessory: 'glasses' } });
    await quietly();
    expect(JSON.parse(me(a).look).accessory).toBe('catEars');
    const g = track(await walkIn({ sub: 'u-guest', role: 'guest', name: 'Mint', handle: null }));
    g.send('look', { look: pink });
    await quietly();
    expect(JSON.parse(me(g).look).accessory).not.toBe('catEars');
  });

  it('resets when the last person leaves: the next visit starts a fresh room', async () => {
    const a = await walkIn();
    a.send('typing', { typing: true });
    const first = a.roomId;
    await a.leave();
    // Colyseus closes an empty room a second after the last leave
    await quietly(1300);
    const b = track(await walkIn());
    expect(b.roomId).not.toBe(first);
    expect(b.state.players.size).toBe(1);
  });

  describe('voice', () => {
    const passOf = async (room: GameRoom) => {
      const got = new Promise<{ url: string; token: string }>((resolve) => room.onMessage('voice', resolve));
      room.send('voice', {});
      const { url, token } = await got;
      return { url, claims: decodeJwt(token) as { sub: string; video: { room: string; canPublish: boolean; canSubscribe: boolean } } };
    };

    it('gives a pass to the room’s voice as your session; guests listen only unless the room lets them talk', async () => {
      const a = track(await walkIn());
      const { url, claims } = await passOf(a);
      expect(url).toBe('ws://lk.test');
      expect(claims.sub).toBe(a.sessionId);
      expect(claims.video).toMatchObject({ room: ROOM, canPublish: true, canSubscribe: true });

      const g = track(await walkIn({ sub: 'u-guest', role: 'guest', name: 'Mint', handle: null }));
      expect(me(g).hushed).toBe(true);
      expect((await passOf(g)).claims.video).toMatchObject({ canPublish: false, canSubscribe: true });
      // The owner turns on Guests can use voice: allowed at once, in LiveKit too
      dispatch({ roomId: ROOM, type: 'guestVoice', on: true });
      await until(() => !me(g).hushed);
      expect(lk).toContain(`allow ${g.sessionId}`);
    });

    it('Mute for everyone: the owner or a mod, kept when they walk back in, lifted by them', async () => {
      const owner = track(await walkIn({ sub: 'u-owner', role: 'owner', name: 'Owner' }));
      const mod = track(await walkIn({ sub: 'u-mod', role: 'mod', name: 'Mod' }));
      let ken = track(await walkIn({ sub: 'u-ken', name: 'Ken' }));
      await until(() => owner.state.players.size === 3);

      // A member can't, and a mod can't mute the owner
      ken.send('mute', { id: mod.sessionId, on: true });
      mod.send('mute', { id: owner.sessionId, on: true });
      await quietly();
      expect([...owner.state.players.values()].some((p) => p.hushed)).toBe(false);

      mod.send('mute', { id: ken.sessionId, on: true });
      await until(() => me(ken).hushed && me(ken).mutedByMod);
      expect(lk).toContain(`hush ${ken.sessionId}`);
      expect((await passOf(ken)).claims.video.canPublish).toBe(false);

      // Walking out and back in doesn't lift it
      await ken.leave();
      ken = track(await walkIn({ sub: 'u-ken', name: 'Ken' }));
      expect(me(ken).mutedByMod).toBe(true);
      owner.send('mute', { id: ken.sessionId, on: false });
      await until(() => !me(ken).hushed);
      expect(lk).toContain(`allow ${ken.sessionId}`);
    });

    it('a time out takes the mic until it ends', async () => {
      const a = track(await walkIn());
      dispatch({ roomId: ROOM, type: 'timeout', userId: 'u-mai', until: Date.now() + 1200 });
      await until(() => me(a).hushed);
      expect(lk).toContain(`hush ${a.sessionId}`);
      await until(() => !me(a).hushed, 3000);
      expect(lk).toContain(`allow ${a.sessionId}`);
    });

    it('away turns the mic off; deafened shows; leaving takes you out of voice', async () => {
      const a = track(await walkIn());
      a.send('status', { status: 'away' });
      await until(() => lk.includes(`mic off ${a.sessionId}`));
      a.send('deaf', { on: true });
      await until(() => me(a).deaf);
      const id = a.sessionId;
      await a.leave();
      await until(() => lk.includes(`remove ${id}`));
    });
  });

  describe('screen share', () => {
    const library = mapDataFor('library');
    const tv = { x: -10.45, z: 6.05 };

    it('on the TV: one at a time, while you stand on its rug', async () => {
      const a = track(await walkIn());
      const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
      a.send('share', { where: 'tv', audio: true });
      await quietly();
      expect(me(a).share).toBe(''); // not on the rug
      await walkTo(a, tv);
      await walkTo(b, { x: tv.x + 0.5, z: tv.z });
      a.send('share', { where: 'tv', audio: true });
      await until(() => me(a).share === 'tv' && me(a).shareAudio);
      b.send('share', { where: 'tv', audio: false });
      await quietly();
      expect(me(b).share).toBe('');
      // Walking off the rug ends it; then it's Jod's turn
      await walkTo(a, library.spawn);
      await until(() => me(a).share === '');
      b.send('share', { where: 'tv', audio: false });
      await until(() => me(b).share === 'tv');
    });

    it('to your table while you sit at a desk; standing up ends it; guests without voice can’t', async () => {
      const seat = library.deskSeats[0]!;
      const a = track(await walkIn());
      a.send('share', { where: 'table', audio: false });
      await quietly();
      expect(me(a).share).toBe(''); // not seated
      await walkTo(a, seat.out);
      a.send('sit', { seatId: seat.id });
      await until(() => me(a).seatId === seat.id);
      a.send('share', { where: 'table', audio: false });
      await until(() => me(a).share === `table:${seat.tableId}`);
      a.send('stand', {});
      await until(() => me(a).share === '');

      const g = track(await walkIn({ sub: 'u-guest', role: 'guest', name: 'Mint', handle: null }));
      await walkTo(g, tv);
      g.send('share', { where: 'tv', audio: false });
      await quietly();
      expect(me(g).share).toBe('');
    });
  });
});
