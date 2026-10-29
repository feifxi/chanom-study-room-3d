import {
  BUDDY_BREAK_MIN,
  BUDDY_CHEER_LINES,
  BUDDY_FOCUS_MIN,
  BUDDY_GREET_LINES,
  DESK_SEATS,
  SEAT_BY_ID,
  nearestWalkable,
  pickRandom,
  randomWalkable,
  type Seat,
} from '@study/shared';
import type { Npc, Player } from '../state';
import { idle, walk } from './motion';
import { MINUTE, rand, type Agent, type NpcContext } from './types';

/** Where buddies go to stretch on a break: the strip in front of the windows. */
const STRETCH_AREA = { minX: -9, maxX: 9, minZ: -5.8, maxZ: -4.2 };
const CHEER_RANGE = 4.5;
const CHEER_COOLDOWN_MS = MINUTE;
const GREET_COOLDOWN_MS = 45_000;
const GREET_DELAY_MS = 2500;
/** Rooms bigger than this don't need a buddy saying hi. */
const GREET_MAX_PLAYERS = 3;

/** Study buddy: sit, run a pomodoro, stretch on breaks, repeat. */
export function tickBuddy(ctx: NpcContext, agent: Agent, now: number) {
  const { npc, brain } = agent;
  if (brain.state === 'leaving' || brain.state === 'walk' || brain.state === 'toSeat') return;

  if (brain.state === 'idle' && now > brain.until) return goSit(ctx, agent);

  if (brain.state === 'seated' && now > brain.phaseEndsAt) {
    // Focus done: stand up and stretch somewhere
    brain.phase = 'break';
    brain.phaseEndsAt = now + BUDDY_BREAK_MIN * MINUTE;
    setStatus(npc, 'break', brain.phaseEndsAt);
    standUp(npc);
    walk(npc, brain, randomWalkable(rand, STRETCH_AREA), () => {
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

/** Seats someone (a person or another NPC) is using. */
function takenSeats(ctx: NpcContext, exceptNpcId?: string) {
  const taken = new Set<string>();
  for (const p of ctx.host.state.players.values()) if (p.seatId) taken.add(p.seatId);
  for (const [nid, n] of ctx.host.state.npcs) if (nid !== exceptNpcId && n.seatId) taken.add(n.seatId);
  return taken;
}

/** Any free desk chair, picked uniformly at random so buddies spread around the room. */
export function pickFreeSeat(taken: ReadonlySet<string>, random: () => number = rand): Seat | undefined {
  const free = DESK_SEATS.filter((s) => !taken.has(s.id));
  return free.length ? pickRandom(free, random) : undefined;
}

/** Walk to a random free desk seat and start focusing. */
export function goSit(ctx: NpcContext, agent: Agent) {
  const { id, npc, brain } = agent;
  const seat = pickFreeSeat(takenSeats(ctx, id));
  if (!seat) return idle(npc, brain, 'idle', 10_000);
  brain.state = 'toSeat';
  walk(npc, brain, seat, () => {
    // Someone may have sat down while we walked over
    if (takenSeats(ctx, id).has(seat.id)) return goSit(ctx, agent);
    npc.seatId = seat.id;
    npc.x = seat.x;
    npc.z = seat.z;
    npc.yaw = seat.yaw;
    npc.anim = 'sit';
    brain.state = 'seated';
    if (!brain.phaseEndsAt || brain.phase !== 'focus') {
      brain.phase = 'focus';
      brain.phaseEndsAt = Date.now() + BUDDY_FOCUS_MIN * MINUTE;
    }
    setStatus(npc, 'focus', brain.phaseEndsAt);
  });
}

/** Leave the chair and step out into the aisle. */
export function standUp(npc: Npc) {
  if (!npc.seatId) return;
  const seat = SEAT_BY_ID.get(npc.seatId);
  npc.seatId = '';
  npc.anim = 'idle';
  if (seat) {
    const out = nearestWalkable(seat.out);
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

/** Cheer a person who just finished focusing, if a buddy is at their table or nearby. */
export function cheer(ctx: NpcContext, agents: Iterable<Agent>, player: Player, minutes: number) {
  const now = Date.now();
  for (const { id, npc, brain } of agents) {
    if (npc.kind !== 'buddy' || now < brain.cheerAt || brain.state === 'leaving') continue;
    const sameTable = npc.seatId && player.seatId && SEAT_BY_ID.get(npc.seatId)?.tableId === SEAT_BY_ID.get(player.seatId)?.tableId;
    if (!sameTable && Math.hypot(npc.x - player.x, npc.z - player.z) > CHEER_RANGE) continue;
    ctx.host.say(id, pickRandom(BUDDY_CHEER_LINES)(player.name, Math.round(minutes)));
    brain.cheerAt = now + CHEER_COOLDOWN_MS;
  }
}

/** In a quiet room, one buddy says hi to a newcomer. */
export function greet(ctx: NpcContext, agents: Iterable<Agent>, player: Player) {
  if (ctx.host.state.players.size > GREET_MAX_PLAYERS) return;
  const now = Date.now();
  for (const { id, npc, brain } of agents) {
    if (npc.kind !== 'buddy' || now < brain.greetAt) continue;
    brain.greetAt = now + GREET_COOLDOWN_MS;
    setTimeout(() => ctx.host.state.npcs.has(id) && ctx.host.say(id, pickRandom(BUDDY_GREET_LINES)(player.name)), GREET_DELAY_MS);
    return; // one greeting is plenty
  }
}
