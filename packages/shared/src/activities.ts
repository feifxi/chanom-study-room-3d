/**
 * The activity framework (feature 9, docs/v2/features/09-activity-framework.md): one flow for every
 * game at a spot in the map.
 *
 *   Free ──sit / E──▶ Gathering ──host: Start──▶ Playing ──ends──▶ Results ──▶ Gathering (or Free)
 *
 * Being in the spot's area (or on its seats) is being in. The game server runs it; each game plugs in.
 */

export type SpotId = 'cards' | 'chess' | 'floor' | 'tv' | 'board' | 'art';
export type SpotPhase = 'free' | 'gathering' | 'playing' | 'results';

/** Out of the area this long mid-round (walked off, connection dropped) = out */
export const GRACE_MS = 30_000;
/** Start pressed: the round starts after this */
export const COUNTDOWN_MS = 3_000;
/** The results card, then back to the lobby */
export const RESULTS_MS = 8_000;
/** An invite card's life */
export const INVITE_MS = 20_000;
/** A starter walking over from afar (E from the Activities list) keeps the lobby this long */
export const ARRIVE_MS = 15_000;

/**
 * A spot as the room state shows it (`spots`, keyed by SpotId; only the spots the game server runs).
 * People are session ids, in the order they arrived.
 */
export interface SpotView {
  phase: SpotPhase;
  gameId: string;
  hostId: string;
  /** In this round (gathering: in the lobby) */
  players: Iterable<string>;
  /** Arrived mid-round: they play the next one */
  nextRound: Iterable<string>;
  /** Out this round, first out first */
  out: Iterable<string>;
  /** Left the area mid-round, and since when (server epoch ms; 30 s to come back) */
  awaySince: Map<string, number>;
  /** Start pressed: the round starts then (0 = not counting down) */
  startsAt: number;
  /** 📣 Call everyone: who and when (0 = no invite) */
  inviteBy: string;
  inviteAt: number;
  /** Results: places, winner first */
  results: Iterable<string>;
  resultsUntil: number;
}

/** Sent to someone the round let go (`activity:out`) */
export interface ActivityOut {
  spot: SpotId;
  why: 'left' | 'away';
}

/** Chess as the room state shows it (`chess`); the rules are `@connecta/shared/chess` */
export interface ChessView {
  white: string;
  black: string;
  moves: Iterable<string>;
  fen: string;
  lastFrom: string;
  lastTo: string;
  takenW: Iterable<string>;
  takenB: Iterable<string>;
  drawOffer: string;
  endWinner: string;
  /** '' while it's on */
  endWhy: string;
  rev: number;
}
