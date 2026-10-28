import {
  BUDDY_NAMES,
  BUDDY_SUBJECTS,
  BUDDY_YIELD_LINES,
  CAT_NAMES,
  COAT_BY_ID,
  DEFAULT_CAT_SETTINGS,
  GACHA_MACHINE,
  GOODBYE_LINES,
  NPC_LIMITS,
  NPC_NAME_MAX,
  NPC_REACH,
  NPC_SPAWN,
  SPIN_COOLDOWN_MS,
  SPIN_REVEAL_MS,
  SUBJECT_MAX,
  defaultBuddySettings,
  pickRandom,
  randomLook,
  rollCoat,
  type BuddySettings,
  type CatSettings,
  type NpcKind,
  type Point,
} from '@study/shared';
import { Npc, type Player } from '../state';
import { buddyStatusLine, cheer, goSit, greet, setStatus, standUp, tickBuddy } from './buddy';
import { decideCat, petCat, tickCat } from './cat';
import { step, walk } from './motion';
import { between, readSettings, type Agent, type Brain, type NpcContext, type NpcHost } from './types';

export type { NpcHost } from './types';

/** Extra slack on top of the hint radius, so a request sent while walking away still counts. */
const MACHINE_SLACK = 0.6;
const PET_SLACK = 0.4;
const TALK_SLACK = 0.6;

/** A spin whose NPC appears once the capsule animation has played. */
interface PendingSpin {
  id: string;
  kind: NpcKind;
  name: string;
  coat?: string;
  revealAt: number;
  byName: string;
}

/**
 * Owns the room's NPCs: the Buddy Machine (spins, limits, cooldowns), edits
 * from anyone in the room, and the 10 Hz simulation. Behaviour lives in
 * cat.ts / buddy.ts, movement in motion.ts.
 */
