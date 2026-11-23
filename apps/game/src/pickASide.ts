import type { MapData } from '@connecta/shared/maps';
import {
  ASK_MS,
  BUILT_IN,
  DECK_QUESTIONS_MAX,
  DECK_QUESTIONS_MIN,
  REVEAL_MS,
  deckKindFor,
  newGame,
  questionFits,
  sidesFor,
  zoneAt,
  type Deck,
  type SideGame,
  type SideMode,
} from '@connecta/shared/pick-a-side';
import type { RoundGame, SpotDef } from './activity.js';
import type { Side } from './state.js';

/** How long a question and its reveal last (tests shorten them) */
export const sideTiming = { ask: ASK_MS as Record<SideMode, number>, reveal: REVEAL_MS };

/**
 * Pick a Side on the open floor (feature 11), run here: the host's deck, the questions drawn from
 * what this room hasn't played yet, the timers, and the answers read from where people stand when
 * the timer ends. The room state shows only the question being asked, and a quiz's right answer
 * only at its reveal.
 */
export class SideFloor implements RoundGame {
  readonly min = 1;
  readonly playsOut = true;
  private game: SideGame | null = null;
  private players: string[] = [];
  private deck: Deck = BUILT_IN[0]!;
  /** What this room has played, per deck (resets when the room empties, with everything else) */
  private played = new Map<string, Set<string>>();
  private picks = new Map<string, (number | null)[]>();

  constructor(
    private readonly state: Side,
    private readonly room: {
      readonly map: MapData;
      /** Where someone stands (null: gone) */
      at(sessionId: string): { x: number; z: number } | null;
      /** Players the framework counts as away right now (their answer doesn't lock) */
      away(sessionId: string): boolean;
      /** Who's in the round now (players join between questions) */
      roundPlayers(): string[];
    },
  ) {
    this.write();
  }

  static spot: SpotDef = {
    id: 'floor',
    seats: () => null,
    area: (map) => map.floorArea,
    games: ['wyr', 'quiz'],
    roomWide: true,
  };

  /** The host's deck: built in by id, or a room deck (already checked against its pass) */
  pickDeck(deck: Deck) {
    this.deck = deck;
    this.write();
  }

  pickBuiltIn(id: string) {
    const deck = BUILT_IN.find((d) => d.id === id);
    if (deck) this.pickDeck(deck);
  }

  /** A room deck from a pass: it must still fit the rules (the pass is signed, but check anyway) */
  pickRoomDeck(deck: Deck) {
    const ok =
      deck.questions.length >= DECK_QUESTIONS_MIN &&
      deck.questions.length <= DECK_QUESTIONS_MAX &&
      deck.questions.every((q) => questionFits(deck.kind, q));
    if (ok) this.pickDeck({ ...deck, source: 'room' });
  }

  /** The host switched modes: a deck of the other kind gives way to the first built-in one that fits */
  modeChanged(gameId: string) {
    const kind = deckKindFor(gameId);
    if (this.deck.kind !== kind) this.pickDeck(BUILT_IN.find((d) => d.kind === kind)!);
  }

  start(players: string[], now: number, gameId: string) {
    const mode = (gameId === 'quiz' ? 'quiz' : 'wyr') as SideMode;
    if (this.deck.kind !== deckKindFor(mode)) this.modeChanged(mode);
    const played = this.played.get(this.deck.id) ?? new Set<string>();
    this.played.set(this.deck.id, played);
    this.game = newGame(mode, this.deck, now, players.length === 1, played);
    this.game.until = now + sideTiming.ask[mode];
    this.players = players;
    this.picks.clear();
    this.write();
  }

  tick(now: number) {
    const g = this.game;
    if (!g || g.stage === 'done' || now < g.until) return;
    const players = this.room.roundPlayers();
    if (g.stage === 'ask') {
      // Time's up: answers lock where people stand
      const q = g.questions[g.i]!;
      g.answers = {};
      for (const id of players) {
        const p = this.room.at(id);
        g.answers[id] = p && !this.room.away(id) ? zoneAt(this.room.map.floorArea, sidesFor(g.mode), p.x, p.z) : null;
        const mine = this.picks.get(id) ?? Array<number | null>(g.i).fill(null);
        mine[g.i] = g.answers[id]!;
        this.picks.set(id, mine);
      }
      if (g.mode === 'quiz') for (const id of players) if (g.answers[id] === q.right) g.scores[id] = (g.scores[id] ?? 0) + 1;
      Object.assign(g, { stage: 'reveal', until: now + sideTiming.reveal });
    } else if (g.i + 1 >= g.questions.length || players.length <= (g.solo ? 0 : 1)) {
      // The last reveal (or only one left): the places
      const score = (id: string) => g.scores[id] ?? 0;
      const standing = g.mode === 'quiz' ? [...players].sort((a, b) => score(b) - score(a)) : [...players];
      const top = standing[0] ? score(standing[0]) : 0;
      g.winners = g.mode === 'quiz' ? standing.filter((id) => score(id) === top) : [];
      g.stage = 'done';
      this.players = standing;
    } else Object.assign(g, { i: g.i + 1, stage: 'ask', until: now + sideTiming.ask[g.mode], answers: {} });
    this.write();
  }

  out() {
    // Nothing to do: the framework drops them from the round, and they place below the rest
  }

  standing() {
    return this.game?.stage === 'done' ? [...this.players] : null;
  }

  stop() {
    this.game = null;
    this.write();
  }

  renamed(from: string, to: string) {
    const g = this.game;
    const rekey = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k === from ? to : k, v]));
    if (g) Object.assign(g, { answers: rekey(g.answers), scores: rekey(g.scores), winners: g.winners.map((x) => (x === from ? to : x)) });
    this.players = this.players.map((x) => (x === from ? to : x));
    const mine = this.picks.get(from);
    if (mine) {
      this.picks.delete(from);
      this.picks.set(to, mine);
    }
    this.write();
  }

  private write() {
    const g = this.game;
    const s = this.state;
    const q = g?.questions[g.i];
    Object.assign(s, {
      deckId: this.deck.id,
      deckName: this.deck.name,
      deckEmoji: this.deck.emoji,
      deckCount: this.deck.questions.length,
      stage: g?.stage ?? '',
      mode: g?.mode ?? '',
      i: g?.i ?? 0,
      count: g?.questions.length ?? 0,
      until: g?.until ?? 0,
      q: q?.q ?? '',
      right: g && g.stage !== 'ask' && g.mode === 'quiz' ? (q?.right ?? -1) : -1,
      solo: g?.solo ?? false,
      rev: s.rev + 1,
    });
    s.choices.clear();
    if (q) s.choices.push(...q.answers);
    s.answers.clear();
    if (g?.stage !== 'ask') for (const [id, a] of Object.entries(g?.answers ?? {})) s.answers.set(id, a ?? -1);
    s.scores.clear();
    for (const [id, n] of Object.entries(g?.scores ?? {})) s.scores.set(id, n);
    s.picks.clear();
    if (g) for (const [id, mine] of this.picks) s.picks.set(id, mine.map((a) => (a == null ? '-' : String(a))).join(','));
    s.winners.clear();
    if (g?.winners.length) s.winners.push(...g.winners);
  }
}
