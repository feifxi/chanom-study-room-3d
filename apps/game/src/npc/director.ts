import {
  BUDDY_NAMES,
  BUDDY_SUBJECTS,
  BUDDY_YIELD_LINES,
  CAT_COATS,
  CAT_NAMES,
  COAT_BY_ID,
  GOODBYE_LINES,
  NPC_LIMITS,
  NPC_REACH,
  SUMMON_COOLDOWN_MS,
  SUMMON_REVEAL_MS,
  pickRandom,
  randomLook,
  type NpcKind,
  type PetOut,
  type Point,
} from '@connecta/shared';
import { Npc, type Player } from '../state.js';
import { cheer, goSit, greet, pickFreeSeat, setStatus, sitAt, standUp, takenSeats, tickBuddy } from './buddy.js';
import { napAt, petCat, tickCat } from './cat.js';
import { step, walk } from './motion.js';
import { between, type Agent, type Brain, type NpcContext, type NpcHost } from './types.js';

export type { NpcHost } from './types.js';

/** Slack on top of the reach, so a press sent while walking away still counts */
const MACHINE_SLACK = 0.8;
const PET_SLACK = 0.4;

/** A summon whose NPC appears once the capsule has rolled out */
interface Pending {
  id: string;
  kind: NpcKind;
  name: string;
  coat?: string;
  label: string;
  revealAt: number;
  byName: string;
  /** A pet: its owner */
  owner?: { userId: string; name: string };
}

/**
 * The room's cats and study buddies (feature 6): the Buddy Machine (limits, cooldown), goodbyes,
 * petting, and the 10 Hz simulation. Behaviour lives in cat.ts and buddy.ts, movement in motion.ts.
 * Everything is in memory: a room that empties closes, and the next one starts with the map's
 * resident cats again.
 */
export class NpcDirector {
  private readonly ctx: NpcContext;
  private pending: Pending[] = [];
  private summonedAt = new Map<string, number>();
  private nextId = 1;

  constructor(host: NpcHost) {
    this.ctx = { host, brains: new Map() };
  }

  private get npcs() {
    return this.ctx.host.state.npcs;
  }

  private agent(id: string): Agent | undefined {
    const npc = this.npcs.get(id);
    const brain = this.ctx.brains.get(id);
    return npc && brain ? { id, npc, brain } : undefined;
  }

  private *agents(): Generator<Agent> {
    for (const id of [...this.npcs.keys()]) {
      const a = this.agent(id);
      if (a) yield a;
    }
  }

  /** NPCs in the room plus capsules still rolling out; pets are counted on their own */
  private count(kind?: NpcKind) {
    let n = this.pending.filter((p) => !p.owner && (!kind || p.kind === kind)).length;
    for (const npc of this.npcs.values()) if (!npc.owner && (!kind || npc.kind === kind)) n++;
    return n;
  }

  /** Pets out (or rolling out), all of them or one person's */
  private petCount(userId?: string) {
    let n = this.pending.filter((p) => p.owner && (!userId || p.owner.userId === userId)).length;
    for (const npc of this.npcs.values()) if (npc.owner && (!userId || npc.owner === userId)) n++;
    return n;
  }

  /** A fresh start on this map (the room opened, or the owner switched maps): its resident cats. */
  reset() {
    this.npcs.clear();
    this.ctx.brains.clear();
    this.pending = [];
    const { napSpots, starterCat } = this.ctx.host.map;
    // Mochi naps in the cosiest spot, Tofu greets you by the door
    const mochi = this.spawn('cat', { name: 'Mochi', coat: 'calico' });
    const nap = napSpots[0];
    if (nap) napAt(this.npcs.get(mochi)!, this.ctx.brains.get(mochi)!, nap);
    this.spawn('cat', { name: 'Tofu', coat: 'orange', at: starterCat });
  }

  // ── The Buddy Machine ─────────────────────────────────────────────────────────────────────────

