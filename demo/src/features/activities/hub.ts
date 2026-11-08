import type { MockRoom } from '../room3d/mockRoom';
import { SPOTS, spotById, type Game, type Spot, type SpotId } from './spots';

/**
 * The activity framework (feature 9), played by the demo the way the game server will run it.
 * Every activity has the same life, whatever the game:
 *
 *   Free ──sit / E──▶ Gathering ──host: Start──▶ Playing ──ends──▶ Results ──▶ Gathering (or Free)
 *
 * - **Being in the area is being in.** Seats for seated spots, the ring for standing ones.
 * - **Rounds:** people who arrive mid-round play the next one. **Drop-in:** step in any time.
 * - **Leaving:** Leave takes you out at once; being out of the area for 30 s (walked off,
 *   disconnected) does too. Out mid-round = lost. One player left = they win.
 * - **Host:** whoever started it; when they leave, the next player.
 * - **Call everyone:** the host sends one invite card to the whole room (same card for every activity).
 */

export type SpotPhase = 'free' | 'gathering' | 'playing' | 'results';

export interface SpotState {
  phase: SpotPhase;
  game: Game;
  hostId: string | null;
  /** In this round (gathering: in the lobby), in the order they arrived. */
  players: string[];
  /** Arrived mid-round: they're in next round. */
  nextRound: string[];
  /** Out this round, first out first. */
  out: string[];
  /** Left the area mid-round, and since when (30 s to come back). */
  awaySince: Record<string, number>;
  /** Pressed Leave but still standing in the area: not counted until they step out. */
  optedOut: string[];
  /** Started from afar (a scripted host walking over): the lobby waits for them a little. */
  arriving: boolean;
  since: number;
  /** Start pressed: the round starts at this time (a short countdown). */
  startsAt: number;
  invite: { by: string; at: number } | null;
  /** Results: places, winner first. */
  results: string[];
  resultsUntil: number;
}

export const GRACE_MS = 30_000;
export const COUNTDOWN_MS = 3_000;
export const RESULTS_MS = 8_000;
export const INVITE_MS = 20_000;
/** How long a starter has to walk to their spot before the lobby closes. */
const ARRIVE_MS = 15_000;

const fresh = (spot: Spot): SpotState => ({
  phase: 'free',
  game: spot.games[0]!,
  hostId: null,
  players: [],
  nextRound: [],
  out: [],
  awaySince: {},
  optedOut: [],
  arriving: false,
  since: 0,
  startsAt: 0,
  invite: null,
  results: [],
  resultsUntil: 0,
});

export interface Invite {
  key: string;
  spotId: SpotId;
  by: string;
  at: number;
}

/** A YouTube video on the big screen. */
export interface Video {
  id: string;
  title: string;
  by: string;
}

/**
 * Watch together (feature 10): one timeline for everyone watching. The server keeps where the video
 * was at `startedAt` (`offset`, seconds) and whether it's paused; each player seeks to match.
 * Anyone watching can play, pause, seek, skip and add to the queue.
 */
export interface WatchState {
  now: Video | null;
  queue: Video[];
  offset: number;
  startedAt: number;
  paused: boolean;
}

/** Nobody watching for this long: the screen switches off and the queue clears. */
const EMPTY_SCREEN_MS = 30_000;

export const watchPosition = (w: WatchState, now = Date.now()) => (w.paused ? w.offset : w.offset + (now - w.startedAt) / 1000);

export class ActivityHub {
  readonly spots = Object.fromEntries(SPOTS.map((s) => [s.id, fresh(s)])) as Record<SpotId, SpotState>;
  readonly watch: WatchState = { now: null, queue: [], offset: 0, startedAt: 0, paused: false };
  private listeners = new Set<() => void>();
  private snapshot = '';
  version = 0;
  private dismissed = new Set<string>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** Where scripted people were sitting before a game, so they can go back. */
  private home = new Map<string, string>();
  constructor(
    private readonly room: MockRoom,
    readonly roomWideGames: boolean,
    /** Things that happened to you, for toasts ("You're out", "You won!"). */
    private readonly onNews: (text: string) => void = () => {},
  ) {}

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;

  private changed() {
    const snap = JSON.stringify(this.spots) + JSON.stringify(this.watch) + [...this.dismissed].join();
    if (snap === this.snapshot) return;
    this.snapshot = snap;
    this.version++;
    this.listeners.forEach((l) => l());
  }

