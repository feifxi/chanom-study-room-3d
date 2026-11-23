import { watchPosition } from '@connecta/shared';
import type { MockRoom } from '../room3d/mockRoom';
import { BoardStore, catDoodle, type Stroke } from './board/board';
import { DOODLES, FUNNY_GUESSES, randomPrompt, wobble } from './telephone/content';
import {
  CHAIN_GAP,
  LOOK_MS,
  TURN_MS,
  entryKind,
  newTel,
  revealGap,
  sourceFor,
  stepKind,
  chainOf,
  type Entry,
  type TelGame,
  type TelMode,
} from './telephone/game';
import { BUILT_IN, deckKindFor, type Deck } from './pickASide/decks';
import { ASK_MS, REVEAL_MS, newGame, sidesFor, zoneAt, zoneCenter, type SideGame, type SideMode } from './pickASide/game';
import { SPOTS, spotById, type Game, type Spot, type SpotId } from './spots';
import type { PieceSymbol, Square } from 'chess.js';
import * as slave from './slave/game';
import { answerDraw, forfeit, friendlyMove, newChess, offerDraw, play, resign, turnOf, type ChessGame } from './chess/game';
import { areaEdgePoint, areaInnerPoint, inArea, isGameSeat } from '../map/types';

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
  /** A real room's: which add this is (skip and remove name it) and who added it, even after they left */
  key?: string;
  byName?: string;
}

/**
 * A real room: the game server runs some spots (feature 9; chess for now). The hub mirrors their
 * rounds each tick and passes the host's and players' actions on; the other spots still run here.
 */
export interface ActivityRemote {
  /** The spots the server runs, in the hub's shape (you're 'me') */
  spots(): Partial<Record<SpotId, Omit<SpotState, 'game'> & { gameId: string }>>;
  chess(): ChessGame | null;
  begin(): void;
  end(): void;
  call(): void;
  leave(): void;
  chessMove(from: Square, to: Square, promotion?: PieceSymbol): void;
  chessResign(): void;
  chessOfferDraw(): void;
  chessAnswerDraw(accept: boolean): void;
  /** Slave with your own hand (the others' are blanks, one per card they hold) */
  slave(): slave.SlaveGame | null;
  slavePlay(cards: slave.Card[]): void;
  slavePass(): void;
  slaveGiveBack(cards: slave.Card[]): void;
  /** Pick a Side on the floor: the game (only the question being asked) and the host's deck */
  side(): SideGame | null;
  floorDeck(): Deck | null;
  /** E at a standing spot */
  open(spotId: SpotId): void;
  pickGame(gameId: string): void;
  pickDeck(deck: Deck): void;
  /** Draw & Guess: your turn's source, then the album (only what you may see) */
  tel(): TelGame | null;
  telSend(entry: Omit<Entry, 'by'>): void;
  /** What you have so far: the server asks for it when the time runs out */
  telDraft(text: string, strokes: Stroke[]): void;
  telReact(chain: number, entry: number, emoji: string): void;
  telPause(paused: boolean): void;
  telNext(): void;
}

/**
 * A real room: the game server owns the big screen (feature 10). The hub mirrors it each tick and
 * passes every action on; the demo's rooms keep the hub's own screen.
 */
export interface WatchRemote {
  /** The server's screen, with its TV share, in the hub's shape (you're 'me') */
  state(): Omit<WatchState, 'resume'>;
  add(videoId: string): void;
  pause(paused: boolean): void;
  seek(seconds: number): void;
  next(key: string): void;
  remove(key: string): void;
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
  /**
   * Someone's screen on the big screen. It takes over while it lasts: the video pauses and carries
   * on afterwards. The picture and sound go over LiveKit, never through room state.
   */
  share: ScreenShare | null;
  /** The video was playing when the share began, so it plays again when the share ends. */
  resume: boolean;
}

export interface ScreenShare {
  by: string;
  /** The sharer picked a tab or screen with its sound (browsers allow it on some systems only). */
  audio: boolean;
}

/** Nobody watching for this long: the screen switches off and the queue clears. */
const EMPTY_SCREEN_MS = 30_000;

export { watchPosition };

