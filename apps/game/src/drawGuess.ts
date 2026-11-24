import { artSeats, type MapData } from '@connecta/shared/maps';
import { boardPen, type TelTurn } from '@connecta/shared';
import {
  CHAIN_GAP,
  LOOK_MS,
  REACTIONS,
  TEL_POINTS_MAX,
  TEL_TEXT_MAX,
  TURN_MS,
  chainOf,
  entryKind,
  newTel,
  revealGap,
  sourceFor,
  stepKind,
  type Entry,
  type StepKind,
  type TelGame,
  type TelMode,
  type TelStroke,
} from '@connecta/shared/draw-guess';
import type { RoundGame, SpotDef } from './activity.js';
import type { Tel } from './state.js';

/** How long the server waits for pages to hand in what they have when a turn's time runs out */
export const COLLECT_MS = 2_000;
/** Turn and look times (tests shorten them) */
export const telTiming = { turn: { ...TURN_MS } as Record<StepKind, number>, look: LOOK_MS, collect: COLLECT_MS, gapScale: 1 };

/**
 * Draw & Guess at the art corner (docs/features/10-party-games.md), run here: the order, the steps and their timers, who
 * sent, the chains and the album. **Entries never go into the room state**: each player gets only
 * what they work from (`tel:turn`), and the whole chains go out when the album starts (`tel:album`),
 * so nobody can peek.
 *
 * When a turn's time runs out the server asks every page for what it has (`tel:collect`) and waits a
 * moment, so a half drawing still makes it whatever the browser's clock says.
 */
export class DrawGuess implements RoundGame {
  readonly min = 3;
  readonly playsOut = true;
  private game: TelGame | null = null;
  private collectUntil = 0;
  private reacted = new Set<string>();
  private idle: string[] = [];
  private final: string[] = [];
  /** Each drawer's strokes this step, as they arrive in pieces (`tel:part`) */
  private drafts = new Map<string, { step: number; strokes: TelStroke[]; points: number }>();

  constructor(
    private readonly state: Tel,
    private readonly room: {
      seatIndex(sessionId: string): number;
      /** Who's in the round now */
      roundPlayers(): string[];
      send(sessionId: string, type: string, message: unknown): void;
      broadcast(type: string, message: unknown): void;
    },
  ) {}

  static spot: SpotDef = {
    id: 'art',
    // A map with an art table seats it (sit to join); otherwise you stand at the easels and press E
    seats: (map: MapData) => (map.artTable ? artSeats(map.artTable).map((s) => s.id) : null),
    area: (map: MapData) => map.artArea,
    games: ['tel', 'copycat'],
  };

  start(players: string[], now: number, gameId: string) {
    const order = [...players].sort((a, b) => this.room.seatIndex(a) - this.room.seatIndex(b));
    this.game = newTel((gameId === 'copycat' ? 'copycat' : 'tel') as TelMode, order, now);
    this.game.until = now + telTiming.turn[stepKind(this.game.mode, 0)];
    this.reacted.clear();
    this.idle = [];
    this.final = [];
    this.collectUntil = 0;
    this.drafts.clear();
    this.write();
    this.sendTurns();
  }

