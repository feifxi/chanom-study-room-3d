import type { Stroke } from '../board/board';

/**
 * Draw & Guess at the art corner (feature 11). Everyone plays at once; each player starts a
 * chain, and every step each chain moves to the next player.
 *
 * - **Draw & Guess** (`tel`): write a prompt → draw the prompt you got → describe the drawing you
 *   got → draw that → … Watching "a cat in bubble tea" become "a sad potato" is the fun.
 * - **Copycat** (`copycat`): draw anything → the next person sees it for 8 s and redraws it from
 *   memory → … No writing at all.
 *
 * The time runs out = what you have so far is sent. Two empty turns in a row (or leaving) = out; your
 * later turns are skipped. Then the **reveal** plays every chain step by step, on its own; the host
 * can pause it or skip to the next chain. No scores: it's for laughs.
 */

export type TelMode = 'tel' | 'copycat';
export type StepKind = 'write' | 'draw' | 'describe' | 'copy';

export interface Entry {
  by: string;
  kind: 'text' | 'drawing';
  text?: string;
  strokes?: Stroke[];
  /** Out, or sent nothing. */
  skipped?: boolean;
  /** Demo: which doodle a scripted player drew, so the next one can guess it. */
  doodle?: string;
}

export interface TelGame {
  mode: TelMode;
  /** Players in seat order when it started; chain c starts with order[c]. */
  order: string[];
  steps: number;
  step: number;
  stage: 'turn' | 'reveal' | 'done';
  until: number;
  /** Copycat: the drawing to copy shows until then. */
  lookUntil: number;
  chains: Entry[][];
  sent: Record<string, boolean>;
  /** Empty turns in a row. */
  empty: Record<string, number>;
  reveal: { chain: number; shown: number; paused: boolean; nextAt: number };
  /** `${chain}:${entry}` → emoji → count. */
  reactions: Record<string, Record<string, number>>;
  /** Bumped on every change (the room re-renders on it, not on the strokes themselves). */
  rev: number;
}

export const TURN_MS: Record<StepKind, number> = { write: 30_000, draw: 60_000, describe: 30_000, copy: 53_000 };
export const LOOK_MS = 8_000;
export const MAX_STEPS = 8;
export const REACTIONS = ['😂', '😍', '😮', '👏'];
const GAP = { text: 2_500, drawing: 4_000, chain: 2_500 };

export function stepKind(mode: TelMode, step: number): StepKind {
  if (mode === 'copycat') return step === 0 ? 'draw' : 'copy';
  return step === 0 ? 'write' : step % 2 === 1 ? 'draw' : 'describe';
}

export const entryKind = (k: StepKind): Entry['kind'] => (k === 'write' || k === 'describe' ? 'text' : 'drawing');

/** Which chain a player works on at a step: chains pass along the order. */
export function chainOf(g: TelGame, id: string, step = g.step) {
  const n = g.order.length;
  const p = g.order.indexOf(id);
  return p < 0 ? -1 : (((p - step) % n) + n) % n;
}

/** What a player sees this step: the latest real entry in their chain (nothing on the first step). */
export function sourceFor(g: TelGame, id: string): Entry | undefined {
  const c = chainOf(g, id);
  if (c < 0) return undefined;
  return g.chains[c]!.slice(0, g.step).findLast((e) => !e.skipped);
}

export function newTel(mode: TelMode, order: string[], now: number): TelGame {
  return {
    mode,
    order,
    steps: Math.min(order.length, MAX_STEPS),
    step: 0,
    stage: 'turn',
    until: now + TURN_MS[stepKind(mode, 0)],
    lookUntil: 0,
    chains: order.map(() => []),
    sent: {},
    empty: {},
    reveal: { chain: 0, shown: 0, paused: false, nextAt: 0 },
    reactions: {},
    rev: 0,
  };
}

/** How long an entry stays before the next one appears in the reveal. */
export const revealGap = (e: Entry | undefined) => (e?.kind === 'drawing' && !e.skipped ? GAP.drawing : GAP.text);
export const CHAIN_GAP = GAP.chain;