export class ActivityHub {
  readonly spots = Object.fromEntries(SPOTS.map((s) => [s.id, fresh(s)])) as Record<SpotId, SpotState>;
  readonly watch: WatchState = { now: null, queue: [], offset: 0, startedAt: 0, paused: false, share: null, resume: false };
  /** Set in a real room: the big screen is the game server's */
  remote: WatchRemote | null = null;
  /** Set in a real room: the spots the game server runs (chess for now) */
  activities: ActivityRemote | null = null;
  /** Whether the game server runs this spot (then its round is mirrored, not played here) */
  private served(spotId: SpotId) {
    return !!this.activities?.spots()[spotId];
  }
  /** The whiteboard's drawing (its own store: strokes change on every pointer move). */
  readonly board = new BoardStore();
  /** Pick a Side: the deck the host picked in the lobby, and the game while it runs (and its results). */
  floorDeck: Deck = BUILT_IN[0]!;
  side: SideGame | null = null;
  /** Draw & Guess at the art corner, and what you have so far this turn (sent as is when time runs out). */
  tel: TelGame | null = null;
  telDraft: { text: string; strokes: Stroke[] } = { text: '', strokes: [] };
  /** Chess at the chess table, kept after it ends for the results (and the 3D board). */
  chess: ChessGame | null = null;
  /** Slave at the card table, kept after it ends for the results; its titles carry into Play again. */
  slave: slave.SlaveGame | null = null;
  private listeners = new Set<() => void>();
  private snapshot = '';
  version = 0;
  private dismissed = new Set<string>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** Where scripted people were sitting before a game, so they can go back. */
  private home = new Map<string, string>();
  private scripted = 0;
  private scriptedTel = 0;
  constructor(
    private readonly room: MockRoom,
    readonly roomWideGames: boolean,
    /** Things that happened to you, for toasts ("You're out", "You won!"). */
    private readonly onNews: (text: string) => void = () => {},
  ) {
    // The whiteboard is always on: walk up and you're drawing, no E to press first (see tick)
    this.spots.board.phase = 'playing';
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;

  private changed() {
    const snap =
      JSON.stringify(this.spots) +
      JSON.stringify(this.watch) +
      JSON.stringify(this.side) +
      (this.tel ? `${this.tel.rev}:${this.tel.stage}` : '') +
      (this.chess ? `${this.chess.rev}` : '-') +
      (this.slave ? `${this.slave.rev}:${this.slave.stage}` : '-') +
      this.floorDeck.id +
      [...this.dismissed].join();
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
    return inArea(spot.area, p.x, p.z);
  }

  /** The spot you're part of right now (lobby or round), if any. */
  mine(id = 'me'): Spot | undefined {
    return SPOTS.find((s) => {
      const st = this.spots[s.id];
      if (st.phase === 'results') return st.results.includes(id) && this.inArea(s, id);
      if (s.kind === 'drop-in') return st.phase === 'playing' && this.inArea(s, id);
      if (st.phase === 'playing' && st.out.includes(id)) return this.inArea(s, id);
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
    const served = this.activities?.spots() ?? {};
    if (this.activities) {
      this.chess = this.activities.chess();
      this.slave = this.activities.slave();
      this.side = this.activities.side();
      this.floorDeck = this.activities.floorDeck() ?? this.floorDeck;
      this.tel = this.activities.tel();
    }
    for (const spot of SPOTS) {
      if (!spot.built) continue;
      const st = this.spots[spot.id];
      const remote = served[spot.id];
      if (remote) {
        const { gameId, ...rest } = remote;
        Object.assign(st, rest, { game: spot.games.find((g) => g.id === gameId) ?? spot.games[0]! });
        continue;
      }
      const here = [...this.room.state.players.keys()].filter((id) => this.inArea(spot, id));
      // Pressed Leave but still standing there: forget it once they step out
      st.optedOut = st.optedOut.filter((id) => here.includes(id));
      const counted = here.filter((id) => !st.optedOut.includes(id));

      // Drop-in (big screen, whiteboard): whoever's in the area is in; no rounds, no lobby, no knock-outs
      if (spot.kind === 'drop-in') {
        if (spot.id === 'tv' && this.remote) {
          Object.assign(this.watch, this.remote.state(), { resume: false });
          const on = !!(this.watch.now || this.watch.share);
          if (on && st.phase !== 'playing') Object.assign(st, fresh(spot), { phase: 'playing', since: now });
          if (!on && st.phase !== 'free') Object.assign(st, fresh(spot));
          st.players = on ? counted : [];
          continue;
        }
        if (st.phase !== 'playing') continue;
        st.players = counted;
        if (counted.length) st.since = now;
        // A share ends when its sharer walks away from the screen, like a desk share when you stand
        if (spot.id === 'tv' && this.watch.share && !here.includes(this.watch.share.by)) this.stopShare(this.watch.share.by, now);
        // The screen switches off once nobody's watching; the board keeps its drawing until someone
        // clears it or the room empties (the room resets then, like everything else)
        if (counted.length) continue;
        if (spot.id === 'tv' && now - st.since > EMPTY_SCREEN_MS) this.screenOff();
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
          if (st.players.length >= st.game.min) {
            Object.assign(st, { phase: 'playing', since: now, startsAt: 0, out: [], awaySince: {}, invite: null });
            if (spot.id === 'floor') this.sideStart(now);
            if (spot.id === 'art') this.telStart(now);
            if (spot.id === 'chess') this.chessStart();
            if (spot.id === 'cards') this.slaveStart(now);
          } else st.startsAt = 0;
        }
      } else if (st.phase === 'playing') {
        for (const id of [...st.players]) {
          if (counted.includes(id)) delete st.awaySince[id];
          else if (!st.awaySince[id]) st.awaySince[id] = now;
          else if (now - st.awaySince[id] > GRACE_MS) this.knockOut(st, id, 'away');
        }
        st.nextRound = counted.filter((id) => !st.players.includes(id) && !st.out.includes(id));
        if (st.hostId && !st.players.includes(st.hostId)) st.hostId = st.players[0] ?? null;
        if (spot.id === 'floor') this.sideTick(now, spot, st);
        if (spot.id === 'art') this.telTick(now, st);
        // Chess: one player gone (left, or away for 30 s) and the other wins
        if (spot.id === 'chess' && this.chess && !this.chess.end && st.players.length < 2) {
          const gone = [this.chess.white, this.chess.black].find((id) => !st.players.includes(id));
          if (gone) forfeit(this.chess, gone);
        }
        if (spot.id === 'cards') this.slaveTick(now, st);
        // Pick a Side ends itself after the reveal, and telephone after its album, so they play out
        const sideRunning = (spot.id === 'floor' && this.side && this.side.stage !== 'done') || (spot.id === 'art' && !!this.tel);
        if (st.phase === 'playing' && !sideRunning && st.players.length <= 1) this.finish(spot.id, st.players);
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
    if (this.remote) return this.remote.add(video.id);
    const st = this.spots.tv;
    if (st.phase === 'free') Object.assign(st, fresh(spotById('tv')), { phase: 'playing', hostId: video.by, since: now });
    // While a screen is shared, new videos wait their turn
    if (this.watch.now || this.watch.share) this.watch.queue.push(video);
    else Object.assign(this.watch, { now: video, offset: 0, startedAt: now, paused: false });
    this.changed();
  }

  setPaused(paused: boolean, now = Date.now()) {
    if (this.remote) return this.remote.pause(paused);
    const w = this.watch;
    if (w.paused === paused) return;
    Object.assign(w, { offset: watchPosition(w, now), startedAt: now, paused });
    this.changed();
  }

  seek(seconds: number, now = Date.now()) {
    if (this.remote) return this.remote.seek(seconds);
    Object.assign(this.watch, { offset: Math.max(0, seconds), startedAt: now });
    this.changed();
  }

  /** A player says this video ended: the next one, once (a late report for an older video is ignored) */
  ended(videoId: string, now = Date.now()) {
    if (this.watch.now?.id === videoId) this.next(now);
  }

  /** Skip, or the video ended: next in the queue, or the screen goes quiet. */
  next(now = Date.now()) {
    if (this.remote) return void (this.watch.now?.key && this.remote.next(this.watch.now.key));
    const w = this.watch;
    const up = w.queue.shift() ?? null;
    Object.assign(w, { now: up, offset: 0, startedAt: now, paused: false });
    if (!up) this.screenOff();
    this.changed();
  }

  removeQueued(index: number) {
    const key = this.watch.queue[index]?.key;
    if (this.remote) return void (key && this.remote.remove(key));
    this.watch.queue.splice(index, 1);
    this.changed();
  }

  /** Share a screen on the TV: it takes over at once, and a playing video pauses until it ends. */
  startShare(share: ScreenShare, now = Date.now()) {
    if (this.remote) return; // the server's: a player's share
    const st = this.spots.tv;
    const w = this.watch;
    if (w.share) return;
    if (st.phase === 'free') Object.assign(st, fresh(spotById('tv')), { phase: 'playing', hostId: share.by, since: now });
    const resume = !!w.now && !w.paused;
    if (resume) Object.assign(w, { offset: watchPosition(w, now), startedAt: now, paused: true });
    Object.assign(w, { share, resume });
    this.changed();
  }

  /** The sharer stopped (or walked away): the video carries on, the next one starts, or the screen goes quiet. */
  stopShare(by: string, now = Date.now()) {
    if (this.remote) return;
    const w = this.watch;
    if (w.share?.by !== by) return;
    const resume = w.resume;
    Object.assign(w, { share: null, resume: false });
    if (!w.now && w.queue.length) return this.next(now);
    if (!w.now) this.screenOff();
    else if (resume) Object.assign(w, { startedAt: now, paused: false });
    this.changed();
  }

  private screenOff() {
    Object.assign(this.watch, { now: null, queue: [], offset: 0, paused: false, share: null, resume: false });
    Object.assign(this.spots.tv, fresh(spotById('tv')));
  }

  // --- Draw & Guess (feature 11) ---

  private telStart(now: number) {
    const st = this.spots.art;
    this.tel = newTel(st.game.id as TelMode, [...st.players], now);
    this.telDraft = { text: '', strokes: [] };
    this.scriptTelTurn();
  }

  private telChanged() {
    if (this.tel) this.tel.rev++;
    this.changed();
  }

  /** What you have so far this turn: sent as it is when the time runs out. */
  setTelDraft(text: string, strokes: Stroke[]) {
    if (this.served('art')) this.activities!.telDraft(text, strokes);
    this.telDraft = { text, strokes };
  }

  /** Send your turn (Done, or the timer ran out). Empty counts towards being out. */
  telSend(id: string, entry: Omit<Entry, 'by'>) {
    if (this.served('art')) return void (id === 'me' && this.activities!.telSend(entry));
    const g = this.tel;
    if (!g || g.stage !== 'turn' || g.sent[id]) return;
    const c = chainOf(g, id);
    if (c < 0) return;
    const empty = entry.kind === 'text' ? !entry.text?.trim() : !entry.strokes?.length;
    g.chains[c]![g.step] = { ...entry, by: id, skipped: empty || undefined };
    g.sent[id] = true;
    g.empty[id] = empty ? (g.empty[id] ?? 0) + 1 : 0;
    this.telChanged();
  }

  private telTick(now: number, st: SpotState) {
    const g = this.tel;
    if (!g) return;
    if (g.stage === 'turn') {
      const active = g.order.filter((id) => st.players.includes(id));
      if (now < g.until && !active.every((id) => g.sent[id])) return;
      // Time's up: yours goes as it is; whoever's out is skipped
      if (!g.sent.me && active.includes('me')) {
        const kind = entryKind(stepKind(g.mode, g.step));
        this.telSend('me', kind === 'text' ? { kind, text: this.telDraft.text } : { kind, strokes: [...this.telDraft.strokes] });
      }
      for (const id of g.order) {
        if (!g.sent[id]) this.telSend(id, { kind: entryKind(stepKind(g.mode, g.step)) });
        if ((g.empty[id] ?? 0) >= 2 && st.players.includes(id)) this.knockOut(st, id, 'idle');
      }
      this.telDraft = { text: '', strokes: [] };
      if (g.step + 1 >= g.steps) {
        Object.assign(g, { stage: 'reveal', reveal: { chain: 0, shown: 1, paused: false, nextAt: now + revealGap(g.chains[0]![0]) } });
      } else {
        const kind = stepKind(g.mode, g.step + 1);
        Object.assign(g, { step: g.step + 1, sent: {}, until: now + TURN_MS[kind], lookUntil: kind === 'copy' ? now + LOOK_MS : 0 });
        this.scriptTelTurn();
      }
      this.telChanged();
      return;
    }
    if (g.stage === 'reveal') {
      const r = g.reveal;
      if (r.paused || now < r.nextAt) return;
      const chain = g.chains[r.chain]!;
      if (r.shown < chain.length) {
        r.shown++;
        r.nextAt = now + revealGap(chain[r.shown - 1]);
        this.scriptReact(r.chain, r.shown - 1);
      } else if (r.chain + 1 < g.chains.length) this.telNextChain(now);
      else {
        g.stage = 'done';
        this.tel = null;
        this.finish(
          'art',
          g.order.filter((id) => st.players.includes(id)),
        );
      }
      this.telChanged();
    }
  }

  /** Host: pause or carry on the album. */
  telPause(paused: boolean, now = Date.now()) {
    if (this.served('art')) return this.activities!.telPause(paused);
    const g = this.tel;
    if (!g || g.stage !== 'reveal') return;
    g.reveal.paused = paused;
    if (!paused) g.reveal.nextAt = now + 1200;
    this.telChanged();
  }

  /** Host: skip to the next chain (or end the album after the last one). */
  telNextChain(now = Date.now()) {
    if (this.served('art')) return this.activities!.telNext();
    const g = this.tel;
    if (!g || g.stage !== 'reveal') return;
    if (g.reveal.chain + 1 >= g.chains.length) {
      g.reveal.shown = g.chains[g.reveal.chain]!.length;
      g.reveal.nextAt = now;
    } else
      Object.assign(g.reveal, {
        chain: g.reveal.chain + 1,
        shown: 1,
        nextAt: now + CHAIN_GAP + revealGap(g.chains[g.reveal.chain + 1]![0]),
      });
    this.telChanged();
  }

  telReact(chain: number, entry: number, emoji: string) {
    if (this.served('art')) return this.activities!.telReact(chain, entry, emoji);
    const g = this.tel;
    if (!g) return;
    const key = `${chain}:${entry}`;
    const r = (g.reactions[key] ??= {});
    r[emoji] = (r[emoji] ?? 0) + 1;
    this.telChanged();
  }

  /** Demo: the scripted players take their turns at different moments. */
  private scriptTelTurn() {
    const g = this.tel;
    if (!g) return;
    const step = g.step;
    const kind = stepKind(g.mode, step);
    for (const id of g.order) {
      if (id === 'me') continue;
      this.later((0.25 + Math.random() * 0.45) * TURN_MS[kind], () => {
        if (this.tel !== g || g.step !== step || !this.spots.art.players.includes(id)) return;
        const src = sourceFor(g, id);
        if (kind === 'write') return this.telSend(id, { kind: 'text', text: randomPrompt() });
        if (kind === 'describe') {
          const d = DOODLES.find((x) => x.name === src?.doodle);
          const pool = d && Math.random() < 0.75 ? d.guesses : FUNNY_GUESSES;
          return this.telSend(id, { kind: 'text', text: pool[Math.floor(Math.random() * pool.length)] });
        }
        // Draw what the prompt says (or copy the last doodle), with a wobble
        const text = (src?.text ?? '').toLowerCase();
        const d =
          (kind === 'copy' && DOODLES.find((x) => x.name === src?.doodle)) ||
          DOODLES.find((x) => x.words.some((w) => text.includes(w))) ||
          DOODLES[Math.floor(Math.random() * DOODLES.length)]!;
        const strokes = wobble(d.strokes(), kind === 'copy' ? 0.02 : 0.008).map((s, i) => ({ ...s, id: `${id}-${step}-${i}`, by: id }));
        this.telSend(id, { kind: 'drawing', strokes, doodle: d.name });
      });
    }
  }

  /** Demo: someone laughs at a drawing now and then. */
  private scriptReact(chain: number, entry: number) {
    if (Math.random() < 0.55) this.later(600 + Math.random() * 1500, () => this.telReact(chain, entry, Math.random() < 0.7 ? '😂' : '😍'));
  }

  /** Demo: someone opens the art corner, calls everyone, two friends come, and it starts once you're in. */
  scriptTelephone() {
    const spot = spotById('art');
    if (this.spots.art.phase !== 'free') return;
    const [host, ...rest] = this.freePeople();
    if (!host) return;
    const go = (id: string, i: number) => {
      const p = this.room.state.players.get(id);
      if (p?.seatId) this.home.set(id, p.seatId);
      // An art table: take a free stool (sitting is joining); otherwise stand on the rug
      const seat = spot.seats?.find((s) => this.room.seatFree(s));
      this.room.sendTo(id, ringSpot(spot, i), seat);
    };
    go(host, 0);
    this.start('art', host);
    this.pickGame('art', this.scriptedTel++ % 2 ? 'copycat' : 'tel');
    this.call('art', host);
    rest.slice(0, 2).forEach((id, i) => this.later(2500 + i * 2000, () => go(id, i + 1)));
    const startedAt = Date.now();
    const wait = setInterval(() => {
      const st = this.spots.art;
      if (st.phase !== 'gathering' || st.hostId !== host) return clearInterval(wait);
      const ready = st.players.length >= st.game.min;
      if (ready && (st.players.includes('me') || Date.now() - startedAt > 30_000)) {
        clearInterval(wait);
        this.later(4000, () => this.spots.art.phase === 'gathering' && this.begin('art'));
      }
    }, 500);
    this.timers.push(wait as unknown as ReturnType<typeof setTimeout>);
  }

  // --- Chess (feature 12) ---

  private chessStart() {
    const [a, b] = this.spots.chess.players;
    if (!a || !b) return;
    this.chess = newChess(a, b, this.chess ?? undefined);
    this.scriptChessTurn();
  }

  chessMove(id: string, from: Square, to: Square, promotion?: PieceSymbol) {
    if (this.served('chess')) return (this.activities!.chessMove(from, to, promotion), true);
    const g = this.chess;
    if (!g || !play(g, id, from, to, promotion)) return false;
    this.chessAfter();
    return true;
  }

  chessResign(id: string) {
    if (this.served('chess')) return this.activities!.chessResign();
    if (!this.chess) return;
    resign(this.chess, id);
    this.chessAfter();
  }

  chessOfferDraw(id: string) {
    if (this.served('chess')) return this.activities!.chessOfferDraw();
    const g = this.chess;
    if (!g) return;
    offerDraw(g, id);
    this.changed();
    // Demo: a scripted opponent thinks it over, and takes it about half the time
    const other = id === g.white ? g.black : g.white;
    if (other !== 'me') this.later(2500, () => this.chess === g && this.chessAnswerDraw(other, Math.random() < 0.5));
  }

  chessAnswerDraw(id: string, accept: boolean) {
    if (this.served('chess')) return this.activities!.chessAnswerDraw(accept);
    if (!this.chess) return;
    answerDraw(this.chess, id, accept);
    this.chessAfter();
  }

  /** After any change: end the round if the game ended, otherwise let a scripted player move. */
  private chessAfter() {
    const g = this.chess;
    if (!g) return;
    if (g.end) {
      const loser = g.end.winner && (g.end.winner === g.white ? g.black : g.white);
      if (this.spots.chess.phase === 'playing') this.finish('chess', g.end.winner ? [g.end.winner, loser!] : [g.white, g.black]);
    } else this.scriptChessTurn();
    this.changed();
  }

  /** Demo: scripted players take a few seconds to move (a little longer as the game goes on). */
  private scriptChessTurn() {
    const g = this.chess;
    if (!g || g.end) return;
    const id = turnOf(g);
    if (id === 'me') return;
    const rev = g.rev;
    this.later(1500 + Math.random() * 3500, () => {
      if (this.chess !== g || g.rev !== rev || g.end || !this.spots.chess.players.includes(id)) return;
      const m = friendlyMove(g);
      if (m) this.chessMove(id, m.from, m.to, m.promotion);
    });
  }

  /** Demo: two friends sit down at the chess table and play; you can stand by the table and watch. */
  scriptChess() {
    this.scriptTableGame('chess', 2);
  }

  /** Demo: three friends sit down at the card table and play Slave; stand by the table to watch. */
  scriptSlave3() {
    this.scriptTableGame('cards', 3);
  }

  private scriptTableGame(spotId: 'chess' | 'cards', n: number) {
    const spot = spotById(spotId);
    if (!spot.built || this.spots[spotId].phase !== 'free') return;
    const people = this.freePeople().slice(0, n);
    if (people.length < n) return;
    const seats = spot.seats!.filter((s) => this.room.seatFree(s));
    people.forEach((id, i) => {
      const p = this.room.state.players.get(id);
      if (p?.seatId) this.home.set(id, p.seatId);
      this.later(i * 1500, () => this.room.sendTo(id, ringSpot(spot, i), seats[i]));
    });
    const wait = setInterval(() => {
      const st = this.spots[spotId];
      if (st.phase === 'gathering' && st.players.length >= n) {
        clearInterval(wait);
        this.later(2500, () => this.spots[spotId].phase === 'gathering' && this.begin(spotId));
      }
    }, 500);
    this.timers.push(wait as unknown as ReturnType<typeof setTimeout>);
  }

  // --- Slave (feature 12) ---

  private slaveStart(now: number) {
    // Seat order around the table, so turns go round it
    const seats = spotById('cards').seats ?? [];
    const seatOf = (id: string) => seats.indexOf(this.room.state.players.get(id)?.seatId ?? '');
    const players = [...this.spots.cards.players].sort((a, b) => seatOf(a) - seatOf(b));
    // The same group playing again keeps its titles (and swaps); anyone new and it starts fresh
    const last = this.slave?.stage === 'done' ? this.slave.titles : undefined;
    this.slave = slave.newSlave(players, now, last);
    this.slaveSeen = this.slave.rev;
    this.scriptSlave();
  }

  private slaveTick(now: number, st: SpotState) {
    const g = this.slave;
    if (!g) return;
    // Gone from the table (Leave, or away 30 s): out as last, the others play on
    for (const id of [...g.players]) if (!st.players.includes(id)) slave.drop(g, id, now);
    if (g.stage !== 'done' && now >= g.until) slave.timeout(g, now);
    this.slaveAfter();
  }

  slavePlay(id: string, cards: slave.Card[]) {
    if (this.served('cards')) return (this.activities!.slavePlay(cards), true);
    const g = this.slave;
    if (!g || !slave.play(g, id, cards, Date.now())) return false;
    this.slaveAfter();
    return true;
  }

  slavePass(id: string) {
    if (this.served('cards')) return this.activities!.slavePass();
    const g = this.slave;
    if (!g || !slave.pass(g, id, Date.now())) return;
    this.slaveAfter();
  }

  slaveGiveBack(id: string, cards: slave.Card[]) {
    if (this.served('cards')) return this.activities!.slaveGiveBack(cards);
    const g = this.slave;
    if (!g || !slave.giveBack(g, id, cards, Date.now())) return;
    this.slaveAfter();
  }

  private slaveSeen = -1;
  /** After any change: end the round when the game ends, otherwise let a scripted player act. */
  private slaveAfter() {
    const g = this.slave;
    if (!g) return;
    if (g.stage === 'done') {
      // finish() adds the ones who left (st.out) at the bottom itself
      const st = this.spots.cards;
      if (st.phase === 'playing')
        this.finish(
          'cards',
          g.finished.filter((id) => !st.out.includes(id)),
        );
    } else if (g.rev !== this.slaveSeen) {
      this.slaveSeen = g.rev;
      this.scriptSlave();
    }
    this.changed();
  }

  /** Demo: scripted players think for a moment, then play, pass, or send their swap cards back. */
  private scriptSlave() {
    const g = this.slave;
    if (!g || g.stage === 'done') return;
    const rev = g.rev;
    if (g.stage === 'swap') {
      for (const s of g.swap)
        if (s.giver !== 'me')
          this.later(2000 + Math.random() * 2000, () => this.slaveGiveBack(s.giver, g.hands[s.giver]!.slice(0, s.count)));
      return;
    }
    const id = g.turn;
    if (id === 'me') return;
    this.later(1200 + Math.random() * 2300, () => {
      if (this.slave !== g || g.rev !== rev || g.stage !== 'play' || g.turn !== id) return;
      const cards = slave.friendlyPlay(g, id);
      if (cards) this.slavePlay(id, cards);
      else if (g.pile) this.slavePass(id);
    });
  }

  // --- Whiteboard ---

  /** Demo: someone walks to the board and doodles a cat, a few points at a time. */
  scriptDraw() {
    const id = this.freePeople()[0];
    if (!id) return;
    const spot = spotById('board');
    this.room.sendTo(id, ringSpot(spot, 1));
    this.later(3000, () => {
      let t = 0;
      catDoodle().forEach((s, k) => {
        const sid = `${id}-${Date.now()}-${k}`;
        this.later((t += 500), () => this.board.start({ id: sid, by: id, color: s.color, size: s.size, pts: s.pts.slice(0, 2) }));
        for (let i = 2; i < s.pts.length; i += 6) {
          const chunk = s.pts.slice(i, i + 6);
          this.later((t += 45), () => this.board.add(sid, chunk));
        }
      });
    });
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

  /** Demo: someone walks to the big screen and shares their screen for a while. */
  scriptShare() {
    if (this.watch.share) return;
    const id = this.freePeople()[0];
    if (!id) return;
    const tv = spotById('tv');
    this.room.sendTo(id, ringSpot(tv, 1));
    // Share once they're on the rug (walking off it ends a share), then stop after a minute
    const share = (tries: number) => {
      if (!this.inArea(tv, id)) return void (tries && this.later(500, () => share(tries - 1)));
      this.startShare({ by: id, audio: true });
      this.later(60_000, () => this.stopShare(id));
    };
    share(30);
  }

  /** E at a standing spot: open a lobby there, with you as host. */
  start(spotId: SpotId, by: string, now = Date.now()) {
    // A table: sitting down starts it. A standing spot: the game server opens the lobby
    if (this.served(spotId)) return void (!spotById(spotId).seats && this.activities!.open(spotId));
    const spot = spotById(spotId);
    const st = this.spots[spotId];
    if (st.phase !== 'free' || (spot.roomWide && !this.roomWideGames)) return;
    const there = this.inArea(spot, by);
    Object.assign(st, fresh(spot), { phase: 'gathering', hostId: by, players: there ? [by] : [], arriving: !there, since: now });
    this.changed();
  }

  pickGame(spotId: SpotId, gameId: string) {
    if (this.served(spotId)) return this.activities!.pickGame(gameId);
    const st = this.spots[spotId];
    st.game = spotById(spotId).games.find((g) => g.id === gameId) ?? st.game;
    // Would you rather needs an opinion deck, the quizzes a quiz deck
    if (spotId === 'floor' && this.floorDeck.kind !== deckKindFor(gameId))
      this.floorDeck = BUILT_IN.find((d) => d.kind === deckKindFor(gameId))!;
    this.changed();
  }

  /** The host picks Pick a Side's deck (built in, their own, or AI-made: the host's client sends it). */
  pickDeck(deck: Deck) {
    if (this.served('floor')) return this.activities!.pickDeck(deck);
    this.floorDeck = deck;
    this.changed();
  }

  // --- Pick a Side (feature 11) ---

  private sideStart(now: number) {
    this.side = newGame(this.spots.floor.game.id as SideMode, this.floorDeck, now, this.spots.floor.players.length === 1);
    this.scriptAnswers();
  }

  /** Lock the answers when the timer ends, show the reveal, then the next question (or the results). */
  private sideTick(now: number, spot: Spot, st: SpotState) {
    const g = this.side;
    if (!g || g.stage === 'done' || now < g.until) return;
    if (g.stage === 'ask') {
      const q = g.questions[g.i]!;
      g.answers = {};
      for (const id of st.players) {
        const p = this.room.state.players.get(id);
        g.answers[id] = p && !st.awaySince[id] ? zoneAt(spot.area, sidesFor(g.mode), p.x, p.z) : null;
      }
      if (g.mode === 'wyr') {
        const mine = g.answers.me;
        if (mine != null) for (const id of st.players) if (id !== 'me' && g.answers[id] === mine) g.agree[id] = (g.agree[id] ?? 0) + 1;
      } else {
        const right = st.players.filter((id) => g.answers[id] === q.right);
        for (const id of right) g.scores[id] = (g.scores[id] ?? 0) + 1;
        // Alone, "everyone was wrong" would mean you could never go out
      }
      Object.assign(g, { stage: 'reveal', until: now + REVEAL_MS });
      return;
    }
    // Reveal over: the next question, unless that was the last one (or only one is left standing)
    if (g.i + 1 >= g.questions.length || st.players.length <= (g.solo ? 0 : 1)) {
      const score = (id: string) => g.scores[id] ?? 0;
      const standing = g.mode === 'quiz' ? [...st.players].sort((a, b) => score(b) - score(a)) : [...st.players];
      const top = standing[0] ? score(standing[0]) : 0;
      g.winners = g.mode === 'wyr' ? [] : g.mode === 'quiz' ? standing.filter((id) => score(id) === top) : standing;
      g.stage = 'done';
      this.finish('floor', standing);
      return;
    }
    Object.assign(g, { i: g.i + 1, stage: 'ask', until: now + ASK_MS[g.mode], answers: {} });
    this.scriptAnswers();
  }

  /** Demo: the others walk to a zone at different moments (quizzes: right about two times in three). */
  private scriptAnswers() {
    const g = this.side;
    if (!g) return;
    const spot = spotById('floor');
    const i = g.i;
    const q = g.questions[i]!;
    const sides = sidesFor(g.mode);
    for (const id of this.spots.floor.players) {
      if (id === 'me') continue;
      const pick = g.mode !== 'wyr' && Math.random() < 0.68 ? q.right! : Math.floor(Math.random() * sides);
      this.later(1200 + Math.random() * (ASK_MS[g.mode] - 4500), () => {
        if (this.side !== g || g.i !== i || g.stage !== 'ask' || !this.spots.floor.players.includes(id)) return;
        this.room.sendTo(id, zoneCenter(spot.area, sides, pick, 0.5));
      });
    }
  }

  /** The host's 📣: one invite card to everyone in the room. */
  call(spotId: SpotId, by: string, now = Date.now()) {
    if (this.served(spotId)) return this.activities!.call();
    this.spots[spotId].invite = { by, at: now };
    this.changed();
    if (by === 'me') this.scriptFriendsCome(spotId);
  }

  begin(spotId: SpotId, now = Date.now()) {
    if (this.served(spotId)) return this.activities!.begin();
    const st = this.spots[spotId];
    if (st.phase === 'results') Object.assign(st, { phase: 'gathering', results: [], out: [] });
    st.startsAt = now + COUNTDOWN_MS;
    this.changed();
  }

  /** The host ends the round early: back to the lobby, no winner. */
  end(spotId: SpotId, now = Date.now()) {
    if (this.served(spotId)) return this.activities!.end();
    const st = this.spots[spotId];
    if (spotId === 'floor') this.side = null;
    if (spotId === 'art') this.tel = null;
    if (spotId === 'chess') this.chess = null;
    if (spotId === 'cards') this.slave = null;
    Object.assign(st, { phase: 'gathering', out: [], nextRound: [], awaySince: {}, since: now });
    this.changed();
  }

  /** Leave: out at once (mid-round that's a loss). Seats stand you up; the room view walks you out of a ring. */
  leave(spotId: SpotId, id: string) {
    if (this.served(spotId)) return void (id === 'me' && this.activities!.leave());
    const spot = spotById(spotId);
    const st = this.spots[spotId];
    if (st.phase === 'playing' && st.players.includes(id) && spot.kind === 'rounds') this.knockOut(st, id, 'left');
    st.players = st.players.filter((x) => x !== id);
    st.nextRound = st.nextRound.filter((x) => x !== id);
    if (!st.optedOut.includes(id)) st.optedOut.push(id);
    if (spot.seats && this.room.state.players.get(id)?.seatId) {
      if (id === 'me') this.room.send('stand', {});
      // Scripted people wander off a little, out of the area
      else this.room.sendTo(id, areaEdgePoint(spot.area, Math.atan2(-2.6, -1.4), 1.0));
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

  private knockOut(st: SpotState, id: string, why: 'left' | 'away' | 'idle') {
    st.players = st.players.filter((x) => x !== id);
    if (!st.out.includes(id)) st.out.push(id);
    delete st.awaySince[id];
    if (id === 'me')
      this.onNews(
        why === 'away'
          ? 'You were away from the game for 30 s, so you’re out'
          : why === 'idle'
            ? 'You missed two turns, so you’re out. You can still watch the album'
            : 'You left the game',
      );
  }

  // --- Demo scripts: other people answering invites and starting games ---

  /** People not already busy with an activity, the ones not focusing first. */
  private freePeople() {
    const busy = new Set(SPOTS.flatMap((s) => [...this.spots[s.id].players, ...this.spots[s.id].nextRound]));
    return [...this.room.state.players.entries()]
      .filter(([id, p]) => id !== 'me' && !busy.has(id) && !this.room.traveling(id) && !isGameSeat(p.seatId))
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
    // A different mode each time the demo runs it, with a deck to match
    const mode = (['wyr', 'quiz'] as const)[this.scripted++ % 2]!;
    this.pickGame('floor', mode);
    const decks = BUILT_IN.filter((d) => d.kind === deckKindFor(mode));
    this.pickDeck(decks[Math.floor(Math.random() * decks.length)]!);
    this.call('floor', host);
    if (friend) this.later(2500, () => go(friend, 1));
    const startedAt = Date.now();
    const wait = setInterval(() => {
      const st = this.spots.floor;
      if (st.phase !== 'gathering' || st.hostId !== host) return clearInterval(wait);
      const ready = st.players.length >= st.game.min;
      if (ready && (st.players.includes('me') || Date.now() - startedAt > 30_000)) {
        clearInterval(wait);
        this.later(4000, () => this.spots.floor.phase === 'gathering' && this.begin('floor'));
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
  return areaInnerPoint(spot.area, a, 0.55);
}
