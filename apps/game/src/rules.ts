/**
 * Pure movement rules, free of Colyseus so they're easy to test.
 */
import { RUN_SPEED, SPEED_TOLERANCE } from '@connecta/shared';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Fastest anyone may move, metres per second (running, plus slack for timing noise). */
const MAX_SPEED = RUN_SPEED * SPEED_TOLERANCE;
/** How much unused movement can be saved up: one second's worth at full speed. */
export const MOVE_BUDGET_MAX = MAX_SPEED;

/**
 * The speed limit is a token bucket: allowance refills with real time and each move spends it. On a
 * bad connection moves arrive late and in bursts; a per-message cap threw part of a burst away, so the
 * server fell behind and pulled the player back. With a budget, a burst that fits in the time that
 * passed is accepted whole, and the average speed is still capped.
 */
export function refillMoveBudget(budget: number, elapsedSec: number) {
  return Math.min(MOVE_BUDGET_MAX, budget + Math.max(0, elapsedSec) * MAX_SPEED);
}

/**
 * The whiteboard's rate limit, a token bucket like movement's: each message costs 1 plus a tenth of
 * its numbers, refilling 400 a second. A pen sends one small message per pointer move (at most ~240
 * a second on a fast screen), well inside it; a flood of full messages gets cut to a trickle.
 */
export const BOARD_BUDGET_MAX = 800;
const BOARD_REFILL_PER_SEC = 400;
export const boardCost = (numbers = 0) => 1 + numbers / 10;
/** Wiping the board for everyone costs more: a few a second at most */
export const BOARD_CLEAR_COST = 200;

/** Spends from the bucket if it holds enough (mutates it); false means drop the message */
export function spendBoard(bucket: { boardLeft: number; boardAt: number }, cost: number, now: number) {
  bucket.boardLeft = Math.min(BOARD_BUDGET_MAX, bucket.boardLeft + (Math.max(0, now - bucket.boardAt) / 1000) * BOARD_REFILL_PER_SEC);
  bucket.boardAt = now;
  if (bucket.boardLeft < cost) return false;
  bucket.boardLeft -= cost;
  return true;
}

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export function spendMove(from: { x: number; z: number }, to: { x: number; z: number }, budget: number, bounds: Bounds) {
  let dx = to.x - from.x;
  let dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  const step = Math.min(dist, budget);
  if (dist > step) {
    dx = (dx / dist) * step;
    dz = (dz / dist) * step;
  }
  return {
    x: clamp(from.x + dx, bounds.minX, bounds.maxX),
    z: clamp(from.z + dz, bounds.minZ, bounds.maxZ),
    budget: budget - step,
  };
}
