import { Client, type Room } from '@colyseus/sdk';
import { listen } from 'colyseus';
import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type FocusRound,
  GAME_CLOSE,
  GAME_ROOM,
  TICKET_AUDIENCE,
  type GamePresence,
  type GameTicket,
  type NpcNote,
  type NpcReact,
  type NpcRefused,
  type NpcSummoned,
  type NpcView,
  type PlayerView,
  type Said,
} from '@connecta/shared';
import { mapDataFor } from '@connecta/shared/maps';
import { timing } from './focus.js';
import { dispatch, dispatchWalkedIn, links } from './links.js';
import { decodeJwt } from 'jose';
import { gameServer } from './server.js';
import { liveKitVoice, voice } from './voice.js';

const SECRET = process.env.GAME_SECRET!;
const PORT = 4092;
const client = new Client(`http://localhost:${PORT}`);

type GameRoom = Room<unknown, { mapId: string; players: Map<string, PlayerView>; npcs: Map<string, NpcView> }>;

const presence: GamePresence[] = [];
/** Each test walks into a room of its own (an empty room closes only a second after the last leave) */
let ROOM = '';
let rooms = 0;
const spaces: string[] = [];
const rounds: FocusRound[] = [];
/** A timer minute lasts this long here, so a 25-minute round takes a second */
const MINUTE = 40;

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
  links.focusRound = (r) => rounds.push(r);
  links.walkedIn = dispatchWalkedIn;
  timing.minuteMs = MINUTE;
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
  rounds.length = 0;
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

  it('one room at a time: walking into another room takes you out of the first', async () => {
    const a = await walkIn();
    const stay = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    const code = closed(a);
    const b = track(await walkIn({ roomId: `${ROOM}-b` }));
    expect(await code).toBe(GAME_CLOSE.otherRoom);
    await until(() => stay.state.players.size === 1);
    await until(() => presence.some((u) => u.userId === 'u-mai' && u.roomId === null));
    expect(me(b).userId).toBe('u-mai');
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

  it('away shows 💤; only the owner and mods talk to everyone, and away ends it', async () => {
    const a = track(await walkIn());
    a.send('stage', { on: true });
    await quietly();
    expect(me(a).stage).toBe(false);
    dispatch({ roomId: ROOM, type: 'role', userId: 'u-mai', role: 'mod' });
    await until(() => me(a).role === 'mod');
    a.send('stage', { on: true });
    await until(() => me(a).stage);
    a.send('away', { on: true });
    await until(() => me(a).status === 'away');
    expect(me(a).stage).toBe(false);
    a.send('away', { on: false });
    await until(() => me(a).status === 'idle');
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
      a.send('away', { on: true });
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

describe('the focus timer', () => {
  const focusOf = (userId: string) => presence.filter((u) => u.userId === userId).at(-1)?.focus;

  it('runs a round on the server: focus, then a break, then idle; the round is saved', async () => {
    const a = track(await walkIn());
    a.send('focus:start', { preset: 0, subject: '  Calculus but a very long subject name ' });
    await until(() => me(a).status === 'focus');
    expect(me(a)).toMatchObject({ subject: 'Calculus but a very long', focusPreset: 0 });
    expect(me(a).statusEndsAt - me(a).focusSince).toBe(25 * MINUTE);
    await until(() => focusOf('u-mai') === 'Calculus but a very long');

    await until(() => me(a).status === 'break', 3000);
    expect(me(a).statusEndsAt).toBeGreaterThan(0);
    expect(me(a).focusSince).toBe(0);
    expect(me(a).todayMin).toBe(25);
    expect(rounds).toEqual([expect.objectContaining({ userId: 'u-mai', roomId: ROOM, subject: 'Calculus but a very long', minutes: 25 })]);
    expect(focusOf('u-mai')).toBeNull();
    await until(() => me(a).status === 'idle', 1000);
    expect(me(a).statusEndsAt).toBe(0);
  });

  it('Stop counts what you did; under a minute counts nothing', async () => {
    const a = track(await walkIn());
    // Back to back: well under a (test) minute
    a.send('focus:start', { preset: 1 });
    a.send('focus:stop');
    await quietly();
    expect(me(a).status).toBe('idle');
    expect(rounds).toEqual([]);

    a.send('focus:start', { preset: 1 });
    await until(() => me(a).status === 'focus');
    expect(me(a).focusPreset).toBe(1);
    await quietly(3 * MINUTE + 20);
    a.send('focus:stop');
    await until(() => rounds.length === 1);
    expect(rounds[0]!.minutes).toBeGreaterThanOrEqual(3);
    await until(() => me(a).todayMin === rounds[0]!.minutes);
  });

  it('a running round is never away; away shows again once it stops', async () => {
    const a = track(await walkIn());
    a.send('focus:start', { preset: 0 });
    await until(() => me(a).status === 'focus');
    a.send('away', { on: true });
    await quietly();
    expect(me(a).status).toBe('focus');
    expect(lk).not.toContain(`mic off ${a.sessionId}`);
    a.send('focus:stop');
    await until(() => me(a).status === 'away');
  });

  it('guests get the timer, but nothing is saved for them', async () => {
    const g = track(await walkIn({ sub: 'u-guest', role: 'guest', name: 'Mint', handle: null }));
    g.send('focus:start', { preset: 0 });
    await until(() => me(g).status === 'break', 3000);
    expect(me(g).todayMin).toBe(25);
    expect(rounds).toEqual([]);
  });

  it('leaving counts the round; walking back in keeps today’s minutes while the room is open', async () => {
    const stay = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    const a = await walkIn();
    a.send('focus:start', { preset: 1 });
    await until(() => me(a).status === 'focus');
    await quietly(2 * MINUTE + 20);
    await a.leave();
    await until(() => rounds.length === 1);
    expect(rounds[0]!.minutes).toBeGreaterThanOrEqual(2);
    const back = track(await walkIn());
    expect(me(back).todayMin).toBe(rounds[0]!.minutes);
    expect(stay.state.players.size).toBe(2);
  });

  it('a reload keeps your round; walking into another room ends it there and counts it', async () => {
    const a = await walkIn();
    a.send('focus:start', { preset: 0, subject: 'Physics' });
    await until(() => me(a).status === 'focus');
    const since = me(a).focusSince;
    // The same account opens the room again (a reload): the newest connection wins and keeps the timer
    const again = track(await walkIn());
    await until(() => me(again).status === 'focus');
    expect(me(again)).toMatchObject({ focusSince: since, subject: 'Physics' });
    expect(rounds).toEqual([]);

    // One room at a time: walking into another lets you go here, and the round counts
    await quietly(MINUTE + 20);
    const code = closed(again);
    track(await walkIn({ roomId: `${ROOM}-b` }));
    expect(await code).toBe(GAME_CLOSE.otherRoom);
    await until(() => rounds.length === 1);
    expect(rounds).toEqual([expect.objectContaining({ roomId: ROOM, subject: 'Physics' })]);
  });
});

describe('cats and study buddies', () => {
  const library = mapDataFor('library');
  const machine = library.gacha;
  const npcs = (r: GameRoom) => [...r.state.npcs.entries()];
  const named = (r: GameRoom, name: string) => npcs(r).find(([, n]) => n.name === name);
  /** Everything the Buddy Machine and the NPCs tell a client */
  function listen(r: GameRoom) {
    const got = {
      summoned: [] as NpcSummoned[],
      said: [] as Said[],
      react: [] as NpcReact[],
      notes: [] as string[],
      refused: [] as string[],
    };
    r.onMessage('npc:summoned', (m: NpcSummoned) => got.summoned.push(m));
    r.onMessage('npc:said', (m: Said) => got.said.push(m));
    r.onMessage('npc:react', (m: NpcReact) => got.react.push(m));
    r.onMessage('npc:note', (m: NpcNote) => got.notes.push(m.text));
    r.onMessage('npc:refused', (m: NpcRefused) => got.refused.push(m.reason));
    return got;
  }

  it('a room opens with its map’s resident cats: Mochi napping, Tofu by the door', async () => {
    const a = track(await walkIn());
    await until(() => a.state.npcs.size === 2);
    expect(named(a, 'Mochi')?.[1]).toMatchObject({ kind: 'cat', anim: 'nap' });
    expect(named(a, 'Tofu')?.[1].kind).toBe('cat');
  });

  it('summons at the machine only: everyone sees the capsule, the cat steps out after it, one pull every 2 s', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heardA = listen(a);
    const heardB = listen(b);
    await walkTo(a, library.deskSeats[0]!.out);
    a.send('npc:summon', { kind: 'cat' });
    await until(() => heardA.refused.length === 1);
    expect(heardA.refused[0]).toMatch(/walk up/i);

    await walkTo(a, machine);
    a.send('npc:summon', { kind: 'cat' });
    await until(() => heardB.summoned.length === 1);
    expect(heardB.summoned[0]).toMatchObject({ kind: 'cat', bySessionId: a.sessionId, byName: 'Mai' });
    expect(a.state.npcs.size).toBe(2); // still rolling out
    a.send('npc:summon', { kind: 'buddy' });
    await until(() => heardA.refused.length === 2);
    expect(heardA.refused[1]).toMatch(/cooling down/);
    await until(() => a.state.npcs.size === 3, 3000);
    expect(heardB.notes.at(-1)).toMatch(new RegExp(`Mai summoned an? .*cat, ${heardB.summoned[0]!.name}!`));
    expect(heardB.react.at(-1)).toMatchObject({ id: heardB.summoned[0]!.npcId, emote: '✨' });
  }, 20_000);

  it('caps cats at 4 (the residents count), whoever pulls', async () => {
    const people = await Promise.all(['a', 'b', 'c'].map(async (x) => track(await walkIn({ sub: `u-${x}`, name: x, handle: x }))));
    for (const r of people) await walkTo(r, machine);
    const heard = listen(people[2]!);
    people[0]!.send('npc:summon', { kind: 'cat' });
    people[1]!.send('npc:summon', { kind: 'cat' });
    await quietly();
    people[2]!.send('npc:summon', { kind: 'cat' });
    await until(() => heard.refused.length === 1);
    expect(heard.refused[0]).toMatch(/plenty of cats/);
    // A study buddy still fits, and takes a free desk focusing
    people[2]!.send('npc:summon', { kind: 'buddy' });
    await until(() => npcs(people[2]!).some(([, n]) => n.kind === 'buddy'), 3000);
    const [, buddy] = npcs(people[2]!).find(([, n]) => n.kind === 'buddy')!;
    expect(library.deskSeats.some((s) => s.id === buddy.seatId)).toBe(true);
    expect(buddy).toMatchObject({ status: 'focus', anim: 'sit' });
  }, 20_000);

  it('a study buddy gives its seat up to a person', async () => {
    const a = track(await walkIn());
    await walkTo(a, machine);
    a.send('npc:summon', { kind: 'buddy' });
    await until(() => npcs(a).some(([, n]) => n.kind === 'buddy' && n.seatId), 3000);
    const [id, buddy] = npcs(a).find(([, n]) => n.kind === 'buddy')!;
    const seat = library.seatById.get(buddy.seatId)!;
    const heard = listen(a);
    await walkTo(a, seat.out);
    a.send('sit', { seatId: seat.id });
    await until(() => me(a).seatId === seat.id);
    expect(a.state.npcs.get(id)!.seatId).not.toBe(seat.id);
    await until(() => heard.said.some((m) => m.id === id));
  }, 20_000);

  it('petting a cat in reach: hearts, a purr, and it follows you', async () => {
    const a = track(await walkIn());
    const heard = listen(a);
    await until(() => named(a, 'Tofu'));
    const [id, tofu] = named(a, 'Tofu')!;
    for (let i = 0; i < 10 && tofu.following !== a.sessionId; i++) {
      await walkTo(a, tofu);
      a.send('npc:pet', { id });
      await quietly(150);
    }
    expect(tofu.following).toBe(a.sessionId);
    expect(heard.react).toContainEqual({ id, emote: '❤️' });
    expect(heard.said.some((m) => m.id === id)).toBe(true);
  }, 20_000);

  it('anyone can say goodbye; a new map brings its own resident cats back', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heard = listen(a);
    await until(() => named(b, 'Tofu'));
    b.send('npc:goodbye', { id: named(b, 'Tofu')![0] });
    await until(() => heard.notes.includes('👋 Jod said goodbye to Tofu'));
    await until(() => !named(a, 'Tofu'), 15_000);
    dispatch({ roomId: ROOM, type: 'map', mapId: 'cafe' });
    await until(() => a.state.mapId === 'cafe' && !!named(a, 'Tofu') && a.state.npcs.size === 2);
  }, 25_000);
});
