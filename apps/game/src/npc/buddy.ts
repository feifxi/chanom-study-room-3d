import {
  BUDDY_CHEER_LINES,
  BUDDY_GREET_LINES,
  BUDDY_IDLE_LINES,
  SEATS,
  SEAT_BY_ID,
  nearestWalkable,
  pickRandom,
  randomWalkable,
  type BuddySettings,
} from '@study/shared';
import type { Npc, Player } from '../state';
import { idle, walk } from './motion';
import { MINUTE, rand, readSettings, type Agent, type NpcContext } from './types';

/** Where buddies go to stretch on a break: the strip in front of the windows. */
const STRETCH_AREA = { minX: -9, maxX: 9, minZ: -5.8, maxZ: -4.2 };
/** Chance of picking a table that already has people at it. */
const SOCIAL_SEAT_ODDS = 0.65;
const CHEER_RANGE = 4.5;
const CHEER_COOLDOWN_MS = MINUTE;
const GREET_COOLDOWN_MS = 45_000;
const GREET_DELAY_MS = 2500;
/** Rooms bigger than this don't need a buddy saying hi. */
const GREET_MAX_PLAYERS = 3;

/** Study buddy: sit, run a pomodoro, stretch on breaks, repeat. */
export function tickBuddy(ctx: NpcContext, agent: Agent, now: number) {
  const { id, npc, brain } = agent;
  const settings = readSettings<BuddySettings>(npc);
  if (brain.state === 'leaving' || brain.state === 'walk' || brain.state === 'toSeat') return;

  if (brain.state === 'idle' && now > brain.until) return goSit(ctx, agent);

  if (brain.state === 'seated' && now > brain.phaseEndsAt) {
    // Focus done: stand up and stretch somewhere
    brain.phase = 'break';
    brain.phaseEndsAt = now + (settings.focusMin === 50 ? 10 : 5) * MINUTE;
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
    return;
  }

  if (brain.state === 'stretch' && settings.chatty && now - brain.lastSay > 90_000 && rand() < 0.01) {
    ctx.host.say(id, pickRandom(BUDDY_IDLE_LINES));
    brain.lastSay = now;
  }
}

/** Seats nobody (person or other NPC) is using. */
function takenSeats(ctx: NpcContext, exceptNpcId?: string) {
  const taken = new Set<string>();
  for (const p of ctx.host.state.players.values()) if (p.seatId) taken.add(p.seatId);
  for (const [nid, n] of ctx.host.state.npcs) if (nid !== exceptNpcId && n.seatId) taken.add(n.seatId);
  return taken;
}

/** Walk to a free seat (preferring tables with people) and start focusing. */
export function goSit(ctx: NpcContext, agent: Agent) {
  const { id, npc, brain } = agent;
  const taken = takenSeats(ctx, id);
  const busyTables = new Set([...taken].map((s) => SEAT_BY_ID.get(s)?.tableId));
  const free = SEATS.filter((s) => !taken.has(s.id));
  if (!free.length) return idle(npc, brain, 'idle', 10_000);
  const social = free.filter((s) => busyTables.has(s.tableId));
  const seat = pickRandom(social.length && rand() < SOCIAL_SEAT_ODDS ? social : free);
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
      brain.phaseEndsAt = Date.now() + readSettings<BuddySettings>(npc).focusMin * MINUTE;
    }
    setStatus(npc, 'focus', brain.phaseEndsAt);
  });
}

/** Leave the chair and step back into the aisle. */
export function standUp(npc: Npc) {
  if (!npc.seatId) return;
  const seat = SEAT_BY_ID.get(npc.seatId);
  npc.seatId = '';
  npc.anim = 'idle';
  if (seat) {
    const back = nearestWalkable({ x: seat.x - Math.sin(seat.yaw) * 0.5, z: seat.z - Math.cos(seat.yaw) * 0.5 });
    npc.x = back.x;
    npc.z = back.z;
  }
}

export function setStatus(npc: Npc, status: 'focus' | 'break' | 'idle', endsAt: number) {
  if (status === 'focus' && npc.status !== 'focus') npc.focusSince = Date.now();
  if (status !== 'focus') npc.focusSince = 0;
  npc.status = status;
  npc.statusEndsAt = endsAt;
}

/** What a buddy says when you press E next to it. */
export function buddyStatusLine(npc: Npc, now: number) {
  if (npc.status === 'focus' && npc.focusSince)
    return `${Math.floor((now - npc.focusSince) / MINUTE)} min into ${npc.subject}! You got this ✨`;
  if (npc.status === 'break') return `Stretch break 🙆 back in ${Math.max(1, Math.ceil((npc.statusEndsAt - now) / MINUTE))} min`;
  return pickRandom(BUDDY_IDLE_LINES);
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

/** In a quiet room, one chatty buddy says hi to a newcomer. */
export function greet(ctx: NpcContext, agents: Iterable<Agent>, player: Player) {
  if (ctx.host.state.players.size > GREET_MAX_PLAYERS) return;
  const now = Date.now();
  for (const { id, npc, brain } of agents) {
    if (npc.kind !== 'buddy' || now < brain.greetAt || !readSettings<BuddySettings>(npc).chatty) continue;
    brain.greetAt = now + GREET_COOLDOWN_MS;
    setTimeout(() => ctx.host.state.npcs.has(id) && ctx.host.say(id, pickRandom(BUDDY_GREET_LINES)(player.name)), GREET_DELAY_MS);
    return; // one greeting is plenty
  }
}
