import { CAT_PET_LINES, CAT_WAKE_LINES, pickRandom } from '@connecta/shared';
import type { Npc } from '../state.js';
import { idle, walk } from './motion.js';
import { between, rand, type Agent, type NpcContext } from './types.js';

/** How long a cat tags along after head pats */
const FOLLOW_MS = 20_000;
/** Close enough to the person it's following */
const FOLLOW_GAP = 1.1;
/** Re-plan the follow path this often while catching up */
const FOLLOW_REPLAN_MS = 1000;

/** A cat: wander, groom, nap somewhere cosy, follow whoever pets it. */
export function tickCat(ctx: NpcContext, agent: Agent, now: number) {
  const { npc, brain } = agent;
  if (brain.state === 'follow') {
    const target = npc.following ? ctx.host.state.players.get(npc.following) : undefined;
    // Done once time's up, the person leaves, or they sit down
    if (!target || now > brain.until || target.seatId) {
      npc.following = '';
      return idle(npc, brain, 'groom', between(3000, 6000));
    }
    const d = Math.hypot(target.x - npc.x, target.z - npc.z);
    if (d <= FOLLOW_GAP) brain.path = [];
    else if (!brain.path.length || now - brain.replannedAt > FOLLOW_REPLAN_MS) {
      brain.replannedAt = now;
      brain.path = ctx.host.map.nav.findPath(npc, { x: target.x, z: target.z });
    }
    return;
  }
  if ((brain.state === 'idle' || brain.state === 'nap') && now > brain.until) {
    if (brain.state === 'nap') leaveNap(ctx, npc);
    decideCat(ctx, agent);
  }
}

/** The cat's next thing: a nap, a wander, or a groom. */
export function decideCat(ctx: NpcContext, { npc, brain }: Agent) {
  const { napSpots, nav } = ctx.host.map;
  const roll = rand();
  if (roll < 0.3 && napSpots.length) {
    const spot = pickRandom(napSpots);
    walk(ctx, npc, brain, nav.nearestWalkable(spot), () => napAt(npc, brain, spot));
  } else if (roll < 0.8) {
    walk(ctx, npc, brain, nav.randomWalkable(rand), () => idle(npc, brain, rand() < 0.4 ? 'groom' : 'idle', between(3000, 8000)));
  } else {
    idle(npc, brain, 'groom', between(3000, 7000));
  }
}

/** Curl up on a nap spot (it may be up on the sofa or a shelf) */
export function napAt(npc: Npc, brain: Agent['brain'], spot: { x: number; z: number; y: number }) {
  npc.x = spot.x;
  npc.z = spot.z;
  npc.y = spot.y;
  npc.anim = 'nap';
  npc.moving = false;
  brain.state = 'nap';
  brain.path = [];
  brain.until = Date.now() + between(15_000, 40_000);
}

/** Hop down from a nap spot onto the floor. */
export function leaveNap(ctx: NpcContext, npc: Npc) {
  const ground = ctx.host.map.nav.nearestWalkable(npc);
  npc.x = ground.x;
  npc.z = ground.z;
  npc.y = 0;
  npc.anim = 'idle';
}

/** Head pats: hearts, a purr (or a sleepy mew), then it follows the petter for a bit. */
export function petCat(ctx: NpcContext, { id, npc, brain }: Agent, sessionId: string) {
  const wasNapping = brain.state === 'nap';
  ctx.host.react(id, '❤️');
  ctx.host.say(id, pickRandom(wasNapping ? CAT_WAKE_LINES : CAT_PET_LINES));
  if (wasNapping) leaveNap(ctx, npc);
  brain.state = 'follow';
  brain.until = Date.now() + FOLLOW_MS;
  brain.path = [];
  npc.following = sessionId;
  npc.anim = 'idle';
}