  dispose() {
    this.timers.forEach(clearTimeout);
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, ms));
  }

  inArea(spot: Spot, id: string) {
    const p = this.room.state.players.get(id);
    if (!p) return false;
    if (spot.seats) return spot.seats.includes(p.seatId);
    return Math.hypot(p.x - spot.area.x, p.z - spot.area.z) <= spot.area.r;
  }

  /** The spot you're part of right now (lobby or round), if any. */
  mine(id = 'me'): Spot | undefined {
    return SPOTS.find((s) => {
      const st = this.spots[s.id];
      if (st.phase === 'results') return st.results.includes(id) && this.inArea(s, id);
      if (s.kind === 'drop-in') return st.phase === 'playing' && this.inArea(s, id);
      return st.phase !== 'free' && (st.players.includes(id) || st.nextRound.includes(id));
    });
  }

  /** Invite cards to show you: called, still gathering, you're not in it, not closed, not stale. */
  invites(now: number): Invite[] {
    return SPOTS.flatMap((s) => {
      const st = this.spots[s.id];
      if (st.phase !== 'gathering' || !st.invite || st.invite.by === 'me' || st.players.includes('me')) return [];
      const key = `${s.id}:${st.invite.at}`;
      if (this.dismissed.has(key) || now - st.invite.at > INVITE_MS) return [];
      return [{ key, spotId: s.id, by: st.invite.by, at: st.invite.at }];
    });
  }

  dismiss(key: string) {
    this.dismissed.add(key);
    this.changed();
  }

  tick(now: number) {
    for (const spot of SPOTS) {
      if (!spot.built) continue;
      const st = this.spots[spot.id];
      const here = [...this.room.state.players.keys()].filter((id) => this.inArea(spot, id));
      // Pressed Leave but still standing there: forget it once they step out
      st.optedOut = st.optedOut.filter((id) => here.includes(id));
      const counted = here.filter((id) => !st.optedOut.includes(id));

      // Drop-in (the big screen): whoever's in the area is in; no rounds, no lobby, no knock-outs
      if (spot.kind === 'drop-in') {
        if (st.phase !== 'playing') continue;
        st.players = counted;
        if (counted.length) st.since = now;
        else if (now - st.since > EMPTY_SCREEN_MS) this.screenOff();
        continue;
      }

      if (st.phase === 'free') {
        // Sitting at a free table starts a lobby; standing spots need E (see start)
        if (spot.seats && counted.length)
          Object.assign(st, fresh(spot), { phase: 'gathering', hostId: counted[0], players: counted, since: now });
      } else if (st.phase === 'gathering') {
        st.players = [...st.players.filter((id) => counted.includes(id)), ...counted.filter((id) => !st.players.includes(id))];
        const hostThere = !!st.hostId && st.players.includes(st.hostId);
        if (hostThere) st.arriving = false;
        const starterWalking = st.arriving && now - st.since < ARRIVE_MS;
        if (!hostThere && !starterWalking) st.hostId = st.players[0] ?? null;
        if (!st.players.length && !starterWalking) Object.assign(st, fresh(spot));
        else if (st.startsAt && now >= st.startsAt) {
          if (st.players.length >= st.game.min)
            Object.assign(st, { phase: 'playing', since: now, startsAt: 0, out: [], awaySince: {}, invite: null });
          else st.startsAt = 0;
        }
      } else if (st.phase === 'playing') {
        for (const id of [...st.players]) {
          if (counted.includes(id)) delete st.awaySince[id];
          else if (!st.awaySince[id]) st.awaySince[id] = now;
          else if (now - st.awaySince[id] > GRACE_MS) this.knockOut(st, id, 'away');
        }
        st.nextRound = counted.filter((id) => !st.players.includes(id) && !st.out.includes(id));
        if (st.hostId && !st.players.includes(st.hostId)) st.hostId = st.players[0] ?? null;
        if (st.players.length <= 1) this.finish(spot.id, st.players);
      } else if (st.phase === 'results' && now >= st.resultsUntil) {
        Object.assign(st, { phase: 'gathering', players: counted, results: [], out: [], nextRound: [], since: now });
        if (!counted.length) Object.assign(st, fresh(spot));
        else if (!st.hostId || !counted.includes(st.hostId)) st.hostId = counted[0]!;
      }
    }
    this.changed();
  }

  // --- Watch together ---

  /** Put a video on: plays now if the screen is off, otherwise joins the queue. */
  putOn(video: Video, now = Date.now()) {
    const st = this.spots.tv;
    if (st.phase === 'free') Object.assign(st, fresh(spotById('tv')), { phase: 'playing', hostId: video.by, since: now });
    if (this.watch.now) this.watch.queue.push(video);
    else Object.assign(this.watch, { now: video, offset: 0, startedAt: now, paused: false });
    this.changed();
  }

  setPaused(paused: boolean, now = Date.now()) {
    const w = this.watch;
    if (w.paused === paused) return;
    Object.assign(w, { offset: watchPosition(w, now), startedAt: now, paused });
    this.changed();
  }

  seek(seconds: number, now = Date.now()) {
    Object.assign(this.watch, { offset: Math.max(0, seconds), startedAt: now });
    this.changed();
  }

  /** Skip, or the video ended: next in the queue, or the screen goes quiet. */
  next(now = Date.now()) {
    const w = this.watch;
    const up = w.queue.shift() ?? null;
    Object.assign(w, { now: up, offset: 0, startedAt: now, paused: false });
    if (!up) this.screenOff();
    this.changed();
  }

  removeQueued(index: number) {
    this.watch.queue.splice(index, 1);
    this.changed();
  }

  private screenOff() {
    Object.assign(this.watch, { now: null, queue: [], offset: 0, paused: false });
    Object.assign(this.spots.tv, fresh(spotById('tv')));
  }

  /** Demo: someone walks to the big screen and puts something on. */
  scriptWatch() {
    if (this.watch.now) return;
    const id = this.freePeople()[0];
    if (!id) return;
    const tv = spotById('tv');
    this.room.sendTo(id, ringSpot(tv, 0));
    this.later(2500, () => this.putOn({ id: 'lTRiuFIWV54', title: '1 A.M Study Session 📚 [lofi hip hop]', by: id }));
  }

  /** E at a standing spot: open a lobby there, with you as host. */
  start(spotId: SpotId, by: string, now = Date.now()) {
    const spot = spotById(spotId);
    const st = this.spots[spotId];
    if (st.phase !== 'free' || (spot.roomWide && !this.roomWideGames)) return;
    const there = this.inArea(spot, by);
    Object.assign(st, fresh(spot), { phase: 'gathering', hostId: by, players: there ? [by] : [], arriving: !there, since: now });
    this.changed();
  }

  pickGame(spotId: SpotId, gameId: string) {
    const st = this.spots[spotId];
    st.game = spotById(spotId).games.find((g) => g.id === gameId) ?? st.game;
    this.changed();
  }

  /** The host's 📣: one invite card to everyone in the room. */
  call(spotId: SpotId, by: string, now = Date.now()) {
    this.spots[spotId].invite = { by, at: now };
    this.changed();
    if (by === 'me') this.scriptFriendsCome(spotId);
  }

  begin(spotId: SpotId, now = Date.now()) {
    const st = this.spots[spotId];
    if (st.phase === 'results') Object.assign(st, { phase: 'gathering', results: [], out: [] });
    st.startsAt = now + COUNTDOWN_MS;
    this.changed();
  }

  /** The host ends the round early: back to the lobby, no winner. */
  end(spotId: SpotId, now = Date.now()) {
    const st = this.spots[spotId];
    Object.assign(st, { phase: 'gathering', out: [], nextRound: [], awaySince: {}, since: now });
    this.changed();
  }

  /** Leave: out at once (mid-round that's a loss). Seats stand you up; the room view walks you out of a ring. */
  leave(spotId: SpotId, id: string) {
    const spot = spotById(spotId);
    const st = this.spots[spotId];
    if (st.phase === 'playing' && st.players.includes(id) && spot.kind === 'rounds') this.knockOut(st, id, 'left');
    st.players = st.players.filter((x) => x !== id);
    st.nextRound = st.nextRound.filter((x) => x !== id);
    if (!st.optedOut.includes(id)) st.optedOut.push(id);
    if (spot.seats && this.room.state.players.get(id)?.seatId) {
      if (id === 'me') this.room.send('stand', {});
      // Scripted people wander off a little, out of the area
      else this.room.sendTo(id, { x: spot.area.x - 2.6, z: spot.area.z - 1.4 });
    }
    this.changed();
  }

  /** Demo: a round ends (the real games decide their own winners). */
  finish(spotId: SpotId, order?: string[]) {
    const st = this.spots[spotId];
    const standing = order ?? [...st.players].sort(() => Math.random() - 0.5);
    // Winner first; then everyone still in; then those knocked out, last one out placing highest
    st.results = [...standing, ...[...st.out].reverse()];
    Object.assign(st, { phase: 'results', resultsUntil: Date.now() + RESULTS_MS, startsAt: 0, awaySince: {} });
    this.changed();
    if (spotId === 'floor') this.later(RESULTS_MS - 1500, () => this.scriptGoHome());
  }

  /** Demo: someone else gets up and leaves mid-round. */
  someoneLeaves(spotId: SpotId) {
    const st = this.spots[spotId];
    const other = st.players.find((id) => id !== 'me');
    if (other) this.leave(spotId, other);
  }

  private knockOut(st: SpotState, id: string, why: 'left' | 'away') {
    st.players = st.players.filter((x) => x !== id);
    if (!st.out.includes(id)) st.out.push(id);
    delete st.awaySince[id];
    if (id === 'me') this.onNews(why === 'away' ? 'You were away from the game for 30 s, so you’re out' : 'You left the game');
  }

  // --- Demo scripts: other people answering invites and starting games ---

  /** People not already busy with an activity, the ones not focusing first. */
  private freePeople() {
    const busy = new Set(SPOTS.flatMap((s) => [...this.spots[s.id].players, ...this.spots[s.id].nextRound]));
    return [...this.room.state.players.entries()]
      .filter(([id, p]) => id !== 'me' && !busy.has(id) && !this.room.traveling(id) && !p.seatId.startsWith('game-'))
      .sort(([, a], [, b]) => Number(a.status === 'focus') - Number(b.status === 'focus'))
      .map(([id]) => id);
  }

  /** You called everyone to the game table: two people wander over and sit down. */
  private scriptFriendsCome(spotId: SpotId) {
    const spot = spotById(spotId);
    this.freePeople()
      .slice(0, 2)
      .forEach((id, i) =>
        this.later(1800 + i * 2200, () => {
          const p = this.room.state.players.get(id);
          if (!p) return;
          if (p.seatId) this.home.set(id, p.seatId);
          const seat = spot.seats?.find((s) => this.room.seatFree(s));
          if (spot.seats && !seat) return;
          this.room.sendTo(id, ringSpot(spot, i), seat);
        }),
      );
  }

  /** Someone else starts Pick a Side and calls the room; a friend joins; they start once you're in (or anyway). */
  scriptPickASide() {
    const spot = spotById('floor');
    if (this.spots.floor.phase !== 'free' || !this.roomWideGames) return;
    const free = this.freePeople();
    // Mai if she's here (she's focusing: people who study still join in), then whoever else
    const host = free.includes('mai') ? 'mai' : free[0];
    const friend = free.find((id) => id !== host && id === 'jod') ?? free.find((id) => id !== host);
    if (!host) return;
    const go = (id: string, i: number) => {
      const p = this.room.state.players.get(id);
      if (p?.seatId) this.home.set(id, p.seatId);
      this.room.sendTo(id, ringSpot(spot, i));
    };
    go(host, 0);
    this.start('floor', host);
    this.call('floor', host);
    if (friend) this.later(2500, () => go(friend, 1));
    const startedAt = Date.now();
    const wait = setInterval(() => {
      const st = this.spots.floor;
      if (st.phase !== 'gathering' || st.hostId !== host) return clearInterval(wait);
      const ready = st.players.length >= st.game.min;
      if (ready && (st.players.includes('me') || Date.now() - startedAt > 30_000)) {
        clearInterval(wait);
        this.later(4000, () => {
          if (this.spots.floor.phase !== 'gathering') return;
          this.begin('floor');
          // A Pick a Side question lasts about 15 s in the placeholder
          this.later(COUNTDOWN_MS + 15_000, () => this.spots.floor.phase === 'playing' && this.finish('floor'));
        });
      }
    }, 500);
    this.timers.push(wait as unknown as ReturnType<typeof setTimeout>);
  }

  /** After the floor game, scripted people go back to where they were. */
  private scriptGoHome() {
    for (const [id, seatId] of this.home) {
      if (!this.spots.floor.results.includes(id)) continue;
      // The seat decides where they walk; the destination is only used without one
      this.room.sendTo(id, { x: 0, z: 0 }, seatId);
      this.home.delete(id);
    }
  }
}

/** A place inside a spot's ring for the i-th person to stand. */
function ringSpot(spot: Spot, i: number) {
  const a = 0.8 + i * 1.9;
  const r = spot.area.r * 0.55;
  return { x: spot.area.x + Math.sin(a) * r, z: spot.area.z + Math.cos(a) * r };
}
