import {
  BUDDY_CHEER_LINES, BUDDY_GREET_LINES, BUDDY_IDLE_LINES, BUDDY_NAMES, BUDDY_SUBJECTS, BUDDY_YIELD_LINES, CAT_NAMES,
  CAT_PET_LINES, CAT_WAKE_LINES, COAT_BY_ID, DEFAULT_CAT_SETTINGS, GACHA_MACHINE, GOODBYE_LINES, NAP_SPOTS, NOOK,
  NPC_LIMITS, NPC_NAME_MAX, NPC_REACH, NPC_SPAWN, SEATS, SEAT_BY_ID, SPIN_COOLDOWN_MS, SPIN_REVEAL_MS, SUBJECT_MAX,
  defaultBuddySettings, findPath, nearestWalkable, pickRandom, randomLook, randomWalkable, resolveCollisions, rollCoat,
  type BuddySettings, type CatSettings, type GachaSpun, type NpcKind, type Point,
} from '@study/shared';
import { Npc, type Player, type StudyState } from '../state';

/** What the director needs from its room. */
export interface NpcHost {
  state: StudyState;
  /** A speech bubble above an NPC. */
  say(npcId: string, text: string): void;
  /** A floating emote (e.g. hearts when petted). */
  react(npcId: string, emote: string): void;
  /** A system line in the room chat. */
  announce(text: string): void;
  spun(event: GachaSpun): void;
}

const SPEED = { cat: 0.9, catFollow: 2.1, buddy: 1.9 } as const;
const RADIUS = { cat: 0.22, buddy: 0.3 } as const;
const MINUTE = 60_000;

const rand = Math.random;
const between = (a: number, b: number) => a + rand() * (b - a);

/** Server-only behaviour state for one NPC. */
interface Brain {
  kind: NpcKind;
  state: 'idle' | 'walk' | 'nap' | 'follow' | 'toSeat' | 'seated' | 'stretch' | 'leaving';
  path: Point[];
  until: number;
  /** What to do on arrival. */
  arrive?: () => void;
  followId?: string;
  stuckFor: number;
  repaths: number;
  lastSay: number;
  // Study buddy
  phase: 'focus' | 'break';
  phaseEndsAt: number;
  cheerAt: number;
  greetAt: number;
}

interface PendingSpin {
  id: string;
  kind: NpcKind;
  name: string;
  coat?: string;
  revealAt: number;
  byName: string;
}

export class NpcDirector {
  private brains = new Map<string, Brain>();
  private pending: PendingSpin[] = [];
  private spinAt = new Map<string, number>();
  private nextId = 1;

  constructor(private host: NpcHost) {}

  private get npcs() {
    return this.host.state.npcs;
  }

  private count(kind?: NpcKind) {
    let n = this.pending.filter((p) => !kind || p.kind === kind).length;
    this.npcs.forEach((npc) => {
      if (!kind || npc.kind === kind) n++;
    });
    return n;
  }

  // ---------- summoning ----------