  tick(now: number) {
    const g = this.game;
    if (!g) return;
    if (g.stage === 'turn') {
      const active = g.order.filter((id) => this.room.roundPlayers().includes(id));
      const everyone = active.every((id) => g.sent[id]);
      if (!everyone && now < g.until) return;
      // Time's up: ask the pages still drawing for what they have, and give them a moment
      if (!everyone && !this.collectUntil) {
        this.collectUntil = now + telTiming.collect;
        for (const id of active) if (!g.sent[id]) this.room.send(id, 'tel:collect', { step: g.step });
        return;
      }
      if (!everyone && now < this.collectUntil) return;
      this.collectUntil = 0;
      const kind = entryKind(stepKind(g.mode, g.step));
      for (const id of g.order) {
        if (!g.sent[id]) this.put(id, { kind });
        if ((g.empty[id] ?? 0) >= 2 && active.includes(id)) this.idle.push(id);
      }
      if (g.step + 1 >= g.steps) {
        Object.assign(g, { stage: 'reveal', reveal: { chain: 0, shown: 1, paused: false, nextAt: now + this.gap(g.chains[0]![0]) } });
        this.room.broadcast('tel:album', this.album());
      } else {
        const next = stepKind(g.mode, g.step + 1);
        Object.assign(g, {
          step: g.step + 1,
          sent: {},
          until: now + telTiming.turn[next],
          lookUntil: next === 'copy' ? now + telTiming.look : 0,
        });
        this.drafts.clear();
        this.sendTurns();
      }
      this.write();
      return;
    }
    if (g.stage === 'reveal') {
      const r = g.reveal;
      if (r.paused || now < r.nextAt) return;
      const chain = g.chains[r.chain]!;
      if (r.shown < chain.length) {
        r.shown++;
        r.nextAt = now + this.gap(chain[r.shown - 1]);
      } else if (r.chain + 1 < g.chains.length) this.nextChain(now);
      else this.finishAlbum();
      this.write();
    }
  }

  private canSend(id: string, step: number) {
    const g = this.game;
    return !!g && g.stage === 'turn' && g.step === step && !g.sent[id] && this.room.roundPlayers().includes(id);
  }

  /**
   * A piece of your drawing (a WebSocket message stays under 4 KB, like the whiteboard's): stroke `s`
   * is the next one, or more points for the last one. Past the cap the rest is dropped.
   */
  part(id: string, step: number, s: number, color: string, size: number, pts: number[]) {
    const g = this.game;
    if (!g || !this.canSend(id, step) || entryKind(stepKind(g.mode, step)) !== 'drawing') return;
    if (!boardPen(color, size) || pts.length % 2 !== 0 || !pts.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) return;
    let d = this.drafts.get(id);
    if (!d || d.step !== step) this.drafts.set(id, (d = { step, strokes: [], points: 0 }));
    if (d.points + pts.length / 2 > TEL_POINTS_MAX) return;
    if (s === d.strokes.length) d.strokes.push({ color, size, pts: [] });
    else if (s !== d.strokes.length - 1) return;
    d.strokes[s]!.pts.push(...pts);
    d.points += pts.length / 2;
  }

  /** Your turn is done: the text, or the drawing sent in pieces before it. Once a step */
  send(id: string, step: number, text?: string) {
    const g = this.game;
    if (!g || !this.canSend(id, step)) return;
    const kind = entryKind(stepKind(g.mode, g.step));
    if (kind === 'text') this.put(id, { kind, text: (text ?? '').trim().slice(0, TEL_TEXT_MAX) });
    else {
      const d = this.drafts.get(id);
      this.put(id, { kind, strokes: d?.step === step ? d.strokes.filter((s) => s.pts.length) : [] });
      this.drafts.delete(id);
    }
    this.write();
  }

  react(id: string, chain: number, entry: number, emoji: string) {
    const g = this.game;
    if (!g || g.stage !== 'reveal' || !REACTIONS.includes(emoji)) return;
    if (chain > g.reveal.chain || (chain === g.reveal.chain && entry >= g.reveal.shown) || !g.chains[chain]?.[entry]) return;
    const key = `${chain}:${entry}:${emoji}`;
    // One of each per person per entry
    if (this.reacted.has(`${id}|${key}`)) return;
    this.reacted.add(`${id}|${key}`);
    const r = (g.reactions[`${chain}:${entry}`] ??= {});
    r[emoji] = (r[emoji] ?? 0) + 1;
    this.write();
  }

  /** Host: pause or carry on the album */
  pause(paused: boolean, now: number) {
    const g = this.game;
    if (!g || g.stage !== 'reveal') return;
    g.reveal.paused = paused;
    if (!paused) g.reveal.nextAt = now + 1200 * telTiming.gapScale;
    this.write();
  }

  /** Host: the next chain; on the last one it's Finish, which ends the album (even paused) */
  next(now: number) {
    const g = this.game;
    if (!g || g.stage !== 'reveal') return;
    if (g.reveal.chain + 1 >= g.chains.length) this.finishAlbum();
    else this.nextChain(now);
    this.write();
  }

