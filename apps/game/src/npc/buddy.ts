import { BUDDY_BREAK_MIN, BUDDY_CHEER_LINES, BUDDY_FOCUS_MIN, BUDDY_GREET_LINES, pickRandom, type Seat } from '@connecta/shared';
import type { Npc, Player } from '../state.js';
import { idle, walk } from './motion.js';
import { MINUTE, rand, type Agent, type NpcContext } from './types.js';

const CHEER_RANGE = 4.5;
const CHEER_COOLDOWN_MS = MINUTE;
const GREET_COOLDOWN_MS = 45_000;
const GREET_DELAY_MS = 2500;
/** Bigger rooms than this don't need a study buddy saying hi */
const GREET_MAX_PLAYERS = 3;

/** A study buddy: sit at a desk, focus 25 minutes, stretch on the open floor for 5, repeat. */
export function tickBuddy(ctx: NpcContext, agent: Agent, now: number) {
  const { npc, brain } = agent;
  if (brain.state === 'leaving' || brain.state === 'walk' || brain.state === 'toSeat') return;

  if (brain.state === 'idle' && now > brain.until) return goSit(ctx, agent);

  if (brain.state === 'seated' && now > brain.phaseEndsAt) {
    brain.phase = 'break';
    brain.phaseEndsAt = now + BUDDY_BREAK_MIN * MINUTE;
    setStatus(npc, 'break', brain.phaseEndsAt);
    standUp(ctx, npc);
    walk(ctx, npc, brain, stretchSpot(ctx), () => {
      brain.state = 'stretch';
      npc.anim = 'stretch';
    });
    return;
  }

  if (brain.state === 'stretch' && now > brain.phaseEndsAt) {
    brain.phase = 'focus';
    brain.phaseEndsAt = 0;
    goSit(ctx, agent);
  }
}

/** Somewhere on the open floor to stretch (every map has one) */
function stretchSpot(ctx: NpcContext) {
  const { floorArea: a, nav } = ctx.host.map;
  const half = a.kind === 'circle' ? { w: a.r, d: a.r } : { w: a.w / 2, d: a.d / 2 };
  return nav.randomWalkable(rand, { minX: a.x - half.w, maxX: a.x + half.w, minZ: a.z - half.d, maxZ: a.z + half.d });
}

/** Seats someone (a person or another NPC) is using */
export function takenSeats(ctx: NpcContext, exceptNpcId?: string) {
  const taken = new Set<string>();
  for (const p of ctx.host.state.players.values()) if (p.seatId) taken.add(p.seatId);
  for (const [id, n] of ctx.host.state.npcs) if (id !== exceptNpcId && n.seatId) taken.add(n.seatId);
  return taken;
}

/** Any free desk chair, at random so study buddies spread around the room */
export function pickFreeSeat(desks: readonly Seat[], taken: ReadonlySet<string>): Seat | undefined {
  const free = desks.filter((s) => !taken.has(s.id));
  return free.length ? pickRandom(free) : undefined;
}

/** Sit down at a desk at once (a fresh study buddy out of the capsule), focusing. */
export function sitAt(npc: Npc, brain: Agent['brain'], seat: Seat) {
  npc.seatId = seat.id;
  npc.x = seat.x;
  npc.z = seat.z;
  npc.yaw = seat.yaw;
  npc.y = 0;
  npc.anim = 'sit';
  npc.moving = false;
  brain.state = 'seated';
  brain.path = [];
  if (!brain.phaseEndsAt || brain.phase !== 'focus') {
    brain.phase = 'focus';
    brain.phaseEndsAt = Date.now() + BUDDY_FOCUS_MIN * MINUTE;
  }
  setStatus(npc, 'focus', brain.phaseEndsAt);
}

/** Walk to a free desk and start focusing (or wait a bit if every desk is taken). */
export function goSit(ctx: NpcContext, agent: Agent) {
  const { id, npc, brain } = agent;
  const seat = pickFreeSeat(ctx.host.map.deskSeats, takenSeats(ctx, id));
  if (!seat) return idle(npc, brain, 'idle', 10_000);
  brain.state = 'toSeat';
  walk(ctx, npc, brain, ctx.host.map.nav.nearestWalkable(seat.out), () => {
    // Someone may have sat down while we walked over
    if (takenSeats(ctx, id).has(seat.id)) return goSit(ctx, agent);
    sitAt(npc, brain, seat);
  });
}

/** Leave the chair and step out into the aisle */
export function standUp(ctx: NpcContext, npc: Npc) {
  if (!npc.seatId) return;
  const seat = ctx.host.map.seatById.get(npc.seatId);
  npc.seatId = '';
  npc.anim = 'idle';
  if (seat) {
    const out = ctx.host.map.nav.nearestWalkable(seat.out);
    npc.x = out.x;
    npc.z = out.z;
  }
}

export function setStatus(npc: Npc, status: 'focus' | 'break' | 'idle', endsAt: number) {
  if (status === 'focus' && npc.status !== 'focus') npc.focusSince = Date.now();
  if (status !== 'focus') npc.focusSince = 0;
  npc.status = status;
  npc.statusEndsAt = endsAt;
}

/** Cheer someone who just finished focusing, if a study buddy is at their table or nearby. */
export function cheer(ctx: NpcContext, agents: Iterable<Agent>, player: Player, minutes: number) {
  const now = Date.now();
  const tableOf = (seatId: string) => ctx.host.map.seatById.get(seatId)?.tableId;
  for (const { id, npc, brain } of agents) {
    if (npc.kind !== 'buddy' || now < brain.cheerAt || brain.state === 'leaving') continue;
    const sameTable = !!npc.seatId && !!player.seatId && tableOf(npc.seatId) === tableOf(player.seatId);
    if (!sameTable && Math.hypot(npc.x - player.x, npc.z - player.z) > CHEER_RANGE) continue;
    ctx.host.say(id, pickRandom(BUDDY_CHEER_LINES)(player.name, Math.round(minutes)));
    brain.cheerAt = now + CHEER_COOLDOWN_MS;
  }
}

/** In a quiet room, one study buddy says hi to someone walking in. */
export function greet(ctx: NpcContext, agents: Iterable<Agent>, player: Player, later: (fn: () => void, ms: number) => void) {
  if (ctx.host.state.players.size > GREET_MAX_PLAYERS) return;
  const now = Date.now();
  for (const { id, npc, brain } of agents) {
    if (npc.kind !== 'buddy' || now < brain.greetAt || brain.state === 'leaving') continue;
    brain.greetAt = now + GREET_COOLDOWN_MS;
    later(() => ctx.host.state.npcs.has(id) && ctx.host.say(id, pickRandom(BUDDY_GREET_LINES)(player.name)), GREET_DELAY_MS);
    return; // one hello is plenty
  }
}