export class NpcDirector {
  private readonly ctx: NpcContext;
  private pending: PendingSpin[] = [];
  private spinAt = new Map<string, number>();
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
    for (const id of this.npcs.keys()) {
      const a = this.agent(id);
      if (a) yield a;
    }
  }

  /** NPCs in the room plus capsules still rolling out. */
  private count(kind?: NpcKind) {
    let n = this.pending.filter((p) => !kind || p.kind === kind).length;
    for (const npc of this.npcs.values()) if (!kind || npc.kind === kind) n++;
    return n;
  }

  // ---------- summoning ----------

  /** Spin the Buddy Machine. Returns an error message, or null on success. */
  spin(sessionId: string, player: Player, kind: NpcKind): string | null {
    if (Math.hypot(player.x - GACHA_MACHINE.x, player.z - GACHA_MACHINE.z) > GACHA_MACHINE.reach + MACHINE_SLACK)
      return 'Walk up to the machine first';
    const now = Date.now();
    if (now - (this.spinAt.get(sessionId) ?? 0) < SPIN_COOLDOWN_MS) return 'The machine is still cooling down';
    if (this.count() >= NPC_LIMITS.total) return 'The room is full of friends already';
    if (this.count(kind) >= NPC_LIMITS[kind]) return kind === 'cat' ? 'That’s plenty of cats for one room' : 'Enough study buddies for now';
    this.spinAt.set(sessionId, now);

    const id = `n${this.nextId++}`;
    const coat = kind === 'cat' ? rollCoat() : undefined;
    const name = this.freshName(kind);
    this.pending.push({ id, kind, name, coat: coat?.id, revealAt: now + SPIN_REVEAL_MS, byName: player.name });
    this.ctx.host.spun({
      npcId: id,
      kind,
      name,
      label: coat ? `${coat.label} cat` : 'study buddy',
      rare: !!coat?.rare,
      bySessionId: sessionId,
      byName: player.name,
    });
    return null;
  }

  /** Put an NPC in the room right away (starter cat, or a revealed spin). */
  spawn(kind: NpcKind, opts: { id?: string; name?: string; coat?: string; at?: Point } = {}) {
    const id = opts.id ?? `n${this.nextId++}`;
    const npc = new Npc();
    npc.kind = kind;
    npc.name = opts.name ?? this.freshName(kind);
    const at = opts.at ?? NPC_SPAWN;
    npc.x = at.x;
    npc.z = at.z;
    npc.yaw = 0;
    npc.moving = false;
    if (kind === 'cat') {
      npc.look = JSON.stringify({ coat: opts.coat ?? rollCoat().id });
      npc.settings = JSON.stringify(DEFAULT_CAT_SETTINGS);
    } else {
      npc.look = JSON.stringify(randomLook());
      const settings = defaultBuddySettings(pickRandom(BUDDY_SUBJECTS));
      npc.settings = JSON.stringify(settings);
      npc.subject = settings.subject;
    }
    this.npcs.set(id, npc);
    const brain: Brain = {
      kind,
      state: 'idle',
      path: [],
      until: Date.now() + between(800, 2000),
      stuckFor: 0,
      repaths: 0,
      lastSay: 0,
      phase: 'focus',
      phaseEndsAt: 0,
      cheerAt: 0,
      greetAt: Date.now() + 5000,
    };
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

  // ---------- editing (anyone in the room) ----------

  /** Rename and/or change settings. Unknown or invalid fields are ignored. */
  update(id: string, patch: { name?: string; settings?: Record<string, unknown> }, byName: string): string | null {
    const agent = this.agent(id);
    if (!agent) return 'That friend has left';
    const { npc } = agent;
    if (typeof patch.name === 'string') {
      const name = patch.name.trim().slice(0, NPC_NAME_MAX);
      if (name && name !== npc.name) {
        this.ctx.host.announce(`✏️ ${byName} renamed ${npc.name} to ${name}`);
        npc.name = name;
      }
    }
    if (patch.settings && typeof patch.settings === 'object') {
      if (npc.kind === 'cat') this.updateCat(agent, patch.settings);
      else this.updateBuddy(npc, patch.settings);
    }
    return null;
  }

  private updateCat(agent: Agent, s: Record<string, unknown>) {
    const next: CatSettings = { roam: typeof s.roam === 'boolean' ? s.roam : readSettings<CatSettings>(agent.npc).roam };
    agent.npc.settings = JSON.stringify(next);
    // Told to stay in the nook: head there now rather than after the current errand
    if (!next.roam && agent.brain.state !== 'nap') decideCat(agent, true);
  }

  private updateBuddy(npc: Npc, s: Record<string, unknown>) {
    const cur = readSettings<BuddySettings>(npc);
    const next: BuddySettings = {
      chatty: typeof s.chatty === 'boolean' ? s.chatty : cur.chatty,
      subject: typeof s.subject === 'string' ? s.subject.trim().slice(0, SUBJECT_MAX) || cur.subject : cur.subject,
      focusMin: s.focusMin === 50 ? 50 : s.focusMin === 25 ? 25 : cur.focusMin,
    };
    npc.settings = JSON.stringify(next);
    npc.subject = next.subject;
  }

  /** Say goodbye: the NPC walks back into the machine and disappears. */
  remove(id: string, byName: string) {
    const agent = this.agent(id);
    if (!agent || agent.brain.state === 'leaving') return;
    const { npc, brain } = agent;
    this.ctx.host.say(id, pickRandom(GOODBYE_LINES));
    this.ctx.host.announce(`👋 ${byName} said goodbye to ${npc.name}`);
    standUp(npc);
    npc.y = 0;
    setStatus(npc, 'idle', 0);
    brain.state = 'leaving';
    walk(npc, brain, NPC_SPAWN, () => {
      this.npcs.delete(id);
      this.ctx.brains.delete(id);
    });
  }

  // ---------- interactions ----------

  pet(sessionId: string, player: Player, id: string) {
    const agent = this.agent(id);
    if (!agent || agent.npc.kind !== 'cat' || agent.brain.state === 'leaving') return;
    if (Math.hypot(agent.npc.x - player.x, agent.npc.z - player.z) > NPC_REACH + PET_SLACK) return;
    petCat(this.ctx, agent, sessionId);
  }

  talk(player: Player, id: string) {
    const agent = this.agent(id);
    if (!agent || agent.npc.kind !== 'buddy') return;
    if (Math.hypot(agent.npc.x - player.x, agent.npc.z - player.z) > NPC_REACH + TALK_SLACK) return;
    const now = Date.now();
    this.ctx.host.say(id, buddyStatusLine(agent.npc, now));
    agent.brain.lastSay = now;
  }

  /** A player wants this seat: a buddy sitting there moves somewhere else. Returns true if freed. */
  yieldSeat(seatId: string): boolean {
    for (const agent of this.agents()) {
      if (agent.npc.seatId !== seatId) continue;
      this.ctx.host.say(agent.id, pickRandom(BUDDY_YIELD_LINES));
      standUp(agent.npc);
      goSit(this.ctx, agent);
      return true;
    }
    return false;
  }

  seatTakenByNpc(seatId: string) {
    for (const npc of this.npcs.values()) if (npc.seatId === seatId) return true;
    return false;
  }

  onPlayerFocusEnded(player: Player, minutes: number) {
    if (minutes >= 1) cheer(this.ctx, this.agents(), player, minutes);
  }

  onPlayerJoined(player: Player) {
    greet(this.ctx, this.agents(), player);
  }

  // ---------- simulation ----------

  tick(dt: number) {
    const now = Date.now();
    this.revealDueSpins(now);
    for (const agent of this.agents()) {
      if (agent.npc.kind === 'cat') tickCat(this.ctx, agent, now);
      else tickBuddy(this.ctx, agent, now);
      step(this.ctx, agent, dt);
    }
  }

  private revealDueSpins(now: number) {
    const due = this.pending.filter((s) => s.revealAt <= now);
    if (!due.length) return;
    this.pending = this.pending.filter((s) => s.revealAt > now);
    for (const p of due) {
      this.spawn(p.kind, { id: p.id, name: p.name, coat: p.coat });
      const coat = p.coat ? COAT_BY_ID.get(p.coat) : undefined;
      const label = p.kind === 'cat' ? `${coat?.label.toLowerCase() ?? ''} cat` : 'study buddy';
      const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
      this.ctx.host.announce(`🎰 ${p.byName} summoned ${article} ${label}, ${p.name}!`);
      this.ctx.host.react(p.id, coat?.rare ? '🌟' : '✨');
    }
  }
}
