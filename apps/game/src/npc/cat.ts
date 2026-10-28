import {
  CAT_PET_LINES,
  CAT_WAKE_LINES,
  NAP_SPOTS,
  NOOK,
  findPath,
  nearestWalkable,
  pickRandom,
  randomWalkable,
  type CatSettings,
} from '@study/shared';
import type { Npc } from '../state';
import { idle, walk } from './motion';
import { between, rand, readSettings, type Agent, type NpcContext } from './types';

/** How long a cat tags along after head pats. */
const FOLLOW_MS = 20_000;
/** Close enough to the person it's following. */
const FOLLOW_GAP = 1.1;

/** Bangkok hour (0–23): cats are sleepier at night. */
function bangkokHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }).format(now));
}

/** Library cat: wander, groom, nap somewhere cosy, follow whoever pets it. */
export function tickCat(ctx: NpcContext, agent: Agent, now: number) {
  const { npc, brain } = agent;
  if (brain.state === 'follow') {
    const target = brain.followId ? ctx.host.state.players.get(brain.followId) : undefined;
    if (!target || now > brain.until) return decideCat(agent);
    const d = Math.hypot(target.x - npc.x, target.z - npc.z);
    // Re-plan about once a second while catching up
    if (d > FOLLOW_GAP && (brain.path.length === 0 || now % 1000 < 100)) brain.path = findPath(npc, { x: target.x, z: target.z });
    if (d <= FOLLOW_GAP) brain.path = [];
    return;
  }
  if ((brain.state === 'idle' || brain.state === 'nap') && now > brain.until) {
    if (brain.state === 'nap') leaveNap(npc);
    decideCat(agent);
  }
}

/** Pick the cat's next activity. `forceWander` skips napping (e.g. right after being told to stay in the nook). */
export function decideCat({ npc, brain }: Agent, forceWander = false) {
  const settings = readSettings<CatSettings>(npc);
  const hour = bangkokHour();
  const sleepy = hour >= 21 || hour < 6;
  const roll = rand();
  brain.followId = undefined;
  if (!forceWander && roll < (sleepy ? 0.5 : 0.25)) {
    // Nap somewhere cosy (only nook spots when told to stay there)
    const spot = pickRandom(settings.roam ? NAP_SPOTS : NAP_SPOTS.slice(0, 3));
    walk(npc, brain, nearestWalkable(spot), () => {
      npc.x = spot.x;
      npc.z = spot.z;
      npc.y = spot.y;
      npc.anim = 'nap';
      brain.state = 'nap';
      brain.until = Date.now() + between(sleepy ? 30_000 : 15_000, sleepy ? 70_000 : 40_000);
    });
  } else if (forceWander || roll < 0.8) {
    const target = randomWalkable(rand, settings.roam ? undefined : NOOK);
    walk(npc, brain, target, () => idle(npc, brain, rand() < 0.4 ? 'groom' : 'idle', between(3000, 8000)));
  } else {
    idle(npc, brain, 'groom', between(3000, 7000));
  }
}

/** Hop down from a nap spot (which may be on the sofa) onto the floor. */
export function leaveNap(npc: Npc) {
  const ground = nearestWalkable(npc);
  npc.x = ground.x;
  npc.z = ground.z;
  npc.y = 0;
  npc.anim = 'idle';
}

/** Head pats: hearts, a purr (or a sleepy mew), then follow the petter for a bit. */
export function petCat(ctx: NpcContext, { id, npc, brain }: Agent, playerId: string) {
  const wasNapping = brain.state === 'nap';
  ctx.host.react(id, '❤️');
  ctx.host.say(id, pickRandom(wasNapping ? CAT_WAKE_LINES : CAT_PET_LINES));
  if (wasNapping) leaveNap(npc);
  brain.state = 'follow';
  brain.followId = playerId;
  brain.until = Date.now() + FOLLOW_MS;
  brain.path = [];
  npc.anim = 'idle';
}