  private finishAlbum() {
    this.game!.stage = 'done';
    this.final = this.game!.order.filter((id) => this.room.roundPlayers().includes(id));
  }

  /** A page (back) in: what you're working from, or the album */
  joined(sessionId: string) {
    const g = this.game;
    if (!g) return;
    if (g.stage === 'turn' && g.order.includes(sessionId)) this.room.send(sessionId, 'tel:turn', this.turnFor(sessionId));
    if (g.stage === 'reveal') this.room.send(sessionId, 'tel:album', this.album());
  }

  out() {
    // Their later turns are skipped when the time runs out; the chains carry on
  }

  dropouts() {
    const out = this.idle;
    this.idle = [];
    return out;
  }

  standing() {
    return this.game?.stage === 'done' ? [...this.final] : null;
  }

  stop() {
    this.game = null;
    this.collectUntil = 0;
    this.drafts.clear();
    this.write();
  }

  renamed(from: string, to: string) {
    const g = this.game;
    if (!g) return;
    const re = (x: string) => (x === from ? to : x);
    g.order = g.order.map(re);
    for (const chain of g.chains) for (const e of chain) if (e) e.by = re(e.by);
    for (const k of ['sent', 'empty'] as const) {
      const v = g[k] as Record<string, unknown>;
      if (from in v) {
        v[to] = v[from];
        delete v[from];
      }
    }
    this.final = this.final.map(re);
    const d = this.drafts.get(from);
    this.drafts.delete(from);
    if (d) this.drafts.set(to, d);
    this.write();
  }

  private put(id: string, entry: Omit<Entry, 'by'>) {
    const g = this.game!;
    const c = chainOf(g, id);
    if (c < 0) return;
    const empty = entry.kind === 'text' ? !entry.text?.trim() : !entry.strokes?.length;
    g.chains[c]![g.step] = { ...entry, by: id, ...(empty ? { skipped: true } : {}) };
    g.sent[id] = true;
    g.empty[id] = empty ? (g.empty[id] ?? 0) + 1 : 0;
  }

  private nextChain(now: number) {
    const g = this.game!;
    const r = g.reveal;
    Object.assign(r, {
      chain: r.chain + 1,
      shown: 1,
      nextAt: now + (CHAIN_GAP + revealGap(g.chains[r.chain + 1]![0])) * telTiming.gapScale,
    });
  }

  private gap(e: Entry | undefined) {
    return revealGap(e) * telTiming.gapScale;
  }

  private turnFor(id: string): TelTurn {
    const g = this.game!;
    const src = sourceFor(g, id);
    return { step: g.step, source: src ? { by: src.by, kind: src.kind, text: src.text, strokes: src.strokes } : null };
  }

  private sendTurns() {
    const g = this.game!;
    for (const id of g.order) this.room.send(id, 'tel:turn', this.turnFor(id));
  }

  private album() {
    return {
      chains: this.game!.chains.map((chain) => chain.map(({ by, kind, text, strokes, skipped }) => ({ by, kind, text, strokes, skipped }))),
    };
  }

  private write() {
    const g = this.game;
    const s = this.state;
    Object.assign(s, {
      stage: g?.stage ?? '',
      mode: g?.mode ?? '',
      steps: g?.steps ?? 0,
      step: g?.step ?? 0,
      until: g?.until ?? 0,
      lookUntil: g?.lookUntil ?? 0,
      revealChain: g?.reveal.chain ?? 0,
      revealShown: g?.reveal.shown ?? 0,
      revealPaused: g?.reveal.paused ?? false,
      rev: s.rev + 1,
    });
    s.order.clear();
    if (g) s.order.push(...g.order);
    s.sent.clear();
    for (const id of Object.keys(g?.sent ?? {})) s.sent.push(id);
    s.reactions.clear();
    for (const [key, counts] of Object.entries(g?.reactions ?? {}))
      for (const [emoji, n] of Object.entries(counts)) s.reactions.set(`${key}:${emoji}`, n);
  }
}
