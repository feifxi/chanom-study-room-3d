import { Client, type Room } from '@colyseus/sdk';
import { listen } from 'colyseus';
import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type FocusRound,
  type QuestEvent,
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
  type ActivityOut,
  type ChessView,
  type SlaveHand,
  type SlaveView,
  type SideView,
  type TelView,
  type TelTurn,
  type SpotView,
  type WatchRefused,
  type WatchVideo,
  type WatchView,
} from '@connecta/shared';
import { artSeats, cardSeats, mapDataFor } from '@connecta/shared/maps';
import { timing } from './focus.js';
import { dispatch, dispatchWalkedIn, links } from './links.js';
import { decodeJwt } from 'jose';
import { gameServer } from './server.js';
import { liveKitVoice, voice } from './voice.js';
import { youtube } from './watch.js';
import { sideTiming } from './pickASide.js';
import { telTiming } from './drawGuess.js';
import { BUILT_IN, DECK_PASS_AUDIENCE } from '@connecta/shared/pick-a-side';

const SECRET = process.env.GAME_SECRET!;
const PORT = 4092;
const client = new Client(`http://localhost:${PORT}`);

type GameRoom = Room<
  unknown,
  {
    mapId: string;
    players: Map<string, PlayerView>;
    npcs: Map<string, NpcView>;
    watch: WatchView & { queue: WatchVideo[] };
    spots: Map<string, SpotView & { players: string[]; out: string[]; results: string[]; nextRound: string[] }>;
    chess: ChessView & { moves: string[] };
    side: SideView & { choices: string[]; winners: string[] };
    tel: TelView & { order: string[]; sent: string[] };
    slave: SlaveView & { players: string[]; pileCards: number[]; gone: string[]; finished: string[] };
    notice?: string;
    noticeUntil?: number;
  }
>;

