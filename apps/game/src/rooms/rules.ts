/**
 * Pure game rules used by StudyRoom. Kept free of Colyseus so they're easy to unit test.
 */
import { BOUNDS, NAME_MAX, RUN_SPEED, SPEED_TOLERANCE, type PlayerStatus, type TimerPhase } from '@study/shared';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Fastest anyone may move, metres per second (running, plus slack for timing noise). */
const MAX_SPEED = RUN_SPEED * SPEED_TOLERANCE;
/** How much unused movement can be saved up: one second's worth at full speed. */
export const MOVE_BUDGET_SECONDS = 1;
export const MOVE_BUDGET_MAX = MAX_SPEED * MOVE_BUDGET_SECONDS;

/**
 * Server-authoritative speed limit as a token bucket: movement allowance refills with real time
 * and each move spends it. On a bad connection moves arrive late and in bursts; a per-message cap
 * threw part of that burst away, so the server fell behind and the player got pulled back. With a
 * budget, a burst that fits in the time that passed is accepted whole, and the average speed is
 * still capped. Returns the new position and what's left of the budget.
 */
export function refillMoveBudget(budget: number, elapsedSec: number) {
  return Math.min(MOVE_BUDGET_MAX, budget + Math.max(0, elapsedSec) * MAX_SPEED);
}

export function spendMove(from: { x: number; z: number }, to: { x: number; z: number }, budget: number) {
  let dx = to.x - from.x;
  let dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  const step = Math.min(dist, budget);
  if (dist > step) {
    dx = (dx / dist) * step;
    dz = (dz / dist) * step;
  }
  return { x: clamp(from.x + dx, BOUNDS.minX, BOUNDS.maxX), z: clamp(from.z + dz, BOUNDS.minZ, BOUNDS.maxZ), budget: budget - step };
}

/** What others see above your head: away wins, then your pomodoro phase. */
export function deriveStatus(away: boolean, phase: TimerPhase, phaseEndsAt: number): { status: PlayerStatus; endsAt: number } {
  if (away) return { status: 'away', endsAt: 0 };
  if (phase !== 'idle') return { status: phase, endsAt: phaseEndsAt };
  return { status: 'idle', endsAt: 0 };
}

/** Display name from join options; blank or missing becomes "Guest". */
export function sanitizeName(name: unknown) {
  return (typeof name === 'string' ? name.trim().slice(0, NAME_MAX) : '') || 'Guest';
}

/** Anonymous client-generated id for grouping stats; falls back to the session id. */
export function sanitizeVisitorId(id: unknown, fallback: string) {
  return typeof id === 'string' && /^[\w-]{8,64}$/.test(id) ? id : fallback;
}

/** Public rooms are numbered "Library #1, #2, …"; a number is reused once its room closes. */
export class RoomNumbers {
  private used = new Set<number>();

  claim() {
    let n = 1;
    while (this.used.has(n)) n++;
    this.used.add(n);
    return n;
  }

  release(n: number | undefined) {
    if (n !== undefined) this.used.delete(n);
  }
}