  /** Spin the Buddy Machine. Returns an error message, or null on success. */
  spin(sessionId: string, player: Player, kind: NpcKind): string | null {
    if (Math.hypot(player.x - GACHA_MACHINE.x, player.z - GACHA_MACHINE.z) > GACHA_MACHINE.reach + 0.6) return 'Walk up to the machine first';
    const now = Date.now();
    if (now - (this.spinAt.get(sessionId) ?? 0) < SPIN_COOLDOWN_MS) return 'The machine is still cooling down';
    if (this.count() >= NPC_LIMITS.total) return 'The room is full of friends already';
    if (this.count(kind) >= NPC_LIMITS[kind]) return kind === 'cat' ? 'That’s plenty of cats for one room' : 'Enough study buddies for now';
    this.spinAt.set(sessionId, now);

    const id = `n${this.nextId++}`;
    const coat = kind === 'cat' ? rollCoat() : undefined;
    const name = this.freshName(kind);
    this.pending.push({ id, kind, name, coat: coat?.id, revealAt: now + SPIN_REVEAL_MS, byName: player.name });
    this.host.spun({
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
    this.brains.set(id, {
      kind, state: 'idle', path: [], until: Date.now() + between(800, 2000), stuckFor: 0, repaths: 0, lastSay: 0,
      phase: 'focus', phaseEndsAt: 0, cheerAt: 0, greetAt: Date.now() + 5000,
    });
    return id;
  }

  private freshName(kind: NpcKind) {
    const taken = new Set<string>();
    this.npcs.forEach((n) => taken.add(n.name));
    this.pending.forEach((p) => taken.add(p.name));
    const pool = (kind === 'cat' ? CAT_NAMES : BUDDY_NAMES).filter((n) => !taken.has(n));
    return pool.length ? pickRandom(pool) : `${kind === 'cat' ? 'Kitty' : 'Buddy'} ${this.nextId}`;
  }

  // ---------- editing ----------

  update(id: string, patch: { name?: string; settings?: Record<string, unknown> }, byName: string): string | null {
    const npc = this.npcs.get(id);
    if (!npc) return 'That friend has left';
    if (typeof patch.name === 'string') {
      const name = patch.name.trim().slice(0, NPC_NAME_MAX);
      if (name && name !== npc.name) {
        this.host.announce(`✏️ ${byName} renamed ${npc.name} to ${name}`);
        npc.name = name;
      }
    }
    if (patch.settings && typeof patch.settings === 'object') {
      const s = patch.settings;
      if (npc.kind === 'cat') {
        const next: CatSettings = { roam: typeof s.roam === 'boolean' ? s.roam : (JSON.parse(npc.settings) as CatSettings).roam };
        npc.settings = JSON.stringify(next);
        const brain = this.brains.get(id);
        if (brain && !next.roam && brain.state !== 'nap') this.decideCat(id, npc, brain, true);
      } else {
        const cur = JSON.parse(npc.settings) as BuddySettings;
        const next: BuddySettings = {
          chatty: typeof s.chatty === 'boolean' ? s.chatty : cur.chatty,
          subject: typeof s.subject === 'string' ? s.subject.trim().slice(0, SUBJECT_MAX) || cur.subject : cur.subject,
          focusMin: s.focusMin === 50 ? 50 : s.focusMin === 25 ? 25 : cur.focusMin,
        };
        npc.settings = JSON.stringify(next);
        npc.subject = next.subject;
      }
    }
    return null;
  }

  /** Say goodbye: the NPC walks back into the machine and disappears. */
  remove(id: string, byName: string) {
    const npc = this.npcs.get(id);
    const brain = this.brains.get(id);
    if (!npc || !brain || brain.state === 'leaving') return;
    this.host.say(id, pickRandom(GOODBYE_LINES));
    this.host.announce(`👋 ${byName} said goodbye to ${npc.name}`);
    this.standUp(npc);
    npc.y = 0;
    npc.status = 'idle';
    npc.focusSince = 0;
    brain.state = 'leaving';
    this.walk(npc, brain, NPC_SPAWN, () => {
      this.npcs.delete(id);
      this.brains.delete(id);
    });
  }

  // ---------- interactions ----------

  pet(player: Player, id: string) {
    const npc = this.npcs.get(id);
    const brain = this.brains.get(id);
    if (!npc || !brain || npc.kind !== 'cat' || brain.state === 'leaving') return;
    if (Math.hypot(npc.x - player.x, npc.z - player.z) > NPC_REACH + 0.4) return;
    const wasNapping = brain.state === 'nap';
    this.host.react(id, '❤️');
    this.host.say(id, wasNapping ? pickRandom(CAT_WAKE_LINES) : pickRandom(CAT_PET_LINES));
    if (wasNapping) this.leaveNap(npc);
    // Tag along with whoever gave the head pats for a little while
    const followId = [...this.host.state.players.entries()].find(([, p]) => p === player)?.[0];
    brain.state = 'follow';
    brain.followId = followId;
    brain.until = Date.now() + 20_000;
    brain.path = [];
    npc.anim = 'idle';
  }

  talk(player: Player, id: string) {
    const npc = this.npcs.get(id);
    const brain = this.brains.get(id);
    if (!npc || !brain || npc.kind !== 'buddy') return;
    if (Math.hypot(npc.x - player.x, npc.z - player.z) > NPC_REACH + 0.6) return;
    const now = Date.now();
    let line = pickRandom(BUDDY_IDLE_LINES);
    if (npc.status === 'focus' && npc.focusSince) {
      line = `${Math.floor((now - npc.focusSince) / MINUTE)} min into ${npc.subject}! You got this ✨`;
    } else if (npc.status === 'break') {
      line = `Stretch break 🙆 back in ${Math.max(1, Math.ceil((npc.statusEndsAt - now) / MINUTE))} min`;
    }
    this.host.say(id, line);
    brain.lastSay = now;
  }

  /** A player wants this seat: a buddy sitting there moves somewhere else. Returns true if freed. */
  yieldSeat(seatId: string): boolean {
    for (const [id, npc] of this.npcs) {
      if (npc.seatId !== seatId) continue;
      const brain = this.brains.get(id)!;
      this.host.say(id, pickRandom(BUDDY_YIELD_LINES));
      this.standUp(npc);
      this.goSit(id, npc, brain);
      return true;
    }
    return false;
  }

  seatTakenByNpc(seatId: string) {
    for (const npc of this.npcs.values()) if (npc.seatId === seatId) return true;
    return false;
  }

  onPlayerFocusEnded(player: Player, minutes: number) {
    if (minutes < 1) return;
    const now = Date.now();
    for (const [id, npc] of this.npcs) {
      const brain = this.brains.get(id)!;
      if (npc.kind !== 'buddy' || now < brain.cheerAt || brain.state === 'leaving') continue;
      const sameTable = npc.seatId && player.seatId && SEAT_BY_ID.get(npc.seatId)?.tableId === SEAT_BY_ID.get(player.seatId)?.tableId;
      if (!sameTable && Math.hypot(npc.x - player.x, npc.z - player.z) > 4.5) continue;
      this.host.say(id, pickRandom(BUDDY_CHEER_LINES)(player.name, Math.round(minutes)));
      brain.cheerAt = now + MINUTE;
    }
  }

  onPlayerJoined(player: Player) {
    if (this.host.state.players.size > 3) return;
    const now = Date.now();
    for (const [id, npc] of this.npcs) {
      const brain = this.brains.get(id)!;
      if (npc.kind !== 'buddy' || now < brain.greetAt || !(JSON.parse(npc.settings) as BuddySettings).chatty) continue;
      brain.greetAt = now + 45_000;
      setTimeout(() => this.npcs.has(id) && this.host.say(id, pickRandom(BUDDY_GREET_LINES)(player.name)), 2500);
      break; // one greeting is plenty
    }
  }

  // ---------- simulation ----------

  tick(dt: number) {
    const now = Date.now();
    for (const p of this.pending.filter((s) => s.revealAt <= now)) {
      this.pending.splice(this.pending.indexOf(p), 1);
      this.spawn(p.kind, { id: p.id, name: p.name, coat: p.coat });
      const npc = this.npcs.get(p.id)!;
      const label = p.kind === 'cat' ? `${COAT_BY_ID.get(p.coat!)?.label.toLowerCase() ?? ''} cat` : 'study buddy';
      const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
      this.host.announce(`🎰 ${p.byName} summoned ${article} ${label}, ${npc.name}!`);
      this.host.react(p.id, p.kind === 'cat' && COAT_BY_ID.get(p.coat!)?.rare ? '🌟' : '✨');
    }

    for (const [id, npc] of this.npcs) {
      const brain = this.brains.get(id);
      if (!brain) continue;
      if (npc.kind === 'cat') this.tickCat(id, npc, brain, now);
      else this.tickBuddy(id, npc, brain, now);
      this.step(npc, brain, dt);
    }
  }

  private tickCat(id: string, npc: Npc, brain: Brain, now: number) {
    if (brain.state === 'follow') {
      const target = brain.followId ? this.host.state.players.get(brain.followId) : undefined;
      if (!target || now > brain.until) return this.decideCat(id, npc, brain);
      const d = Math.hypot(target.x - npc.x, target.z - npc.z);
      if (d > 1.1 && (brain.path.length === 0 || now % 1000 < 100)) brain.path = findPath(npc, { x: target.x, z: target.z });
      if (d <= 1.1) brain.path = [];
      return;
    }
    if ((brain.state === 'idle' || brain.state === 'nap') && now > brain.until) {
      if (brain.state === 'nap') this.leaveNap(npc);
      this.decideCat(id, npc, brain);
    }
  }

  private decideCat(id: string, npc: Npc, brain: Brain, forceWander = false) {
    const settings = JSON.parse(npc.settings) as CatSettings;
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }).format(new Date()));
    const sleepy = hour >= 21 || hour < 6;
    const roll = rand();
    brain.followId = undefined;
    if (!forceWander && roll < (sleepy ? 0.5 : 0.25)) {
      // Nap somewhere cosy (only nook spots when told to stay there)
      const spots = settings.roam ? NAP_SPOTS : NAP_SPOTS.slice(0, 3);
      const spot = pickRandom(spots);
      this.walk(npc, brain, nearestWalkable(spot), () => {
        npc.x = spot.x;
        npc.z = spot.z;
        npc.y = spot.y;
        npc.anim = 'nap';
        brain.state = 'nap';
        brain.until = Date.now() + between(sleepy ? 30_000 : 15_000, sleepy ? 70_000 : 40_000);
      });
    } else if (forceWander || roll < 0.8) {
      const target = randomWalkable(rand, settings.roam ? undefined : NOOK);
      this.walk(npc, brain, target, () => this.idle(npc, brain, rand() < 0.4 ? 'groom' : 'idle', between(3000, 8000)));
    } else {
      this.idle(npc, brain, 'groom', between(3000, 7000));
    }
  }

  private leaveNap(npc: Npc) {
    const ground = nearestWalkable(npc);
    npc.x = ground.x;
    npc.z = ground.z;
    npc.y = 0;
    npc.anim = 'idle';
  }

  private tickBuddy(id: string, npc: Npc, brain: Brain, now: number) {
    const settings = JSON.parse(npc.settings) as BuddySettings;
    if (brain.state === 'leaving' || brain.state === 'walk' || brain.state === 'toSeat') return;

    if (brain.state === 'idle' && now > brain.until) return this.goSit(id, npc, brain);

    if (brain.state === 'seated' && now > brain.phaseEndsAt) {
      // Focus done: stand up and stretch somewhere
      brain.phase = 'break';
      brain.phaseEndsAt = now + (settings.focusMin === 50 ? 10 : 5) * MINUTE;
      this.setStatus(npc, 'break', brain.phaseEndsAt);
      this.standUp(npc);
      const spot = randomWalkable(rand, { minX: -9, maxX: 9, minZ: -5.8, maxZ: -4.2 });
      this.walk(npc, brain, spot, () => {
        brain.state = 'stretch';
        npc.anim = 'stretch';
      });
      return;
    }

    if (brain.state === 'stretch' && now > brain.phaseEndsAt) {
      brain.phase = 'focus';
      brain.phaseEndsAt = 0;
      this.goSit(id, npc, brain);
      return;
    }

    if (brain.state === 'stretch' && settings.chatty && now - brain.lastSay > 90_000 && rand() < 0.01) {
      this.host.say(id, pickRandom(BUDDY_IDLE_LINES));
      brain.lastSay = now;
    }
  }

  /** Walk to a free seat (preferring tables with people) and start focusing. */
  private goSit(id: string, npc: Npc, brain: Brain) {
    const taken = new Set<string>();
    this.host.state.players.forEach((p) => p.seatId && taken.add(p.seatId));
    this.npcs.forEach((n, nid) => nid !== id && n.seatId && taken.add(n.seatId));
    const busyTables = new Set([...taken].map((s) => SEAT_BY_ID.get(s)?.tableId));
    const free = SEATS.filter((s) => !taken.has(s.id));
    if (!free.length) return this.idle(npc, brain, 'idle', 10_000);
    const social = free.filter((s) => busyTables.has(s.tableId));
    const seat = pickRandom(social.length && rand() < 0.65 ? social : free);
    brain.state = 'toSeat';
    this.walk(npc, brain, seat, () => {
      // Someone may have sat down while we walked over
      const now = Date.now();
      const stillFree = ![...this.host.state.players.values()].some((p) => p.seatId === seat.id) && !this.seatTakenByNpc(seat.id);
      if (!stillFree) return this.goSit(id, npc, brain);
      npc.seatId = seat.id;
      npc.x = seat.x;
      npc.z = seat.z;
      npc.yaw = seat.yaw;
      npc.anim = 'sit';
      brain.state = 'seated';
      if (!brain.phaseEndsAt || brain.phase !== 'focus') {
        const settings = JSON.parse(npc.settings) as BuddySettings;
        brain.phase = 'focus';
        brain.phaseEndsAt = now + settings.focusMin * MINUTE;
      }
      this.setStatus(npc, 'focus', brain.phaseEndsAt);
    });
  }

  private standUp(npc: Npc) {
    if (!npc.seatId) return;
    const seat = SEAT_BY_ID.get(npc.seatId);
    npc.seatId = '';
    npc.anim = 'idle';
    if (seat) {
      // Step back from the table into the aisle
      const back = nearestWalkable({ x: seat.x - Math.sin(seat.yaw) * 0.5, z: seat.z - Math.cos(seat.yaw) * 0.5 });
      npc.x = back.x;
      npc.z = back.z;
    }
  }

  private setStatus(npc: Npc, status: 'focus' | 'break' | 'idle', endsAt: number) {
    if (status === 'focus' && npc.status !== 'focus') npc.focusSince = Date.now();
    if (status !== 'focus') npc.focusSince = 0;
    npc.status = status;
    npc.statusEndsAt = endsAt;
  }

  private idle(npc: Npc, brain: Brain, anim: string, ms: number) {
    brain.state = 'idle';
    brain.path = [];
    brain.until = Date.now() + ms;
    npc.anim = anim;
    npc.moving = false;
  }

  private walk(npc: Npc, brain: Brain, to: Point, arrive: () => void) {
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

  /** Move along the current path, sliding off people and furniture. */
  private step(npc: Npc, brain: Brain, dt: number) {
    const waypoint = brain.path[0];
    if (!waypoint) {
      if (npc.moving) npc.moving = false;
      if (brain.state === 'follow' && npc.anim !== 'idle') npc.anim = 'idle';
      return;
    }
    const kind = npc.kind as NpcKind;
    const speed = brain.state === 'follow' ? SPEED.catFollow : SPEED[kind];
    const dx = waypoint.x - npc.x;
    const dz = waypoint.z - npc.z;
    const d = Math.hypot(dx, dz);
    const stepLen = speed * dt;
    const before = { x: npc.x, z: npc.z };
    const next = d <= stepLen ? { x: waypoint.x, z: waypoint.z } : { x: npc.x + (dx / d) * stepLen, z: npc.z + (dz / d) * stepLen };
    if (d <= stepLen) brain.path.shift();

    const others: { x: number; z: number; r: number }[] = [];
    this.host.state.players.forEach((p) => others.push({ x: p.x, z: p.z, r: 0.3 }));
    this.npcs.forEach((o) => o !== npc && others.push({ x: o.x, z: o.z, r: RADIUS[o.kind as NpcKind] }));
    // Arriving at a seat or nap spot means getting close to furniture: only push out of people then
    const nearGoal = brain.path.length <= 1 && d < 0.8;
    if (!nearGoal) resolveCollisions(next, others, RADIUS[kind]);

    npc.x = next.x;
    npc.z = next.z;
    npc.moving = true;
    if (npc.anim !== 'walk') npc.anim = 'walk';
    if (d > 0.01) npc.yaw = Math.atan2(dx, dz);

    // Stuck behind someone? Try a fresh route, then give up gracefully.
    const moved = Math.hypot(npc.x - before.x, npc.z - before.z);
    brain.stuckFor = moved < stepLen * 0.2 ? brain.stuckFor + dt : 0;
    if (brain.stuckFor > 1.5) {
      brain.stuckFor = 0;
      const goal = brain.path[brain.path.length - 1];
      if (goal && brain.repaths++ < 3) brain.path = findPath(npc, goal);
      else brain.path = [];
    }

    if (!brain.path.length && brain.state !== 'follow') {
      npc.moving = false;
      const arrive = brain.arrive;
      brain.arrive = undefined;
      arrive?.();
    }
  }
}
