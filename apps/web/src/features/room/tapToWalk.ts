import { GACHA_MACHINE, NPC_REACH, SEATS, SEAT_BY_ID, SIT_REACH, findPath, type Point } from '@study/shared';
import type { StudyRoom } from './roomSession';

/**
 * Tap-to-walk (touch, and mouse clicks too): tap the floor to walk there, or tap a chair, a cat or
 * the Buddy Machine to walk over and use it. The route comes from the same A* grid the NPCs use.
 * Pure functions here; LocalPlayerDriver follows the route.
 */
export type TapGoal = { kind: 'walk' } | { kind: 'seat'; seatId: string } | { kind: 'pet'; npcId: string } | { kind: 'machine' };

export interface TapTarget extends Point {
  goal: TapGoal;
}

/** How close a tap must land to count as tapping that thing (metres on the floor). */
const TAP_CAT = 0.7;
const TAP_MACHINE = 0.9;
const TAP_SEAT = 0.7;

/** What a tap at `p` (where the tap ray hit the scene) means. */
export function pickTapTarget(room: StudyRoom, p: Point): TapTarget {
  const me = room.state.players?.get(room.sessionId);
  let best: TapTarget = { x: p.x, z: p.z, goal: { kind: 'walk' } };
  let bestD = Infinity;
  const consider = (target: TapTarget, d: number, within: number) => {
    if (d < within && d < bestD) {
      bestD = d;
      best = target;
    }
  };

  for (const [id, n] of room.state.npcs ?? []) {
    if (n.kind === 'cat') consider({ x: n.x, z: n.z, goal: { kind: 'pet', npcId: id } }, Math.hypot(n.x - p.x, n.z - p.z), TAP_CAT);
  }
  consider(
    { x: GACHA_MACHINE.x, z: GACHA_MACHINE.z, goal: { kind: 'machine' } },
    Math.hypot(GACHA_MACHINE.x - p.x, GACHA_MACHINE.z - p.z),
    TAP_MACHINE,
  );
  // A cat or the machine wins over a chair beside it; chairs only count when nothing else was tapped
  if (bestD < Infinity) return best;

  const taken = new Set<string>();
  for (const [, o] of room.state.players ?? []) if (o.seatId) taken.add(o.seatId);
  for (const s of SEATS) {
    if (s.id === me?.seatId || taken.has(s.id)) continue;
    consider({ x: s.x, z: s.z, goal: { kind: 'seat', seatId: s.id } }, Math.hypot(s.x - p.x, s.z - p.z), TAP_SEAT);
  }
  return best;
}

/** Waypoints from `from` to the target (the nearest walkable spot when it's inside furniture). */
export function planRoute(from: Point, target: Point): Point[] {
  return findPath(from, target);
}

/**
 * The goal is in reach from `at`. While walking we stop a little inside the reach (`slack` 0.8);
 * when a route ends early (someone in the way) anything the server would still accept counts.
 * Free walks end at the last waypoint instead.
 */
export function goalReached(room: StudyRoom, goal: TapGoal, at: Point, slack = 0.8): boolean {
  switch (goal.kind) {
    case 'walk':
      return false;
    case 'seat': {
      const s = SEAT_BY_ID.get(goal.seatId);
      return !!s && Math.hypot(s.x - at.x, s.z - at.z) < SIT_REACH * slack;
    }
    case 'pet': {
      const n = room.state.npcs?.get(goal.npcId);
      return !!n && Math.hypot(n.x - at.x, n.z - at.z) < NPC_REACH * slack;
    }
    case 'machine':
      return Math.hypot(GACHA_MACHINE.x - at.x, GACHA_MACHINE.z - at.z) < GACHA_MACHINE.reach * Math.min(0.9, slack + 0.1);
  }
}

/** Metres left along a route. */
export function routeLength(from: Point, path: Point[]) {
  let total = 0;
  let prev = from;
  for (const p of path) {
    total += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return total;
}
