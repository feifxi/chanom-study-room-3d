import type { MapSchema } from '@colyseus/schema';
import { COUNTDOWN_MS, GRACE_MS, RESULTS_MS, type ActivityOut, type SpotId } from '@connecta/shared';
import { inArea, type Area, type MapData } from '@connecta/shared/maps';
import { answerDraw, forfeit, newChess, offerDraw, play, resign, type ChessGame } from '@connecta/shared/chess';
import type { PieceSymbol, Square } from 'chess.js';
import { Spot, type Chess, type Player } from './state.js';

/**
 * The activity framework (feature 9) on the game server: one flow for every game at a spot, the
 * same rules the demo's hub plays in the browser (`apps/web/src/features/activities/hub.ts`).
 *
 * - **Being in the area is being in:** the spot's seats for a table, otherwise its rug.
 * - **Rounds:** whoever arrives mid-round plays the next one.
 * - **Leaving:** Leave takes you out at once; 30 s out of the area (walked off, connection dropped)
 *   does too; leaving the room is leaving. Out mid-round is a loss; one player left wins.
 * - **Host:** whoever started it (the first to sit); when they go, the next in arrival order.
 * - **📣 Call everyone:** the host's one invite card to the whole room.
 *
 * Games plug in with {@link RoundGame}. Chess is the first; the other spots still run in each browser
 * until their games come over (step 5's party and table games).
 */

/** What the room lends the framework */
export interface ActivityHost {
  readonly map: MapData;
  readonly players: MapSchema<Player>;
  standUp(p: Player): void;
  send(sessionId: string, type: string, message: unknown): void;
}

/** A game at a spot: started with the round's players, told who's out, asked whether it's over. */
export interface RoundGame {
  readonly min: number;
  start(players: string[], now: number): void;
  /** Someone's out mid-round (left, or away too long) */
  out(id: string): void;
  /** The round is over: the places, winner first (everyone still in). Null while it's on. */
  standing(): string[] | null;
  /** End pressed, or the spot emptied: no result */
  stop(): void;
  /** The same person on a new connection (a reload): their place moves over */
  renamed(from: string, to: string): void;
}

interface SpotDef {
  id: SpotId;
  /** Being in: one of these seats, or (no seats) standing in the area */
  seats(map: MapData): string[] | null;
  area(map: MapData): Area | null;
}

/** Pressed Leave but still standing there: not counted until they step out */
interface Private {
  optedOut: Set<string>;
}

export class Activities {
  private defs = new Map<SpotId, { def: SpotDef; game: RoundGame; priv: Private }>();

  constructor(
    private readonly spots: MapSchema<Spot>,
    private readonly host: ActivityHost,
  ) {}

  /** A spot with its game; it shows in the state once the map has it */
  add(def: SpotDef, game: RoundGame) {
    this.defs.set(def.id, { def, game, priv: { optedOut: new Set() } });
    this.mapChanged();
  }

  /** A new map: every round ends; spots the map lacks disappear */
  mapChanged() {
    for (const [id, { def, game, priv }] of this.defs) {
      game.stop();
      priv.optedOut.clear();
      if (def.area(this.host.map)) this.spots.set(id, new Spot());
      else this.spots.delete(id);
    }
  }

  private here(def: SpotDef): string[] {
    const map = this.host.map;
    const seats = def.seats(map);
    const area = def.area(map);
    const ids: string[] = [];
    this.host.players.forEach((p, id) => {
      if (seats ? seats.includes(p.seatId) : area && inArea(area, p.x, p.z)) ids.push(id);
    });
    return ids;
  }

  tick(now: number) {
    for (const [id, { def, game, priv }] of this.defs) {
      const st = this.spots.get(id);
      if (!st) continue;
      const here = this.here(def);
      for (const x of priv.optedOut) if (!here.includes(x)) priv.optedOut.delete(x);
      const counted = here.filter((x) => !priv.optedOut.has(x));

      if (st.phase === 'free') {
        // Sitting at a free table starts a lobby, with the first to sit as host
        if (counted.length) this.reset(st, { phase: 'gathering', hostId: counted[0]!, players: counted });
      } else if (st.phase === 'gathering') {
        const players = [...[...st.players].filter((x) => counted.includes(x)), ...counted.filter((x) => !st.players.includes(x))];
        set(st.players, players);
        if (!players.includes(st.hostId)) st.hostId = players[0] ?? '';
        if (!players.length) this.reset(st);
        else if (st.startsAt && now >= st.startsAt) {
          if (players.length >= game.min) {
            Object.assign(st, { phase: 'playing', startsAt: 0, inviteBy: '', inviteAt: 0 });
            st.out.clear();
            st.awaySince.clear();
            game.start(players, now);
          } else st.startsAt = 0;
        }
      } else if (st.phase === 'playing') {
        for (const x of [...st.players]) {
          if (counted.includes(x)) st.awaySince.delete(x);
          else if (!st.awaySince.has(x)) st.awaySince.set(x, now);
          else if (now - st.awaySince.get(x)! > GRACE_MS) this.knockOut(id, st, x, 'away');
        }
        set(
          st.nextRound,
          counted.filter((x) => !st.players.includes(x) && !st.out.includes(x)),
        );
        if (!st.players.includes(st.hostId)) st.hostId = st.players[0] ?? '';
        const standing = game.standing();
        if (standing) this.finish(st, standing);
        else if (st.players.length <= 1) this.finish(st, [...st.players]);
      } else if (st.phase === 'results' && now >= st.resultsUntil) {
        if (!counted.length) {
          game.stop();
          this.reset(st);
        } else {
          const host = counted.includes(st.hostId) ? st.hostId : counted[0]!;
          this.reset(st, { phase: 'gathering', hostId: host, players: counted });
        }
      }
    }
  }

