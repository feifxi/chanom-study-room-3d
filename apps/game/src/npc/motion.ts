import { findPath, npcRadius, PLAYER_RADIUS, resolveCollisions, type Point } from '@study/shared';
import { SPEED, type Agent, type Brain, type NpcContext } from './types';
import type { Npc } from '../state';

/** Seconds of not moving before an NPC tries a fresh route. */
const STUCK_AFTER = 1.5;
const MAX_REPATHS = 3;

/** Stand still with an animation for `ms`. */
export function idle(npc: Npc, brain: Brain, anim: string, ms: number) {
  brain.state = 'idle';
  brain.path = [];
  brain.until = Date.now() + ms;
  npc.anim = anim;
  npc.moving = false;
}

/** Path to `to` and call `arrive` there (right away if already there or unreachable). */
export function walk(npc: Npc, brain: Brain, to: Point, arrive: () => void) {
  if (brain.state !== 'toSeat' && brain.state !== 'leaving') brain.state = 'walk';
  brain.path = findPath(npc, to);
  brain.arrive = arrive;
  brain.stuckFor = 0;
  brain.repaths = 0;
  npc.anim = 'walk';
  if (!brain.path.length) {
    brain.arrive = undefined;
    arrive();
  }
}

/** Move along the current path for `dt` seconds, sliding off people and furniture. */
export function step(ctx: NpcContext, { npc, brain }: Agent, dt: number) {
  const waypoint = brain.path[0];
  if (!waypoint) {
    if (npc.moving) npc.moving = false;
    if (brain.state === 'follow' && npc.anim !== 'idle') npc.anim = 'idle';
    return;
  }
  const speed = brain.state === 'follow' ? SPEED.catFollow : SPEED[brain.kind];
  const dx = waypoint.x - npc.x;
  const dz = waypoint.z - npc.z;
  const d = Math.hypot(dx, dz);
  const stepLen = speed * dt;
  const before = { x: npc.x, z: npc.z };
  const next = d <= stepLen ? { x: waypoint.x, z: waypoint.z } : { x: npc.x + (dx / d) * stepLen, z: npc.z + (dz / d) * stepLen };
  if (d <= stepLen) brain.path.shift();

  // Arriving at a seat or nap spot means getting close to furniture, so skip collisions right at the goal
  const nearGoal = brain.path.length <= 1 && d < 0.8;
  if (!nearGoal) resolveCollisions(next, obstaclesFor(ctx, npc), npcRadius(brain.kind));

  npc.x = next.x;
  npc.z = next.z;
  npc.moving = true;
  if (npc.anim !== 'walk') npc.anim = 'walk';
  if (d > 0.01) npc.yaw = Math.atan2(dx, dz);

  // Stuck behind someone? Try a fresh route, then give up gracefully.
  const moved = Math.hypot(npc.x - before.x, npc.z - before.z);
  brain.stuckFor = moved < stepLen * 0.2 ? brain.stuckFor + dt : 0;
  if (brain.stuckFor > STUCK_AFTER) {
    brain.stuckFor = 0;
    const goal = brain.path[brain.path.length - 1];
    brain.path = goal && brain.repaths++ < MAX_REPATHS ? findPath(npc, goal) : [];
  }

  if (!brain.path.length && brain.state !== 'follow') {
    npc.moving = false;
    const arrive = brain.arrive;
    brain.arrive = undefined;
    arrive?.();
  }
}

/** People and other NPCs this NPC should not walk through. */
function obstaclesFor(ctx: NpcContext, self: Npc) {
  const others: { x: number; z: number; r: number }[] = [];
  for (const p of ctx.host.state.players.values()) others.push({ x: p.x, z: p.z, r: PLAYER_RADIUS });
  for (const o of ctx.host.state.npcs.values()) if (o !== self) others.push({ x: o.x, z: o.z, r: npcRadius(o.kind) });
  return others;
}
