import { watchPosition } from '@connecta/shared';
import type { LiveRoom } from '../room3d/liveRoom';
import { BoardStore, type Stroke } from './board/board';
import type { Entry, TelGame } from './telephone/game';
import { BUILT_IN, type Deck } from './pickASide/decks';
import type { SideGame } from './pickASide/game';
import { SPOTS, spotById, type Game, type Spot, type SpotId } from './spots';
import type { PieceSymbol, Square } from 'chess.js';
import type * as slave from './slave/game';
import type { ChessGame } from './chess/game';
import { inArea } from '../map/types';

/**
 * The activity framework (feature 9) as this browser sees it. The game server runs every activity;
 * the hub mirrors its spots, games and big screen each tick and passes your actions on. Every
 * activity has the same life, whatever the game:
 *
 *   Free ──sit / E──▶ Gathering ──host: Start──▶ Playing ──ends──▶ Results ──▶ Gathering (or Free)
 *
 * - **Being in the area is being in.** Seats for seated spots, the ring for standing ones.
 * - **Rounds:** people who arrive mid-round play the next one. **Drop-in:** step in any time.
 * - **Leaving:** Leave takes you out at once; being out of the area for 30 s (walked off,
 *   disconnected) does too. Out mid-round = lost. One player left = they win.
 * - **Host:** whoever started it; when they leave, the next player.
 * - **Call everyone:** the host sends one invite card to the whole room (same card for every activity).
 *
 * The whiteboard is the one spot worked out here: whoever stands at it is drawing (its strokes go
 * through the game server; see LiveRoom.connectBoard).
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
  /** Start pressed: the round starts at this time (a short countdown). */
  startsAt: number;
  invite: { by: string; at: number } | null;
  /** Results: places, winner first. */
  results: string[];
  resultsUntil: number;
}

/** How long you can be away from a round before you're out (the server's rule, shown as a countdown) */
export const GRACE_MS = 30_000;
/** How long an invite card shows */
export const INVITE_MS = 20_000;

const fresh = (spot: Spot): SpotState => ({
  phase: 'free',
  game: spot.games[0]!,
  hostId: null,
  players: [],
  nextRound: [],
  out: [],
  awaySince: {},
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
  /** Which add this is (skip and remove name it) and who added it, even after they left */
  key?: string;
  byName?: string;
}

/**
 * The spots the game server runs (feature 9): the hub mirrors their rounds each tick and passes the
 * host's and players' actions on.
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

/** The game server's big screen (feature 10): the hub mirrors it each tick and passes every action on. */
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

export { watchPosition };

export class ActivityHub {
  readonly spots = Object.fromEntries(SPOTS.map((s) => [s.id, fresh(s)])) as Record<SpotId, SpotState>;
  readonly watch: WatchState = { now: null, queue: [], offset: 0, startedAt: 0, paused: false, share: null, resume: false };
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
  /** Slave at the card table, kept after it ends for the results. */
  slave: slave.SlaveGame | null = null;
  private listeners = new Set<() => void>();
  private snapshot = '';
  version = 0;
  private dismissed = new Set<string>();

  constructor(
    private readonly room: LiveRoom,
    private readonly screen: WatchRemote,
    private readonly server: ActivityRemote,
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

  /** Mirrors the server's spots, games and big screen; works out who's at the whiteboard. */
  tick() {
    const served = this.server.spots();
    this.chess = this.server.chess();
    this.slave = this.server.slave();
    this.side = this.server.side();
    this.floorDeck = this.server.floorDeck() ?? this.floorDeck;
    this.tel = this.server.tel();
    for (const spot of SPOTS) {
      if (!spot.inMap) continue;
      const st = this.spots[spot.id];
      const remote = served[spot.id];
      if (remote) {
        const { gameId, ...rest } = remote;
        Object.assign(st, rest, { game: spot.games.find((g) => g.id === gameId) ?? spot.games[0]! });
        continue;
      }
      const here = [...this.room.state.players.keys()].filter((id) => this.inArea(spot, id));
      if (spot.id === 'tv') {
        Object.assign(this.watch, this.screen.state(), { resume: false });
        const on = !!(this.watch.now || this.watch.share);
        if (on && st.phase !== 'playing') Object.assign(st, fresh(spot), { phase: 'playing' });
        if (!on && st.phase !== 'free') Object.assign(st, fresh(spot));
        st.players = on ? here : [];
      } else if (spot.id === 'board') st.players = here;
    }
    this.changed();
  }

  // --- Watch together (the server's big screen) ---

  /** Put a video on: plays now if the screen is off, otherwise joins the queue. */
  putOn(videoId: string) {
    this.screen.add(videoId);
  }

  setPaused(paused: boolean) {
    this.screen.pause(paused);
  }

  seek(seconds: number) {
    this.screen.seek(seconds);
  }

  /** A player says this video ended: the server moves on once (a late report is ignored) */
  ended(videoId: string) {
    if (this.watch.now?.id === videoId) this.next();
  }

  /** Skip: next in the queue, or the screen goes quiet. */
  next() {
    if (this.watch.now?.key) this.screen.next(this.watch.now.key);
  }

  removeQueued(index: number) {
    const key = this.watch.queue[index]?.key;
    if (key) this.screen.remove(key);
  }

  // --- Draw & Guess ---

  /** What you have so far this turn: sent as it is when the time runs out. */
  setTelDraft(text: string, strokes: Stroke[]) {
    this.server.telDraft(text, strokes);
    this.telDraft = { text, strokes };
  }

  /** Send your turn (Done). */
  telSend(entry: Omit<Entry, 'by'>) {
    this.server.telSend(entry);
  }

  /** Host: pause or carry on the album. */
  telPause(paused: boolean) {
    this.server.telPause(paused);
  }

  /** Host: skip to the next chain (or end the album after the last one). */
  telNextChain() {
    this.server.telNext();
  }

  telReact(chain: number, entry: number, emoji: string) {
    this.server.telReact(chain, entry, emoji);
  }

  // --- Chess and Slave ---

  chessMove(from: Square, to: Square, promotion?: PieceSymbol) {
    this.server.chessMove(from, to, promotion);
  }

  chessResign() {
    this.server.chessResign();
  }

  chessOfferDraw() {
    this.server.chessOfferDraw();
  }

  chessAnswerDraw(accept: boolean) {
    this.server.chessAnswerDraw(accept);
  }

  slavePlay(cards: slave.Card[]) {
    this.server.slavePlay(cards);
  }

  slavePass() {
    this.server.slavePass();
  }

  slaveGiveBack(cards: slave.Card[]) {
    this.server.slaveGiveBack(cards);
  }

  // --- Every activity ---

  /** E at a standing spot opens a lobby there (a table starts when you sit). */
  start(spotId: SpotId) {
    if (!spotById(spotId).seats) this.server.open(spotId);
  }

  pickGame(gameId: string) {
    this.server.pickGame(gameId);
  }

  /** The host picks Pick a Side's deck (built in, or the room's own). */
  pickDeck(deck: Deck) {
    this.server.pickDeck(deck);
  }

  /** The host's 📣: one invite card to everyone in the room. */
  call() {
    this.server.call();
  }

  begin() {
    this.server.begin();
  }

  /** The host ends the round early: back to the lobby, no winner. */
  end() {
    this.server.end();
  }

  /** Leave: out at once (mid-round that's a loss). The room view stands you up or walks you out. */
  leave() {
    this.server.leave();
  }
}