const presence: GamePresence[] = [];
/** Each test walks into a room of its own (an empty room closes only a second after the last leave) */
let ROOM = '';
let rooms = 0;
const spaces: string[] = [];
const rounds: FocusRound[] = [];
/** What daily quests heard: `userId:counts:amount` */
const quests: string[] = [];
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
  links.quest = (e: QuestEvent) => quests.push(`${e.userId}:${e.counts}:${e.amount}`);
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
  quests.length = 0;
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
    expect(quests).toContain('u-mai:said:1');
    await until(() => b.state.players.get(a.sessionId)?.typing === false);
  });

  it('a Common room copy is text only for everyone, with a 3 s slow mode', async () => {
    const roomId = `common-cafe-${rooms}`;
    const a = track(await walkIn({ roomId, common: true }));
    const b = track(await walkIn({ roomId, common: true, sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    // Members too: nobody talks, and no voice pass at all
    await until(() => me(a).hushed);
    let passed = false;
    a.onMessage('voice', () => (passed = true));
    a.send('voice', {});
    const heard = hear(b);
    a.send('say', { text: 'hi' });
    await until(() => heard.length === 1);
    await new Promise((r) => setTimeout(r, 600));
    a.send('say', { text: 'too soon' });
    await new Promise((r) => setTimeout(r, 300));
    expect(heard.map((h) => h.text)).toEqual(['hi']);
    expect(passed).toBe(false);
  });

  it('the team’s notice shows in Common rooms only, and a copy opened later gets it from the ticket', async () => {
    const roomId = `common-cafe-${rooms}`;
    const a = track(await walkIn({ roomId, common: true }));
    const own = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const notice = { text: 'Quick restart at 03:00 🌙', until: Date.now() + 600_000 };
    dispatch({ roomId: '*', type: 'notice', notice });
    await until(() => a.state.notice === notice.text);
    expect(a.state.noticeUntil).toBe(notice.until);
    await new Promise((r) => setTimeout(r, 200));
    expect(own.state.notice ?? '').toBe('');
    const later = track(await walkIn({ roomId: `common-rooftop-${rooms}`, common: true, sub: 'u-ploy', notice }));
    await until(() => later.state.notice === notice.text);
  });

  it('blocked words in bubbles become asterisks, unless the room turned Filter words off', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heard = hear(b);
    a.send('say', { text: 'what the fuck' });
    await until(() => heard.length === 1);
    expect(heard[0]!.text).toBe('what the ****');
    dispatch({ roomId: ROOM, type: 'filterWords', on: false });
    await new Promise((r) => setTimeout(r, 450));
    a.send('say', { text: 'what the fuck' });
    await until(() => heard.length === 2);
    expect(heard[1]!.text).toBe('what the fuck');
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

  it('a new look and Plus come only from the API and show for everyone', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    // Plus starts: an animated name tag for everyone to see
    expect(me(a).plus).toBe(false);
    dispatch({ roomId: '*', type: 'plus', userId: 'u-mai', plus: true });
    await until(() => b.state.players.get(a.sessionId)!.plus);
    // There's no "look" message any more: the browser can't set its own
    dispatch({
      roomId: '*',
      type: 'look',
      userId: 'u-mai',
      look: { hair: '#f59ac0', outfit: '#ff6fa8', accessory: 'witchHat', style: 'yukata' },
    });
    await until(() => JSON.parse(b.state.players.get(a.sessionId)!.look).style === 'yukata');
    await until(() => JSON.parse(me(a).look).accessory === 'witchHat');
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

describe('watch together', () => {
  const library = mapDataFor('library');
  const tv = { x: -10.45, z: 6.05 };
  const LINK = 'https://youtu.be/lTRiuFIWV54';
  const real = youtube.lookup;
  beforeEach(() => {
    youtube.lookup = async (id) => (id === 'privateXXXX' ? null : { title: `Title of ${id}` });
  });
  afterEach(() => {
    youtube.lookup = real;
  });
  const refusals = (r: GameRoom) => {
    const got: string[] = [];
    r.onMessage('watch:refused', (m: WatchRefused) => got.push(m.reason));
    return got;
  };

  it('anyone on the rug, guests too, puts a checked video on; others are turned away', async () => {
    const a = track(await walkIn());
    const g = track(await walkIn({ sub: 'u-guest', name: 'Mint', role: 'guest' }));
    const told = refusals(a);
    a.send('watch:add', { link: LINK });
    await until(() => told.includes('away'));
    await walkTo(a, tv);
    a.send('watch:add', { link: 'https://vimeo.com/1' });
    a.send('watch:add', { link: 'https://youtu.be/privateXXXX' });
    await until(() => told.includes('link') && told.includes('unavailable'));
    a.send('watch:add', { link: LINK });
    await until(() => a.state.watch.videoId === 'lTRiuFIWV54');
    expect(a.state.watch).toMatchObject({ title: 'Title of lTRiuFIWV54', byName: 'Mai', paused: false });

    await walkTo(g, { x: tv.x + 0.5, z: tv.z });
    g.send('watch:add', { link: 'https://youtu.be/aaaaaaaaaaa' });
    await until(() => a.state.watch.queue.length === 1);
    expect(a.state.watch.queue[0]).toMatchObject({ videoId: 'aaaaaaaaaaa', byName: 'Mint' });
    g.send('watch:pause', { paused: true });
    await until(() => a.state.watch.paused);
    g.send('watch:next', { key: a.state.watch.key });
    await until(() => a.state.watch.videoId === 'aaaaaaaaaaa');
  });

  it('controls only from the rug; owners and mods turn it off from anywhere', async () => {
    const a = track(await walkIn());
    const far = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    const mod = track(await walkIn({ sub: 'u-ken', name: 'Ken', role: 'mod' }));
    await walkTo(a, tv);
    a.send('watch:add', { link: LINK });
    await until(() => far.state.watch.videoId === 'lTRiuFIWV54');
    far.send('watch:pause', { paused: true });
    far.send('watch:off');
    await quietly();
    expect(a.state.watch).toMatchObject({ videoId: 'lTRiuFIWV54', paused: false });
    mod.send('watch:off');
    await until(() => a.state.watch.videoId === '');
  });

  it('a share pauses the video and it carries on when the sharer walks off', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    await walkTo(a, tv);
    await walkTo(b, { x: tv.x + 0.5, z: tv.z });
    a.send('watch:add', { link: LINK });
    await until(() => a.state.watch.videoId !== '');
    b.send('share', { where: 'tv', audio: true });
    await until(() => a.state.watch.paused);
    await walkTo(b, library.spawn);
    await until(() => !a.state.watch.paused);
  });
});

describe('activities: chess', () => {
  const spot = (r: GameRoom) => r.state.spots.get('chess')!;
  /** Walk up to a chess stool and sit */
  async function sitAt(r: GameRoom, seat: 'chess-0' | 'chess-1') {
    await walkTo(r, seat === 'chess-0' ? { x: 5.7, z: 7.6 } : { x: 2.9, z: 7.6 });
    r.send('sit', { seatId: seat });
    await until(() => me(r).seatId === seat);
  }
  async function game() {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    await sitAt(a, 'chess-0');
    await until(() => spot(a).phase === 'gathering');
    await sitAt(b, 'chess-1');
    await until(() => spot(a).players.length === 2);
    return { a, b };
  }
  const started = async (a: GameRoom) => {
    a.send('activity:begin');
    await until(() => spot(a).phase === 'playing', 5000);
  };

  it('sitting opens the lobby with you as host; only the host calls and starts', { timeout: 20_000 }, async () => {
    const { a, b } = await game();
    expect(spot(a)).toMatchObject({ hostId: a.sessionId, phase: 'gathering' });
    b.send('activity:call');
    b.send('activity:begin');
    await quietly(300);
    expect(spot(a)).toMatchObject({ inviteBy: '', startsAt: 0 });
    a.send('activity:call');
    await until(() => spot(b).inviteBy === a.sessionId);
    await started(a);
    const c = a.state.chess;
    expect([c.white, c.black].sort()).toEqual([a.sessionId, b.sessionId].sort());
    expect(spot(a).inviteBy).toBe('');
  });

  it('moves are checked here: only yours, only legal; resigning ends it and Play again swaps colours', { timeout: 30_000 }, async () => {
    const { a, b } = await game();
    await started(a);
    const white = a.state.chess.white === a.sessionId ? a : b;
    const black = white === a ? b : a;
    black.send('chess:move', { from: 'e7', to: 'e5' });
    white.send('chess:move', { from: 'e2', to: 'e5' });
    await quietly(300);
    expect(a.state.chess.moves.length).toBe(0);
    white.send('chess:move', { from: 'e2', to: 'e4' });
    await until(() => a.state.chess.moves.length === 1);
    expect(a.state.chess).toMatchObject({ lastFrom: 'e2', lastTo: 'e4' });
    black.send('chess:resign');
    await until(() => spot(a).phase === 'results');
    expect(a.state.chess).toMatchObject({ endWhy: 'resigned', endWinner: white.sessionId });
    expect([...spot(a).results]).toEqual([white.sessionId, black.sessionId]);
    expect(quests.filter((q) => q.endsWith(':played:1'))).toHaveLength(2);
    a.send('activity:begin');
    await until(() => spot(a).phase === 'playing', 5000);
    expect(a.state.chess.white).toBe(black.sessionId);
  });

  it('Leave or leaving the room mid-game loses it; the leaver is told and stands up', { timeout: 20_000 }, async () => {
    const { a, b } = await game();
    await started(a);
    const told: ActivityOut[] = [];
    b.onMessage('activity:out', (m: ActivityOut) => told.push(m));
    b.send('activity:leave');
    await until(() => spot(a).phase === 'results');
    expect(a.state.chess).toMatchObject({ endWhy: 'left', endWinner: a.sessionId });
    await until(() => told.length === 1 && me(b).seatId === '');
    expect(told[0]).toEqual({ spot: 'chess', why: 'left' });

    // Back to the lobby with only Mai, after the results
    await until(() => spot(a).phase === 'gathering', 10_000);
    expect([...spot(a).players]).toEqual([a.sessionId]);
    await sitAt(b, 'chess-1');
    await until(() => spot(a).players.length === 2);
    await started(a);
    await b.leave();
    await until(() => a.state.chess.endWhy === 'left');
    expect(a.state.chess.endWinner).toBe(a.sessionId);
  });

  it('a reload mid-game keeps your place: sit back down and play on', { timeout: 20_000 }, async () => {
    const { a, b } = await game();
    await started(a);
    const wasWhite = a.state.chess.white === b.sessionId;
    const b2 = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    await until(() => [...spot(a).players].includes(b2.sessionId));
    expect(spot(a).phase).toBe('playing');
    expect(a.state.chess[wasWhite ? 'white' : 'black']).toBe(b2.sessionId);
    expect(spot(a).awaySince.has(b2.sessionId)).toBe(true);
    await sitAt(b2, 'chess-1');
    await until(() => !spot(a).awaySince.has(b2.sessionId));
    const white = wasWhite ? b2 : a;
    white.send('chess:move', { from: 'd2', to: 'd4' });
    await until(() => a.state.chess.moves.length === 1);
  });

  it('the host ends a round early: back to the lobby, no result', { timeout: 20_000 }, async () => {
    const { a } = await game();
    await started(a);
    a.send('activity:end');
    await until(() => spot(a).phase === 'gathering');
    expect(a.state.chess.fen).toBe('');
    expect([...spot(a).results]).toEqual([]);
  });
});

describe('activities: Slave', () => {
  const spot = (r: GameRoom) => r.state.spots.get('cards')!;
  const seats = cardSeats(mapDataFor('library').cardTables[0]!);
  /** Walk up to a card table stool and sit; remember the cards the server sends only to you */
  async function sitDown(r: GameRoom, i: number) {
    const seat = seats[i]!;
    await walkTo(r, seat.out);
    r.send('sit', { seatId: seat.id });
    await until(() => me(r).seatId === seat.id);
  }
  async function table() {
    const people = [walkIn(), walkIn({ sub: 'u-jod', name: 'Jod' }), walkIn({ sub: 'u-ploy', name: 'Ploy' })];
    const rooms = (await Promise.all(people)).map(track);
    const hands = new Map<GameRoom, SlaveHand>();
    for (const r of rooms) r.onMessage('slave:hand', (h: SlaveHand) => hands.set(r, h));
    for (const [i, r] of rooms.entries()) await sitDown(r, i * 2);
    await until(() => spot(rooms[0]!).players.length === 3);
    rooms[0]!.send('activity:begin');
    await until(() => rooms[0]!.state.slave.stage === 'play', 5000);
    await until(() => hands.size === 3);
    return { rooms, hands };
  }

  it('deals hidden hands: each player gets only their own; the 3♣ leads; plays are checked', { timeout: 30_000 }, async () => {
    const { rooms, hands } = await table();
    const [a] = rooms as [GameRoom, GameRoom, GameRoom];
    const all = rooms.flatMap((r) => hands.get(r)!.cards);
    expect(all.sort((x, y) => x - y)).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect([...a.state.slave.counts.values()].reduce((x, y) => x + y)).toBe(52);
    const leader = rooms.find((r) => hands.get(r)!.cards.includes(0))!;
    expect(a.state.slave.turn).toBe(leader.sessionId);
    // Someone else can't play, and the leader can't play a card they don't hold or a mixed pair
    const other = rooms.find((r) => r !== leader)!;
    other.send('slave:play', { cards: [hands.get(other)!.cards[0]!] });
    leader.send('slave:play', { cards: [hands.get(other)!.cards[0]!] });
    leader.send('slave:pass');
    await quietly(300);
    expect(a.state.slave.pileCards.length).toBe(0);
    leader.send('slave:play', { cards: [0] });
    await until(() => a.state.slave.pileBy === leader.sessionId);
    expect([...a.state.slave.pileCards]).toEqual([0]);
    await until(() => !hands.get(leader)!.cards.includes(0));
    expect(a.state.slave.counts.get(leader.sessionId)).toBe(hands.get(leader)!.cards.length);
    expect(a.state.slave.turn).not.toBe(leader.sessionId);
  });

  it('a reload mid-game keeps your cards: the page asks and they come back to you alone', { timeout: 30_000 }, async () => {
    const { rooms, hands } = await table();
    const [a, b] = rooms as [GameRoom, GameRoom, GameRoom];
    const mine = hands.get(b)!.cards;
    const b2 = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    let again: SlaveHand | null = null;
    b2.onMessage('slave:hand', (h: SlaveHand) => (again = h));
    b2.send('slave:hand');
    await until(() => again !== null);
    expect(again!.cards).toEqual(mine);
    expect([...a.state.slave.players]).toContain(b2.sessionId);
  });

  it('someone who leaves is out as last and the others play on', { timeout: 30_000 }, async () => {
    const { rooms } = await table();
    const [a, b, c] = rooms as [GameRoom, GameRoom, GameRoom];
    c.send('activity:leave');
    await until(() => [...a.state.slave.gone].includes(c.sessionId));
    expect(spot(a).phase).toBe('playing');
    expect(a.state.slave.counts.get(c.sessionId)).toBe(0);
    // A second leaver ends it: the last one holding cards wins
    b.send('activity:leave');
    await until(() => spot(a).phase === 'results');
    expect([...spot(a).results]).toEqual([a.sessionId, b.sessionId, c.sessionId]);
    expect(a.state.slave.titles.get(a.sessionId)).toBe('king');
  });
});

describe('the whiteboard', () => {
  const area = mapDataFor('library').boardArea;
  const front = { x: area.x, z: area.z };
  const PEN = { color: '#2b2140', size: 0.009 };

  it('relays strokes live to the others; newcomers get the board; undo is only your own', { timeout: 20_000 }, async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    const seen: { type: string; msg: unknown }[] = [];
    for (const type of ['board:start', 'board:add', 'board:undo', 'board:clear'])
      b.onMessage(type, (msg: unknown) => seen.push({ type, msg }));
    a.onMessage('board:start', () => seen.push({ type: 'echo', msg: null }));
    await walkTo(a, front);
    await walkTo(b, { x: front.x + 0.4, z: front.z });
    a.send('board:start', { n: 1, ...PEN, pts: [0.1, 0.1] });
    a.send('board:add', { n: 1, pts: [0.2, 0.2, 0.3, 0.3] });
    await until(() => seen.length === 2);
    expect(seen[0]).toEqual({ type: 'board:start', msg: { id: `${a.sessionId}:1`, ...PEN, pts: [0.1, 0.1] } });
    expect(seen[1]).toEqual({ type: 'board:add', msg: { id: `${a.sessionId}:1`, pts: [0.2, 0.2, 0.3, 0.3] } });

    // A pen the board doesn't have, points off the board, or adding to someone else's stroke: refused
    a.send('board:start', { n: 2, color: '#ff0000', size: 0.009, pts: [0.5, 0.5] });
    a.send('board:start', { n: 3, ...PEN, pts: [1.5, 0.5] });
    b.send('board:add', { n: 1, pts: [0.9, 0.9] });
    // Away from the board you can't draw
    const c = track(await walkIn({ sub: 'u-ploy', name: 'Ploy' }));
    c.send('board:start', { n: 1, ...PEN, pts: [0.5, 0.5] });
    await quietly(300);
    expect(seen.length).toBe(2);

    let all: { strokes: { id: string; pts: number[] }[] } | null = null;
    c.onMessage('board:all', (m: typeof all) => (all = m));
    c.send('board:sync');
    await until(() => all !== null);
    expect(all!.strokes).toEqual([{ id: `${a.sessionId}:1`, ...PEN, pts: [0.1, 0.1, 0.2, 0.2, 0.3, 0.3] }]);

    b.send('board:undo'); // nothing of Jod's
    a.send('board:undo');
    await until(() => seen.some((x) => x.type === 'board:undo'));
    expect(seen.filter((x) => x.type === 'board:undo')).toEqual([{ type: 'board:undo', msg: { id: `${a.sessionId}:1` } }]);
    b.send('board:start', { n: 1, ...PEN, pts: [0.4, 0.4] });
    b.send('board:clear');
    await until(() => seen.some((x) => x.type === 'board:clear'));
    expect(seen.some((x) => x.type === 'echo')).toBe(true); // Mai saw Jod's stroke
  });
});

describe('activities: Pick a Side', () => {
  const floor = mapDataFor('library').floorArea;
  const spot = (r: GameRoom) => r.state.spots.get('floor')!;
  const center = { x: floor.x, z: floor.z };
  /** The middle of zone A/B (two zones) or A–D (four), from the rug's own halves and quarters */
  const zone = (i: number, sides: number) => {
    const k = (floor.kind === 'circle' ? floor.r : Math.min(floor.w, floor.d) / 2) * 0.5;
    return { x: floor.x + (i % 2 === 0 ? -k : k), z: floor.z + (sides === 2 ? 0 : i < 2 ? -k : k) };
  };
  beforeEach(() => Object.assign(sideTiming, { ask: { wyr: 600, quiz: 600 }, reveal: 300 }));
  afterEach(() => Object.assign(sideTiming, { ask: { wyr: 10_000, quiz: 15_000 }, reveal: 4_000 }));

  it('E opens a lobby; the host picks mode and deck; the right answer shows only at the reveal', { timeout: 30_000 }, async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    await walkTo(a, center);
    a.send('activity:start', { spot: 'floor' });
    await until(() => spot(a).phase === 'gathering' && spot(a).hostId === a.sessionId);
    await walkTo(b, { x: center.x + 0.5, z: center.z });
    await until(() => spot(a).players.length === 2);
    b.send('activity:game', { gameId: 'quiz' }); // not the host
    await quietly(200);
    expect(spot(a).gameId).toBe('wyr');
    a.send('activity:game', { gameId: 'quiz' });
    await until(() => spot(a).gameId === 'quiz' && a.state.side.deckId !== 'food');
    const geo = BUILT_IN.find((d) => d.id === 'geo')!;
    a.send('side:deck', { builtIn: 'geo' });
    await until(() => a.state.side.deckId === 'geo');
    expect(a.state.side).toMatchObject({ deckName: geo.name, deckCount: geo.questions.length });

    a.send('activity:begin');
    await until(() => a.state.side.stage === 'ask', 6000);
    expect(a.state.side).toMatchObject({ mode: 'quiz', i: 0, count: 10, right: -1 });
    expect(a.state.side.choices.length).toBe(4);
    const q = geo.questions.find((x) => x.q === a.state.side.q)!;
    await walkTo(a, zone(q.right!, 4));
    await walkTo(b, zone((q.right! + 1) % 4, 4));
    await until(() => a.state.side.stage === 'reveal', 5000);
    expect(a.state.side.right).toBe(q.right);
    expect(a.state.side.answers.get(a.sessionId)).toBe(q.right);
    expect(a.state.side.scores.get(a.sessionId)).toBe(1);
    expect(a.state.side.scores.get(b.sessionId) ?? 0).toBe(0);
    // It plays through to the results, the best score first
    await until(() => spot(a).phase === 'results', 20_000);
    const score = (id: string) => a.state.side.scores.get(id) ?? 0;
    const [first, second] = [...spot(a).results];
    expect(score(first!)).toBeGreaterThanOrEqual(score(second!));
    expect([...a.state.side.winners]).toContain(first);
  });

  it('a room deck comes only with the API’s pass for this room', { timeout: 20_000 }, async () => {
    const a = track(await walkIn());
    await walkTo(a, center);
    a.send('activity:start', { spot: 'floor' });
    await until(() => spot(a).phase === 'gathering');
    const deck = {
      id: 'd1',
      name: 'Our group',
      emoji: '💬',
      kind: 'opinion',
      source: 'room',
      questions: ['Tea or coffee?', 'Beach or hills?', 'Cats or dogs?'].map((q, i) => ({ id: `d1-${i}`, q, answers: ['Yes', 'No'] })),
    };
    const sign = (roomId: string) =>
      new SignJWT({ roomId, deck })
        .setProtectedHeader({ alg: 'HS256' })
        .setAudience(DECK_PASS_AUDIENCE)
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode(SECRET));
    a.send('side:deck', { pass: await sign('another-room') });
    a.send('side:deck', { pass: 'not-a-pass' });
    await quietly(300);
    expect(a.state.side.deckId).toBe('food');
    a.send('side:deck', { pass: await sign(ROOM) });
    await until(() => a.state.side.deckId === 'd1');
    expect(a.state.side).toMatchObject({ deckName: 'Our group', deckCount: 3 });
    // Alone it still plays (no winner, just your picks)
    a.send('activity:begin');
    await until(() => a.state.side.stage === 'ask', 6000);
    expect(a.state.side.solo).toBe(true);
  });

  it('Room-wide games turned off ends the game and closes the floor', { timeout: 20_000 }, async () => {
    const a = track(await walkIn());
    await walkTo(a, center);
    a.send('activity:start', { spot: 'floor' });
    await until(() => spot(a).phase === 'gathering');
    a.send('activity:begin');
    await until(() => a.state.side.stage === 'ask', 6000);
    dispatch({ roomId: ROOM, type: 'roomWideGames', on: false });
    await until(() => spot(a).phase === 'free' && a.state.side.stage === '');
    a.send('activity:start', { spot: 'floor' });
    await quietly(300);
    expect(spot(a).phase).toBe('free');
  });
});

describe('activities: Draw & Guess', () => {
  const spot = (r: GameRoom) => r.state.spots.get('art')!;
  const seats = artSeats(mapDataFor('library').artTable!);
  const PEN = { color: '#2b2140', size: 0.009 };
  const saved = JSON.parse(JSON.stringify(telTiming));
  beforeEach(() =>
    Object.assign(telTiming, { turn: { write: 1500, draw: 1500, describe: 1500, copy: 1500 }, look: 300, collect: 600, gapScale: 0.05 }),
  );
  afterEach(() => Object.assign(telTiming, JSON.parse(JSON.stringify(saved))));

  /** A drawing goes up in pieces, then Done */
  const draw = (r: GameRoom, step: number, strokes: { color: string; size: number; pts: number[] }[]) => {
    strokes.forEach((st, s) => r.send('tel:part', { step, s, ...st }));
    r.send('tel:send', { step });
  };

  async function table() {
    const rooms = (await Promise.all([walkIn(), walkIn({ sub: 'u-jod', name: 'Jod' }), walkIn({ sub: 'u-ploy', name: 'Ploy' })])).map(
      track,
    );
    const turns = new Map<GameRoom, TelTurn>();
    const albums = new Map<GameRoom, { chains: { by: string; kind: string; text?: string; skipped?: boolean }[][] }>();
    const collects: GameRoom[] = [];
    for (const r of rooms) {
      r.onMessage('tel:turn', (t: TelTurn) => turns.set(r, t));
      r.onMessage('tel:album', (m: { chains: { by: string; kind: string }[][] }) => albums.set(r, m));
      r.onMessage('tel:collect', () => collects.push(r));
    }
    for (const [i, r] of rooms.entries()) {
      await walkTo(r, seats[i * 3]!.out);
      r.send('sit', { seatId: seats[i * 3]!.id });
      await until(() => me(r).seatId === seats[i * 3]!.id);
    }
    await until(() => spot(rooms[0]!).players.length === 3);
    rooms[0]!.send('activity:begin');
    await until(() => rooms[0]!.state.tel.stage === 'turn', 5000);
    await until(() => turns.size === 3);
    return { rooms, turns, albums, collects };
  }

  it(
    'passes each chain along; you see only what you work from; time up collects what you have; the album goes to everyone',
    { timeout: 30_000 },
    async () => {
      const { rooms, turns, albums, collects } = await table();
      const [a] = rooms as [GameRoom, GameRoom, GameRoom];
      const order = [...a.state.tel.order];
      const byId = (id: string) => rooms.find((r) => r.sessionId === id)!;
      expect(a.state.tel).toMatchObject({ mode: 'tel', steps: 3, step: 0 });
      for (const r of rooms) expect(turns.get(r)).toEqual({ step: 0, source: null });
      for (const r of rooms) r.send('tel:send', { step: 0, text: `prompt by ${r.sessionId}` });
      // Everyone done: the next step at once, each with the prompt from the one before them in the order
      await until(() => a.state.tel.step === 1);
      await until(() => rooms.every((r) => turns.get(r)!.step === 1));
      for (const [p, id] of order.entries()) {
        const before = order[(p - 1 + order.length) % order.length]!;
        expect(turns.get(byId(id))!.source).toMatchObject({ by: before, kind: 'text', text: `prompt by ${before}` });
      }
      // A drawing: two send, the third is asked for what it has when the time runs out
      const [d1, d2, slow] = order.map(byId) as [GameRoom, GameRoom, GameRoom];
      // A long stroke in two pieces
      d1.send('tel:part', { step: 1, s: 0, ...PEN, pts: [0.1, 0.1] });
      d1.send('tel:part', { step: 1, s: 0, ...PEN, pts: [0.2, 0.2] });
      d1.send('tel:send', { step: 1 });
      draw(d2, 1, [{ color: '#ff0000', size: 0.009, pts: [0.5, 0.5] }]); // a pen the board doesn't have
      await until(() => collects.includes(slow), 5000);
      expect(albums.size).toBe(0);
      draw(slow, 1, [{ ...PEN, pts: [0.3, 0.3] }]);
      await until(() => a.state.tel.step === 2);
      for (const r of rooms) r.send('tel:send', { step: 2, text: 'a sad potato' });
      await until(() => a.state.tel.stage === 'reveal', 5000);
      await until(() => albums.size === 3);
      const chains = albums.get(a)!.chains;
      expect(chains).toHaveLength(3);
      expect(chains.every((c) => c.length === 3)).toBe(true);
      // d2's drawing had only an unknown pen: it counts as nothing; d1's two pieces made one stroke
      expect(chains.flat().filter((e) => e.by === d2.sessionId && e.skipped)).toHaveLength(1);
      expect(chains.flat().find((e) => e.by === d1.sessionId && e.kind === 'drawing')).toMatchObject({
        strokes: [{ pts: [0.1, 0.1, 0.2, 0.2] }],
      });

      a.send('tel:react', { chain: 0, entry: 0, emoji: '😂' });
      a.send('tel:react', { chain: 0, entry: 0, emoji: '😂' }); // once each
      rooms[1]!.send('tel:react', { chain: 0, entry: 0, emoji: '😂' });
      await until(() => a.state.tel.reactions.get('0:0:😂') === 2);
      // The host's Next chain runs it to the end, then the results
      const host = byId(spot(a).hostId);
      host.send('tel:pause', { paused: true });
      await until(() => a.state.tel.revealPaused);
      for (let i = 0; i < 3; i++) {
        host.send('tel:next');
        await quietly(150);
      }
      await until(() => spot(a).phase === 'results', 10_000);
      expect([...spot(a).results].sort()).toEqual(order.sort());
    },
  );

  it('two empty turns in a row and you’re out (you still get the album); a reload gets your turn back', { timeout: 30_000 }, async () => {
    const { rooms, turns } = await table();
    const [a, b, c] = rooms as [GameRoom, GameRoom, GameRoom];
    const told: ActivityOut[] = [];
    c.onMessage('activity:out', (m: ActivityOut) => told.push(m));
    // A reload mid-turn: the page asks and gets its turn again
    let again: TelTurn | null = null;
    const b2 = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    b2.onMessage('tel:turn', (t: TelTurn) => (again = t));
    b2.send('tel:sync');
    await until(() => again !== null);
    expect(again).toEqual(turns.get(b));
    a.send('tel:send', { step: 0, text: 'a frog' });
    b2.send('tel:send', { step: 0, text: 'a duck' });
    await until(() => a.state.tel.step === 1, 6000);
    draw(a, 1, [{ ...PEN, pts: [0.5, 0.5] }]);
    draw(b2, 1, [{ ...PEN, pts: [0.5, 0.5] }]);
    await until(() => told.length === 1, 8000);
    expect(told[0]).toEqual({ spot: 'art', why: 'idle' });
    expect([...spot(a).players]).not.toContain(c.sessionId);
  });
});

describe('photo mode', () => {
  it('shows 📸 to everyone while it is open', async () => {
    const a = track(await walkIn());
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod' }));
    a.send('photo', { on: true });
    await until(() => b.state.players.get(a.sessionId)?.photo === true);
    a.send('photo', { on: false });
    await until(() => b.state.players.get(a.sessionId)?.photo === false);
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
    // Daily quests: the minutes, and a session that ran to its end
    expect(quests).toEqual(expect.arrayContaining(['u-mai:focusMinutes:25', 'u-mai:focusRounds:1']));
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
    // Stopped early: the minutes count, but not as a finished session
    expect(quests.filter((q) => q.includes(':focus'))).toEqual([`u-mai:focusMinutes:${rounds[0]!.minutes}`]);
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
    // Only the summon that worked counts
    expect(quests.filter((q) => q.includes(':buddy'))).toEqual(['u-mai:buddy:1']);
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

  it('a pet: its owner brings it (once, on top of the cats), only they send it home, and it leaves with them', async () => {
    const snowball = { item: 'catSnowball', coat: 'snowball', name: 'Puff' };
    const a = track(await walkIn({ pets: [snowball] }));
    const b = track(await walkIn({ sub: 'u-jod', name: 'Jod', handle: 'jod' }));
    const heardA = listen(a);
    const heardB = listen(b);
    await walkTo(a, machine);
    await walkTo(b, machine);
    // Jod doesn't own it: nothing happens
    b.send('pet:summon', { item: 'catSnowball' });
    a.send('pet:summon', { item: 'catSnowball' });
    await until(() => named(b, 'Puff'), 3000);
    const [id, puff] = named(b, 'Puff')!;
    expect(puff).toMatchObject({ kind: 'cat', owner: 'u-mai', ownerName: 'Mai' });
    expect(JSON.parse(puff.look).coat).toBe('snowball');
    expect(heardB.notes.at(-1)).toBe('✨ Mai’s cat Puff came to visit!');
    expect(heardB.summoned).toHaveLength(1);
    // One at a time; it doesn't count toward the room's 4 cats
    await quietly(2100);
    a.send('pet:summon', { item: 'catSnowball' });
    await until(() => heardA.refused.length === 1);
    expect(heardA.refused[0]).toMatch(/already/);
    b.send('npc:summon', { kind: 'cat' });
    await until(() => a.state.npcs.size === 4, 3000);

    b.send('npc:goodbye', { id });
    await until(() => heardB.refused.length === 1);
    expect(heardB.refused[0]).toBe('Only Mai can send Puff home');
    expect(a.state.npcs.has(id)).toBe(true);

    // A pet bought while you're in the room shows up in the machine at once
    dispatch({ roomId: '*', type: 'pets', userId: 'u-jod', pets: [{ item: 'catTux', coat: 'gent', name: 'Sir' }] });
    await quietly();
    b.send('pet:summon', { item: 'catTux' });
    await until(() => named(a, 'Sir'), 3000);

    // Mai leaves: Puff goes home with her
    await a.leave();
    await until(() => heardB.notes.includes('👋 Puff went home with Mai'));
    await until(() => !b.state.npcs.has(id), 15_000);
  }, 40_000);

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
