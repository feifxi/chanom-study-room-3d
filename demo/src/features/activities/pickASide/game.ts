import { areaRadius, inArea, type Area } from '../../map/types';
import type { Deck, Question } from './decks';

/**
 * Pick a Side (feature 11): a question, a timer, and you answer by standing in a zone of the open
 * floor's ring. When the timer ends the answers lock; the reveal shows for a moment; next question.
 *
 * Modes (the spot's "games"):
 * - **Would you rather** (`wyr`): 2 zones, no right answer, the reveal shows the split.
 * - **Quiz** (`quiz`): 4 zones, +1 for the right one, highest score wins.
 * - **Last one standing** (`last`): 4 zones, wrong = out (unless everyone was wrong).
 */

export type SideMode = 'wyr' | 'quiz' | 'last';

export interface SideGame {
  mode: SideMode;
  deck: Deck;
  questions: Question[];
  i: number;
  stage: 'ask' | 'reveal' | 'done';
  until: number;
  /** The current question's locked answers (null = in no zone). Empty while asking. */
  answers: Record<string, number | null>;
  scores: Record<string, number>;
  /** Would you rather: how often each person stood on your side. */
  agree: Record<string, number>;
  /** Last one standing: everyone was wrong this time, so nobody went out. */
  everyoneWrong: boolean;
  /** Who won at the end (several when they tie, or when the deck ran out with people left). */
  winners: string[];
}

export const ASK_MS: Record<SideMode, number> = { wyr: 10_000, quiz: 15_000, last: 15_000 };
export const REVEAL_MS = 4_000;
export const QUESTIONS: Record<SideMode, number> = { wyr: 10, quiz: 10, last: 15 };
export const sidesFor = (mode: SideMode) => (mode === 'wyr' ? 2 : 4);

export const ZONE_COLORS = ['#ff8fb8', '#7ab8ff', '#ffd166', '#7fd8b6'];
export const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Zones are the rug's own halves or quarters, cut along its edges (a 2×2 square, never pizza slices).
 * The camera looks in from +x +z, so the square shows as a diamond: A at the top of the screen, B on
 * the right, C on the left, D at the bottom. That's the HUD's 2×2 grid turned 45°, so A–D sit the same
 * way round in both. With two zones, A is the half up and left, B down and right.
 */
export function zoneAt(area: Area, sides: number, x: number, z: number): number | null {
  if (!inArea(area, x, z)) return null;
  const col = x - area.x < 0 ? 0 : 1;
  if (sides === 2) return col;
  return (z - area.z < 0 ? 0 : 2) + col;
}

/** The middle of a zone, as an offset from the rug's centre (room x, z). */
export function zoneOffset(area: Area, sides: number, zone: number) {
  const k = areaRadius(area) * 0.5;
  const dx = (zone % 2 === 0 ? -1 : 1) * k;
  const dz = sides === 2 ? 0 : (zone < 2 ? -1 : 1) * k;
  return { dx, dz };
}

/** The middle of a zone in the room, give or take `jitter` (where a bot stands). */
export function zoneCenter(area: Area, sides: number, zone: number, jitter = 0) {
  const { dx, dz } = zoneOffset(area, sides, zone);
  return { x: area.x + dx + (Math.random() - 0.5) * jitter, z: area.z + dz + (Math.random() - 0.5) * jitter };
}

/**
 * The room remembers what it has played, so the next game draws questions it hasn't seen yet. Once a
 * deck runs out, it starts over. (The server keeps this per room; the demo keeps it for the visit.)
 */
const PLAYED = new Map<string, Set<string>>();

export function draw(deck: Deck, count: number): Question[] {
  const played = PLAYED.get(deck.id) ?? new Set<string>();
  const shuffle = (qs: Question[]) => [...qs].sort(() => Math.random() - 0.5);
  let fresh = shuffle(deck.questions.filter((q) => !played.has(q.id)));
  if (fresh.length < count) {
    // Not enough new ones: the unplayed first, then the rest again
    played.clear();
    fresh = [...fresh, ...shuffle(deck.questions.filter((q) => !fresh.includes(q)))];
  }
  const out = fresh.slice(0, count);
  out.forEach((q) => played.add(q.id));
  PLAYED.set(deck.id, played);
  return out;
}

export function newGame(mode: SideMode, deck: Deck, now: number): SideGame {
  return {
    mode,
    deck,
    questions: draw(deck, QUESTIONS[mode]),
    i: 0,
    stage: 'ask',
    until: now + ASK_MS[mode],
    answers: {},
    scores: {},
    agree: {},
    everyoneWrong: false,
    winners: [],
  };
}