  /** Summon a cat or a study buddy for the whole room. Returns why not, or null. */
  summon(sessionId: string, player: Player, kind: NpcKind): string | null {
    const machine = this.ctx.host.map.gacha;
    if (Math.hypot(player.x - machine.x, player.z - machine.z) > machine.reach + MACHINE_SLACK) return 'Walk up to the machine first';
    const now = Date.now();
    if (now - (this.summonedAt.get(sessionId) ?? 0) < SUMMON_COOLDOWN_MS) return 'The machine is still cooling down';
    if (this.count() >= NPC_LIMITS.total) return 'The room is full of friends already';
    if (this.count(kind) >= NPC_LIMITS[kind]) return kind === 'cat' ? 'That’s plenty of cats for one room' : 'Enough study buddies for now';
    this.summonedAt.set(sessionId, now);

    const id = `n${this.nextId++}`;
    const coat = kind === 'cat' ? pickRandom(CAT_COATS) : undefined;
    const name = this.freshName(kind);
    const label = coat ? `${coat.label.toLowerCase()} cat` : 'study buddy';
    this.pending.push({ id, kind, name, coat: coat?.id, label, revealAt: now + SUMMON_REVEAL_MS, byName: player.name });
    this.ctx.host.summoned({ npcId: id, kind, name, label, bySessionId: sessionId, byName: player.name });
    return null;
  }

  /** Bring one of your pets (the API vouched you own it): one each, up to 4 in a room */
  summonPet(sessionId: string, player: Player, pet: PetOut): string | null {
    const machine = this.ctx.host.map.gacha;
    if (Math.hypot(player.x - machine.x, player.z - machine.z) > machine.reach + MACHINE_SLACK) return 'Walk up to the machine first';
    const now = Date.now();
    if (now - (this.summonedAt.get(sessionId) ?? 0) < SUMMON_COOLDOWN_MS) return 'The machine is still cooling down';
    if (this.petCount(player.userId)) return 'One of your pets is out already: say goodbye to it first';
    if (this.petCount() >= NPC_LIMITS.pet) return 'This room has plenty of pets right now';
    if (!COAT_BY_ID.has(pet.coat)) return 'That pet can’t come out right now';
    this.summonedAt.set(sessionId, now);
    const id = `n${this.nextId++}`;
    const owner = { userId: player.userId, name: player.name };
    this.pending.push({
      id,
      kind: 'cat',
      name: pet.name,
      coat: pet.coat,
      label: 'cat',
      revealAt: now + SUMMON_REVEAL_MS,
      byName: player.name,
      owner,
    });
    this.ctx.host.summoned({ npcId: id, kind: 'cat', name: pet.name, label: 'cat', bySessionId: sessionId, byName: player.name });
    return null;
  }

  /** Your last tab left the room: your pet goes home with you */
  ownerLeft(userId: string) {
    this.pending = this.pending.filter((p) => p.owner?.userId !== userId);
    for (const agent of this.agents()) {
      if (agent.npc.owner === userId)
        this.goodbye(agent.id, { name: agent.npc.ownerName, userId }, `👋 ${agent.npc.name} went home with ${agent.npc.ownerName}`);
    }
  }

  /** Put an NPC in the room right away. */
  private spawn(kind: NpcKind, opts: { id?: string; name?: string; coat?: string; at?: Point; owner?: Pending['owner'] } = {}) {
    const id = opts.id ?? `n${this.nextId++}`;
    const at = opts.at ?? this.ctx.host.map.npcSpawn;
    const npc = new Npc({ kind, name: opts.name ?? this.freshName(kind), look: '', x: at.x, z: at.z, yaw: 0, moving: false });
    if (opts.owner) Object.assign(npc, { owner: opts.owner.userId, ownerName: opts.owner.name });
    if (kind === 'cat') {
      npc.look = JSON.stringify({ coat: opts.coat && COAT_BY_ID.has(opts.coat) ? opts.coat : pickRandom(CAT_COATS).id });
    } else {
      npc.look = JSON.stringify(randomLook());
      npc.subject = pickRandom(BUDDY_SUBJECTS);
    }
    const now = Date.now();
    const brain: Brain = {
      kind,
      state: 'idle',
      path: [],
      until: now + between(800, 2000),
      stuckFor: 0,
      repaths: 0,
      replannedAt: 0,
      phase: 'focus',
      phaseEndsAt: 0,
      cheerAt: 0,
      greetAt: now + 5000,
    };
    this.npcs.set(id, npc);
    this.ctx.brains.set(id, brain);
    return id;
  }