  /** Host: Start (a short countdown), or Play again from the results */
  begin(sessionId: string, now: number) {
    const st = this.hosting(sessionId);
    if (!st || !(st.phase === 'gathering' || st.phase === 'results')) return;
    const entry = this.entryOf(st);
    if (!entry || st.players.length < entry.game.min) return;
    if (st.phase === 'results') {
      Object.assign(st, { phase: 'gathering', resultsUntil: 0 });
      st.results.clear();
      st.out.clear();
    }
    st.startsAt = now + COUNTDOWN_MS;
  }

  /** Host: end the round early, back to the lobby with no winner */
  end(sessionId: string) {
    const st = this.hosting(sessionId);
    if (!st || st.phase !== 'playing') return;
    this.entryOf(st)?.game.stop();
    st.phase = 'gathering';
    st.out.clear();
    st.nextRound.clear();
    st.awaySince.clear();
  }

  /** Host: 📣 one invite card to the whole room */
  call(sessionId: string, now: number) {
    const st = this.hosting(sessionId);
    if (!st || st.phase !== 'gathering') return;
    Object.assign(st, { inviteBy: sessionId, inviteAt: now });
  }

  /** Leave: out at once (mid-round that's a loss); a seat stands you up */
  leave(sessionId: string) {
    for (const [id, { priv }] of this.defs) {
      const st = this.spots.get(id);
      if (!st || !this.involved(st, sessionId)) continue;
      if (st.phase === 'playing' && st.players.includes(sessionId)) this.knockOut(id, st, sessionId, 'left');
      remove(st.players, sessionId);
      remove(st.nextRound, sessionId);
      priv.optedOut.add(sessionId);
      const p = this.host.players.get(sessionId);
      if (p?.seatId) this.host.standUp(p);
    }
  }

  /** Gone from the room for good (not a dropped connection, which has the 30 s): out at once */
  gone(sessionId: string) {
    for (const [id, { priv }] of this.defs) {
      const st = this.spots.get(id);
      priv.optedOut.delete(sessionId);
      if (!st) continue;
      if (st.phase === 'playing' && st.players.includes(sessionId)) this.knockOut(id, st, sessionId, null);
      remove(st.players, sessionId);
      remove(st.nextRound, sessionId);
    }
  }

  /**
   * The same person walked back in on a new connection (a reload, another tab): they keep their
   * place, and like a dropped connection they have 30 s to get back to the seat or rug.
   */
  renamed(from: string, to: string, now: number) {
    const swap = (arr: { indexOf(v: string): number; splice(i: number, n: number, ...v: string[]): unknown }) => {
      const i = arr.indexOf(from);
      if (i >= 0) arr.splice(i, 1, to);
    };
    for (const [id, { game, priv }] of this.defs) {
      const st = this.spots.get(id);
      if (priv.optedOut.delete(from)) priv.optedOut.add(to);
      if (!st) continue;
      for (const arr of [st.players, st.nextRound, st.out, st.results]) swap(arr);
      if (st.hostId === from) st.hostId = to;
      if (st.inviteBy === from) st.inviteBy = to;
      if (st.awaySince.has(from) || (st.phase === 'playing' && st.players.includes(to))) {
        st.awaySince.set(to, st.awaySince.get(from) ?? now);
        st.awaySince.delete(from);
      }
      game.renamed(from, to);
    }
  }

  private involved(st: Spot, sessionId: string) {
    return st.phase !== 'free' && (st.players.includes(sessionId) || st.nextRound.includes(sessionId));
  }

