/**
 * Pure game rules used by StudyRoom. Kept free of Colyseus so they're easy to unit test.
 */
import { BOUNDS, NAME_MAX, RUN_SPEED, SPEED_TOLERANCE, type PlayerStatus, type TimerPhase } from '@study/shared';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Smallest elapsed time we assume between moves, so a burst of packets can't stall movement. */
const MIN_STEP_SECONDS = 0.05;

/**
 * Server-authoritative speed limit: move from `from` toward `to`, but never further than
 * someone running could have in `elapsedSec`, and never outside the room.
 */
export function limitMove(from: { x: number; z: number }, to: { x: number; z: number }, elapsedSec: number) {
  const maxStep = RUN_SPEED * SPEED_TOLERANCE * Math.max(Math.min(elapsedSec, 1), MIN_STEP_SECONDS);
  let dx = to.x - from.x;
  let dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist > maxStep) {
    dx = (dx / dist) * maxStep;
    dz = (dz / dist) * maxStep;
  }
  return { x: clamp(from.x + dx, BOUNDS.minX, BOUNDS.maxX), z: clamp(from.z + dz, BOUNDS.minZ, BOUNDS.maxZ) };
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
