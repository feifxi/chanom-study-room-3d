import { cardSeats, type MapData } from '@connecta/shared/maps';
import type { SlaveHand } from '@connecta/shared';
import { drop, giveBack, newSlave, pass, play, timeout, type Card, type SlaveGame, type Title } from '@connecta/shared/slave';
import type { RoundGame } from './activity.js';
import { SlaveSwap, type Slave } from './state.js';

/**
 * Slave at the card table (docs/features/11-table-games.md): 3–6 players, the shared rules, every play checked here and
 * the turn timer run here. The room state carries only the public part; **each player's hand goes
 * to them alone** (`slave:hand`), so no one can read another's cards.
 */
export class SlaveTable implements RoundGame {
  readonly min = 3;
  private game: SlaveGame | null = null;
  /** The last game's titles, so the same group playing again starts with the swap */
  private titles: Record<string, Title> | undefined;

  constructor(
    private readonly state: Slave,
    private readonly room: {
      /** Where someone sits, so turns go round the table */
      seatIndex(sessionId: string): number;
      send(sessionId: string, type: string, message: unknown): void;
    },
  ) {}

  static spot = {
    id: 'cards' as const,
    // The first card table (the Café and Rooftop have a second; its stools are plain seats)
    seats: (map: MapData) => (map.cardTables[0] ? cardSeats(map.cardTables[0]).map((s) => s.id) : null),
    area: (map: MapData) => map.cardTables[0]?.area ?? null,
  };

  start(players: string[], now: number) {
    const order = [...players].sort((a, b) => this.room.seatIndex(a) - this.room.seatIndex(b));
    this.game = newSlave(order, now, this.titles);
    this.write();
  }

  /** The turn timer and the swap's 20 s */
  tick(now: number) {
    const g = this.game;
    if (!g || g.stage === 'done' || now < g.until) return;
    timeout(g, now);
    this.write();
  }

  out(id: string) {
    if (this.game) drop(this.game, id, Date.now());
    this.write();
  }

  standing() {
    const g = this.game;
    if (!g || g.stage !== 'done') return null;
    // The framework puts those who left at the bottom itself
    return g.finished.filter((id) => !g.gone.includes(id));
  }

  stop() {
    this.game = null;
    this.write();
  }

  renamed(from: string, to: string) {
    const rename = (id: string) => (id === from ? to : id);
    const g = this.game;
    if (g) {
      for (const k of ['players', 'passed', 'finished', 'gone'] as const) g[k] = g[k].map(rename);
      g.hands = rekey(g.hands, from, to);
      g.titles = rekey(g.titles, from, to);
      if (g.pile) g.pile.by = rename(g.pile.by);
      g.turn = rename(g.turn);
      for (const s of g.swap) Object.assign(s, { giver: rename(s.giver), to: rename(s.to) });
    }
    if (this.titles) this.titles = rekey(this.titles, from, to);
    this.write();
  }

  /** A connection (back) in: their hand again, since messages sent while away are lost */
  joined(sessionId: string) {
    if (this.game?.players.includes(sessionId)) this.sendHand(sessionId);
  }

  play(id: string, cards: Card[]) {
    if (this.game && play(this.game, id, cards, Date.now())) this.write();
  }

  pass(id: string) {
    if (this.game && pass(this.game, id, Date.now())) this.write();
  }

  giveBack(id: string, cards: Card[]) {
    if (this.game && giveBack(this.game, id, cards, Date.now())) this.write();
  }

  /** The public part into the room state, and each player's own hand to them */
  private write() {
    const g = this.game;
    const s = this.state;
    if (g?.stage === 'done') this.titles = { ...g.titles };
    if (!g) this.titles = undefined;
    Object.assign(s, {
      stage: g?.stage ?? '',
      pileBy: g?.pile?.by ?? '',
      turn: g?.turn ?? '',
      until: g?.until ?? 0,
      rev: s.rev + 1,
    });
    set(s.players, g?.players ?? []);
    set(s.pileCards, g?.pile?.cards ?? []);
    set(s.passed, g?.passed ?? []);
    set(s.finished, g?.finished ?? []);
    set(s.gone, g?.gone ?? []);
    s.counts.clear();
    for (const id of g?.players ?? []) s.counts.set(id, g!.hands[id]!.length);
    s.titles.clear();
    for (const [id, t] of Object.entries(g?.titles ?? {})) s.titles.set(id, t);
    s.swap.clear();
    for (const x of g?.swap ?? []) s.swap.push(new SlaveSwap({ giver: x.giver, to: x.to, count: x.count }));
    for (const id of g?.players ?? []) this.sendHand(id);
  }

  private sendHand(id: string) {
    const g = this.game!;
    const hand: SlaveHand = {
      cards: [...(g.hands[id] ?? [])],
      got: g.swap.find((x) => x.giver === id)?.got ?? [],
      rev: this.state.rev,
    };
    this.room.send(id, 'slave:hand', hand);
  }
}

function rekey<T>(obj: Record<string, T>, from: string, to: string): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k === from ? to : k, v]));
}

function set<T>(arr: { clear(): void; push(...v: T[]): number }, values: T[]) {
  arr.clear();
  if (values.length) arr.push(...values);
}