  /** The spot this person hosts */
  private hosting(sessionId: string): Spot | undefined {
    for (const st of this.spots.values()) if (st.hostId === sessionId && st.phase !== 'free') return st;
    return undefined;
  }

  private entryOf(st: Spot) {
    for (const [id, entry] of this.defs) if (this.spots.get(id) === st) return entry;
    return undefined;
  }

  private knockOut(id: SpotId, st: Spot, sessionId: string, why: ActivityOut['why'] | null) {
    remove(st.players, sessionId);
    if (!st.out.includes(sessionId)) st.out.push(sessionId);
    st.awaySince.delete(sessionId);
    this.defs.get(id)?.game.out(sessionId);
    if (why) this.host.send(sessionId, 'activity:out', { spot: id, why } satisfies ActivityOut);
  }

  /** Results: the game's places, then those knocked out (the last one out placing highest) */
  private finish(st: Spot, standing: string[]) {
    const places = [...standing, ...[...st.out].reverse().filter((x) => !standing.includes(x))];
    set(st.results, places);
    Object.assign(st, { phase: 'results', resultsUntil: Date.now() + RESULTS_MS, startsAt: 0 });
    st.awaySince.clear();
  }

  private reset(st: Spot, to: { phase: string; hostId: string; players: string[] } = { phase: 'free', hostId: '', players: [] }) {
    Object.assign(st, { phase: to.phase, hostId: to.hostId, startsAt: 0, inviteBy: '', inviteAt: 0, resultsUntil: 0 });
    set(st.players, to.players);
    st.nextRound.clear();
    st.out.clear();
    st.results.clear();
    st.awaySince.clear();
  }
}

function set(arr: { clear(): void; push(...v: string[]): number }, values: string[]) {
  arr.clear();
  if (values.length) arr.push(...values);
}

function remove(arr: { indexOf(v: string): number; splice(i: number, n: number): unknown }, value: string) {
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1);
}

/** The chess table (feature 12): two players, the shared rules, every move checked here. */
export class ChessTable implements RoundGame {
  readonly min = 2;
  private game: ChessGame | null = null;
  /** The last game's colours, so a rematch between the same two swaps them */
  private last: { white: string; black: string } | undefined;

  constructor(private readonly state: Chess) {}

  static spot: SpotDef = {
    id: 'chess',
    seats: (map) => (map.chessTable ? map.seats.filter((s) => s.tableId === map.chessTable!.id).map((s) => s.id) : null),
    area: (map) => map.chessTable?.area ?? null,
  };

  start([a, b]: string[]) {
    if (!a || !b) return;
    this.game = newChess(a, b, this.last);
    this.last = { white: this.game.white, black: this.game.black };
    this.write();
  }

  out(id: string) {
    if (this.game) forfeit(this.game, id);
    this.write();
  }

  standing() {
    const end = this.game?.end;
    if (!this.game || !end) return null;
    const { white, black } = this.game;
    return end.winner ? [end.winner, end.winner === white ? black : white] : [white, black];
  }

  stop() {
    this.game = null;
    this.write();
  }

  renamed(from: string, to: string) {
    const g = this.game;
    const rename = (id: string) => (id === from ? to : id);
    if (g) {
      Object.assign(g, { white: rename(g.white), black: rename(g.black), drawOffer: g.drawOffer && rename(g.drawOffer) });
      if (g.end?.winner) g.end.winner = rename(g.end.winner);
    }
    if (this.last) this.last = { white: rename(this.last.white), black: rename(this.last.black) };
    this.write();
  }

  move(id: string, from: string, to: string, promotion?: string) {
    if (this.game && play(this.game, id, from as Square, to as Square, promotion as PieceSymbol | undefined)) this.write();
  }

  resign(id: string) {
    if (this.game) resign(this.game, id);
    this.write();
  }

  offerDraw(id: string) {
    if (this.game) offerDraw(this.game, id);
    this.write();
  }

  answerDraw(id: string, accept: boolean) {
    if (this.game) answerDraw(this.game, id, accept);
    this.write();
  }

  /** The rules' state into the room state (cleared when there's no game) */
  private write() {
    const g = this.game;
    const s = this.state;
    Object.assign(s, {
      white: g?.white ?? '',
      black: g?.black ?? '',
      fen: g?.fen ?? '',
      lastFrom: g?.last?.from ?? '',
      lastTo: g?.last?.to ?? '',
      drawOffer: g?.drawOffer ?? '',
      endWinner: g?.end?.winner ?? '',
      endWhy: g?.end?.why ?? '',
      rev: s.rev + 1,
    });
    set(s.moves, g?.moves ?? []);
    set(s.takenW, g?.taken.w ?? []);
    set(s.takenB, g?.taken.b ?? []);
  }
}