  private freshName(kind: NpcKind) {
    const taken = new Set<string>();
    for (const n of this.npcs.values()) taken.add(n.name);
    for (const p of this.pending) taken.add(p.name);
    const pool = (kind === 'cat' ? CAT_NAMES : BUDDY_NAMES).filter((n) => !taken.has(n));
    return pool.length ? pickRandom(pool) : `${kind === 'cat' ? 'Kitty' : 'Buddy'} ${this.nextId}`;
  }

  /** Say goodbye: it waves, walks back into the machine and is gone. Anyone can, but a pet only its owner. */
  goodbye(id: string, by: { name: string; userId: string }, note?: string): string | null {
    const agent = this.agent(id);
    if (!agent || agent.brain.state === 'leaving') return null;
    const { npc, brain } = agent;
    if (npc.owner && npc.owner !== by.userId) return `Only ${npc.ownerName} can send ${npc.name} home`;
    this.ctx.host.say(id, pickRandom(GOODBYE_LINES));
    this.ctx.host.note(note ?? `👋 ${by.name} said goodbye to ${npc.name}`);
    standUp(this.ctx, npc);
    npc.following = '';
    npc.y = 0;
    setStatus(npc, 'idle', 0);
    brain.state = 'leaving';
    walk(this.ctx, npc, brain, this.ctx.host.map.nav.nearestWalkable(this.ctx.host.map.npcSpawn), () => {
      this.npcs.delete(id);
      this.ctx.brains.delete(id);
    });
    return null;
  }

  // ── People ────────────────────────────────────────────────────────────────────────────────────

  pet(sessionId: string, player: Player, id: string) {
    const agent = this.agent(id);
    if (!agent || agent.npc.kind !== 'cat' || agent.brain.state === 'leaving') return false;
    if (Math.hypot(agent.npc.x - player.x, agent.npc.z - player.z) > NPC_REACH + PET_SLACK) return false;
    petCat(this.ctx, agent, sessionId);
    return true;
  }

  /** Someone sits where a study buddy is: it gives up the seat and finds another. */
  yieldSeat(seatId: string) {
    for (const agent of this.agents()) {
      if (agent.npc.seatId !== seatId) continue;
      this.ctx.host.say(agent.id, pickRandom(BUDDY_YIELD_LINES));
      standUp(this.ctx, agent.npc);
      goSit(this.ctx, agent);
    }
  }

  /** A focus round ended: nearby study buddies cheer */
  focusEnded(player: Player, minutes: number) {
    if (minutes >= 1) cheer(this.ctx, this.agents(), player, minutes);
  }

  joined(player: Player, later: (fn: () => void, ms: number) => void) {
    greet(this.ctx, this.agents(), player, later);
  }

  // ── Simulation ────────────────────────────────────────────────────────────────────────────────

  tick(dt: number) {
    const now = Date.now();
    this.revealDue(now);
    for (const agent of this.agents()) {
      if (agent.npc.kind === 'cat') tickCat(this.ctx, agent, now);
      else tickBuddy(this.ctx, agent, now);
      step(this.ctx, agent, dt);
    }
  }

  /** The capsule popped open: the cat steps out by the machine; a study buddy is at a free desk */
  private revealDue(now: number) {
    const due = this.pending.filter((s) => s.revealAt <= now);
    if (!due.length) return;
    this.pending = this.pending.filter((s) => s.revealAt > now);
    for (const p of due) {
      this.spawn(p.kind, { id: p.id, name: p.name, coat: p.coat, owner: p.owner });
      if (p.kind === 'buddy') {
        const agent = this.agent(p.id)!;
        const seat = pickFreeSeat(this.ctx.host.map.deskSeats, takenSeats(this.ctx, p.id));
        if (seat) sitAt(agent.npc, agent.brain, seat);
      }
      const article = /^[aeiou]/i.test(p.label) ? 'an' : 'a';
      this.ctx.host.note(
        p.owner ? `✨ ${p.owner.name}’s cat ${p.name} came to visit!` : `✨ ${p.byName} summoned ${article} ${p.label}, ${p.name}!`,
      );
      this.ctx.host.react(p.id, '✨');
    }
  }
}
