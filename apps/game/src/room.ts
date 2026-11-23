import { Room, ServerError, validate, type Client } from 'colyseus';
import { z } from 'zod';
import {
  BUBBLE_MAX,
  DEFAULT_LOOK,
  GAME_CLOSE,
  LOOK_EVERY_MS,
  PATCH_RATE_MS,
  PLAYER_STATUSES,
  RECONNECT_SECONDS,
  SAY_COOLDOWN_MS,
  SIT_REACH,
  SUBJECT_MAX,
  TYPING_TIMEOUT_MS,
  NPC_KINDS,
  sanitizeLook,
  type NpcNote,
  type NpcReact,
  type NpcRefused,
  type NpcSummoned,
  type Quiet,
  type Said,
  type GameJoinOptions,
  type GameRoomEvent,
  type GameTicket,
  type PlayerRole,
} from '@connecta/shared';
import { inArea, mapDataFor, zoneAtIn, type MapData } from '@connecta/shared/maps';
import { links, liveRooms } from './links.js';
import { log } from './log.js';
import { NpcDirector } from './npc/director.js';
import { Player, RoomState } from './state.js';
import { clamp, refillMoveBudget, spendMove } from './rules.js';
import { readTicket } from './ticket.js';
import { voice } from './voice.js';

/** Set by the entry point from GAME_SECRET. */
export const secrets = { ticket: '' };

/** Matchmaking keeps rooms apart by `place`, the Connecta room id (see GameJoinOptions). */
type JoinOptions = GameJoinOptions;

/** The cats and study buddies move ten times a second */
const NPC_TICK_MS = 100;

/** Owners and mods always fit (spec 01: "the owner and mods always fit"), so the hard cap sits well above capacity. */
const HARD_CAP = 250;

const finite = z.number().refine(Number.isFinite);

/** Server-only bookkeeping per connection (not synced). */
interface Private {
  userId: string;
  lastMoveAt: number;
  /** Metres of movement allowed right now (see refillMoveBudget) */
  moveBudget: number;
  lastSaidAt: number;
  typingAt: number;
  lookAt: number;
  /** Timed out until then (epoch ms): no bubbles, no typing */
  quietUntil: number;
}

type Auth = GameTicket;

/**
 * A Connecta room in 3D (build step 4, docs/v2/features/06-3d-room.md). Who may come in is decided by
 * the API, which signs a join ticket; this checks the ticket, the capacity, and the movement rules.
 */
export class ConnectaRoom extends Room<{ state: RoomState }> {
  maxClients = HARD_CAP;
  patchRate = PATCH_RATE_MS;
  autoDispose = true;
  state = new RoomState();

  private connectaId = '';
  private capacity = 0;
  private map: MapData = mapDataFor('library');
  private priv = new Map<string, Private>();
  private clients_ = new Map<string, Client>();
  /** Full when someone was turned away; the next leave tells the waiting list */
  private turnedAway = false;
  /** Room settings → Guests can use voice (the newest ticket, then live changes) */
  private guestVoice = false;
  /** Muted for everyone, by account, so walking out and back in doesn't lift it; gone when the room empties */
  private muted = new Set<string>();
  /** The cats and study buddies (part 5): in memory, so they reset when the room empties */
  private npc = this.makeNpcs();

  messages = {
    move: validate(
      z.object({ x: finite, z: finite, yaw: finite, moving: z.boolean(), seq: z.number().int().nonnegative().optional() }),
      (client, msg) => {
        const p = this.state.players.get(client.sessionId);
        const s = this.priv.get(client.sessionId);
        if (!p || !s) return;
        if (p.seatId) p.seatId = ''; // moving stands you up

        const now = Date.now();
        s.moveBudget = refillMoveBudget(s.moveBudget, (now - s.lastMoveAt) / 1000);
        s.lastMoveAt = now;
        const next = spendMove(p, msg, s.moveBudget, this.map.bounds);
        s.moveBudget = next.budget;
        p.x = next.x;
        p.z = next.z;
        if (msg.seq !== undefined) p.moveSeq = msg.seq;
        p.yaw = msg.yaw;
        p.moving = msg.moving;
        this.checkShare(p);
      },
    ),

    sit: validate(z.object({ seatId: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const seat = this.map.seatById.get(msg.seatId);
      if (!p || !seat) return;
      if (Math.hypot(seat.x - p.x, seat.z - p.z) > SIT_REACH) return;
      for (const other of this.state.players.values()) if (other !== p && other.seatId === seat.id) return; // taken
      // A study buddy there gives the seat up for a person
      this.npc.yieldSeat(seat.id);
      p.seatId = seat.id;
      p.x = seat.x;
      p.z = seat.z;
      p.yaw = seat.yaw;
      p.moving = false;
      this.checkShare(p);
    }),

    stand: (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (p?.seatId) this.standUp(p);
      if (p) this.checkShare(p);
    },

    /**
     * A screen share (feature 10): on the TV while you stand on its rug, or to your table while you
     * sit at a desk. One at a time in each place; it ends when you leave it. The picture and sound go
     * over LiveKit; each sharer's client lets only this audience receive them.
     */
    share: validate(z.object({ where: z.enum(['tv', 'table', '']), audio: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (!msg.where) return void Object.assign(p, { share: '', shareAudio: false });
      if (p.hushed) return;
      const seat = this.map.seatById.get(p.seatId);
      const where =
        msg.where === 'tv' ? (inArea(this.map.tvArea, p.x, p.z) ? 'tv' : '') : seat && seat.kind !== 'sofa' ? `table:${seat.tableId}` : '';
      if (!where) return;
      for (const other of this.state.players.values()) if (other !== p && other.share === where) return; // someone's on
      p.share = where;
      p.shareAudio = msg.audio;
    }),

    /** A bubble: to the whole room, or only to the private zone you're standing in */
    say: validate(z.object({ text: z.string() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      const text = msg.text.trim().slice(0, BUBBLE_MAX);
      if (!p || !s || !text) return;
      const now = Date.now();
      if (s.quietUntil > now) return void client.send('quiet', { until: s.quietUntil } satisfies Quiet);
      if (now - s.lastSaidAt < SAY_COOLDOWN_MS) return;
      s.lastSaidAt = now;
      p.typing = false;
      const said: Said = { id: client.sessionId, text };
      // Talk to everyone reaches into private zones too
      const zone = p.stage ? undefined : zoneAtIn(this.map, p.x, p.z);
      if (!zone) return void this.broadcast('said', said);
      for (const [sessionId, c] of this.clients_) {
        const o = this.state.players.get(sessionId);
        if (o && zoneAtIn(this.map, o.x, o.z)?.id === zone.id) c.send('said', said);
      }
    }),

    typing: validate(z.object({ typing: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s || (msg.typing && s.quietUntil > Date.now())) return;
      p.typing = msg.typing;
      s.typingAt = Date.now();
    }),

    /** Focus, break, away or nothing, decided by the client (a timer, no input for 10 minutes) */
    status: validate(
      z.object({ status: z.enum(PLAYER_STATUSES), subject: z.string().optional(), endsAt: finite.optional() }),
      (client, msg) => {
        const p = this.state.players.get(client.sessionId);
        if (!p) return;
        // A focus round ended: study buddies nearby cheer
        if (p.status === 'focus' && msg.status !== 'focus' && p.focusSince) this.npc.focusEnded(p, (Date.now() - p.focusSince) / 60_000);
        if (msg.status === 'focus' && p.status !== 'focus') p.focusSince = Date.now();
        if (msg.status !== 'focus') p.focusSince = 0;
        p.status = msg.status;
        p.subject = (msg.subject ?? '').trim().slice(0, SUBJECT_MAX);
        p.statusEndsAt = msg.endsAt && msg.endsAt > Date.now() ? msg.endsAt : 0;
        if (msg.status === 'away') {
          p.stage = false;
          // A forgotten tab shouldn't broadcast the room: the mic goes off in LiveKit too
          voice.current?.muteMic(this.connectaId, client.sessionId);
        }
      },
    ),

    /** A pass to the room's voice, listening only when you can't talk */
    voice: async (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !voice.current) return;
      client.send('voice', await voice.current.pass(this.connectaId, client.sessionId, p.name, !p.hushed));
    },

    /** Deafened: shown by your name (hearing nobody is up to your own client) */
    deaf: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.deaf = msg.on;
    }),

    /** Mute for everyone: the owner on anyone, a mod on members and guests; lasts until lifted or the room empties */
    mute: validate(z.object({ id: z.string().max(64), on: z.boolean() }), (client, msg) => {
      const actor = this.state.players.get(client.sessionId);
      const target = this.state.players.get(msg.id);
      if (!actor || !target || target === actor) return;
      const canAct =
        actor.role === 'owner'
          ? target.role !== 'owner'
          : actor.role === 'mod'
            ? target.role === 'member' || target.role === 'guest'
            : false;
      if (!canAct) return;
      if (msg.on) this.muted.add(target.userId);
      else this.muted.delete(target.userId);
      for (const sessionId of this.sessionsOf(target.userId)) this.refreshVoice(sessionId);
      log.info({ roomId: this.connectaId, by: actor.userId, userId: target.userId, on: msg.on }, 'muted for everyone');
    }),

    /** Talk to everyone: the owner and mods only */
    stage: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.stage = msg.on && (p.role === 'owner' || p.role === 'mod') && p.status !== 'away' && !p.hushed;
    }),

    /** The Buddy Machine: summon a cat or a study buddy for everyone (anyone can, guests too) */
    'npc:summon': validate(z.object({ kind: z.enum(NPC_KINDS) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const refused = this.npc.summon(client.sessionId, p, msg.kind);
      if (refused) client.send('npc:refused', { reason: refused } satisfies NpcRefused);
    }),

    /** Send one home: nobody owns them, so anyone can */
    'npc:goodbye': validate(z.object({ id: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npc.goodbye(msg.id, p.name);
    }),

    /** Head pats for a cat within reach */
    'npc:pet': validate(z.object({ id: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npc.pet(client.sessionId, p, msg.id);
    }),

    /** A new look from Settings → My character, live for everyone (guests keep the one they picked) */
    look: validate(z.object({ look: z.unknown() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      const now = Date.now();
      if (!p || !s || p.role === 'guest' || now - s.lookAt < LOOK_EVERY_MS) return;
      s.lookAt = now;
      p.look = JSON.stringify(sanitizeLook(msg.look));
    }),
  };

  /** The ticket is the only proof of who you are; its room must be this room. */
  async onAuth(_client: Client, options: Partial<JoinOptions>): Promise<Auth> {
    const ticket = await readTicket(options.ticket, secrets.ticket);
    if (!ticket || ticket.roomId !== options.place) throw new ServerError(401, 'unauthorized');
    if (this.connectaId && ticket.roomId !== this.connectaId) throw new ServerError(401, 'unauthorized');
    // A newer ticket carries the latest capacity and guest voice (the owner changed Room settings)
    this.capacity = ticket.capacity;
    this.guestVoice = ticket.guestVoice ?? false;
    const staff = ticket.role === 'owner' || ticket.role === 'mod';
    const others = [...this.priv.values()].filter((s) => s.userId !== ticket.sub).length;
    if (!staff && others >= this.capacity) {
      this.turnedAway = true;
      throw new ServerError(403, 'full');
    }
    return ticket;
  }

  onCreate(options: JoinOptions) {
    this.connectaId = options.place;
    liveRooms.set(this.connectaId, this);
    // Presence expires unless refreshed (the gateway's STALE_MS), so say who's still here every minute
    this.clock.setInterval(() => {
      for (const [sessionId, s] of this.priv) links.presence({ userId: s.userId, tabId: tabId(sessionId), roomId: this.connectaId });
    }, 60_000);
    // Typing dots from a tab that went quiet, and voice back when a time out ends
    this.clock.setInterval(() => {
      const now = Date.now();
      for (const [sessionId, s] of this.priv) {
        const p = this.state.players.get(sessionId);
        if (p?.typing && now - s.typingAt > TYPING_TIMEOUT_MS) p.typing = false;
        if (p?.hushed) this.refreshVoice(sessionId);
      }
    }, 1000);
    this.clock.setInterval(() => this.npc.tick(NPC_TICK_MS / 1000), NPC_TICK_MS);
  }

  onJoin(client: Client, _options: JoinOptions, ticket: Auth) {
    if (!this.state.mapId) this.setMap(ticket.mapId);
    // One of you per room: the newest tab wins, the old one is told why it closed
    for (const [sessionId, s] of this.priv) {
      if (s.userId !== ticket.sub) continue;
      const old = this.clients_.get(sessionId);
      this.remove(sessionId);
      old?.leave(GAME_CLOSE.elsewhere);
    }
    const spot = this.doorSpot();
    this.state.players.set(
      client.sessionId,
      new Player({
        userId: ticket.sub,
        handle: ticket.handle ?? '',
        role: ticket.role,
        name: ticket.name,
        look: JSON.stringify(ticket.look ?? DEFAULT_LOOK),
        x: spot.x,
        z: spot.z,
        yaw: Math.PI,
        moving: false,
      }),
    );
    this.priv.set(client.sessionId, {
      userId: ticket.sub,
      lastMoveAt: Date.now(),
      moveBudget: 0,
      lastSaidAt: 0,
      typingAt: 0,
      lookAt: 0,
      quietUntil: ticket.timedOutUntil ?? 0,
    });
    this.clients_.set(client.sessionId, client);
    for (const sessionId of this.priv.keys()) this.refreshVoice(sessionId);
    this.npc.joined(this.state.players.get(client.sessionId)!, (fn, ms) => this.clock.setTimeout(fn, ms));
    links.presence({ userId: ticket.sub, tabId: tabId(client.sessionId), roomId: this.connectaId });
    log.info({ roomId: this.connectaId, userId: ticket.sub, role: ticket.role }, 'walked in');
  }

  /** A dropped connection keeps your place briefly, so a flaky network can resume. */
  async onDrop(client: Client) {
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      // Never came back: onLeave tidies up
    }
  }

  onReconnect(client: Client) {
    // Replaced by a newer tab while away
    if (!this.priv.has(client.sessionId)) return void client.leave(GAME_CLOSE.elsewhere);
    this.clients_.set(client.sessionId, client);
  }

  onLeave(client: Client) {
    this.remove(client.sessionId);
  }

  onDispose() {
    if (liveRooms.get(this.connectaId) === this) liveRooms.delete(this.connectaId);
  }

  /** Something changed in the API (kick, ban, a new map…). */
  apply(event: GameRoomEvent) {
    switch (event.type) {
      case 'kick':
      case 'ban':
      case 'left':
        for (const sessionId of this.sessionsOf(event.userId)) {
          const client = this.clients_.get(sessionId);
          this.remove(sessionId);
          client?.leave(event.type === 'ban' ? GAME_CLOSE.banned : event.type === 'kick' ? GAME_CLOSE.kicked : GAME_CLOSE.gone);
        }
        break;
      case 'role':
        for (const sessionId of this.sessionsOf(event.userId)) {
          const p = this.state.players.get(sessionId);
          if (!p) continue;
          p.role = event.role;
          if (event.role !== 'owner' && event.role !== 'mod') p.stage = false;
          this.refreshVoice(sessionId);
        }
        break;
      case 'timeout':
        for (const sessionId of this.sessionsOf(event.userId)) {
          const s = this.priv.get(sessionId);
          const p = this.state.players.get(sessionId);
          if (s) s.quietUntil = event.until;
          if (p) p.typing = false;
          this.refreshVoice(sessionId);
        }
        break;
      case 'guestVoice':
        this.guestVoice = event.on;
        for (const sessionId of this.priv.keys()) this.refreshVoice(sessionId);
        break;
      case 'map':
        if (event.mapId !== this.state.mapId) this.setMap(event.mapId);
        break;
      case 'deleted':
        for (const [sessionId, client] of this.clients_) {
          this.remove(sessionId);
          client.leave(GAME_CLOSE.gone);
        }
        break;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────────────────────

  /** Whether they may talk right now; LiveKit is told when it changes. */
  private refreshVoice(sessionId: string) {
    const p = this.state.players.get(sessionId);
    const s = this.priv.get(sessionId);
    if (!p || !s) return;
    p.mutedByMod = this.muted.has(s.userId);
    const hushed = (p.role === 'guest' && !this.guestVoice) || p.mutedByMod || s.quietUntil > Date.now();
    if (hushed === p.hushed) return;
    p.hushed = hushed;
    if (hushed) Object.assign(p, { stage: false, share: '', shareAudio: false });
    voice.current?.allow(this.connectaId, sessionId, !hushed);
  }

  private sessionsOf(userId: string) {
    return [...this.priv].filter(([, s]) => s.userId === userId).map(([id]) => id);
  }

  /** Gone for good (left, timed out, replaced, removed): out of the state and out of presence. */
  private remove(sessionId: string) {
    const s = this.priv.get(sessionId);
    if (!s) return;
    const wasFull = this.priv.size >= this.capacity;
    this.priv.delete(sessionId);
    this.clients_.delete(sessionId);
    this.state.players.delete(sessionId);
    voice.current?.remove(this.connectaId, sessionId);
    links.presence({ userId: s.userId, tabId: tabId(sessionId), roomId: null });
    if (wasFull && this.turnedAway && this.priv.size < this.capacity) {
      this.turnedAway = false;
      links.space(this.connectaId);
    }
  }

  /** A new map (Room settings, live switch): everyone stands up at its door. */
  private setMap(mapId: string) {
    this.map = mapDataFor(mapId);
    this.state.mapId = this.map.id;
    for (const p of this.state.players.values()) {
      const spot = this.doorSpot();
      Object.assign(p, { seatId: '', x: spot.x, z: spot.z, yaw: Math.PI, moving: false, share: '', shareAudio: false });
    }
    // The new map's resident cats; summoned friends don't come along
    this.npc.reset();
  }

  /** The NPC code's window on this room */
  private makeNpcs() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the host reads the room's current map
    const room = this;
    return new NpcDirector({
      get state() {
        return room.state;
      },
      get map() {
        return room.map;
      },
      say: (id, text) => {
        const npc = this.state.npcs.get(id);
        if (npc) this.toHearers(npc, 'npc:said', { id, text });
      },
      react: (id, emote) => {
        const npc = this.state.npcs.get(id);
        if (npc) this.toHearers(npc, 'npc:react', { id, emote } satisfies NpcReact);
      },
      note: (text) => this.broadcast('npc:note', { text } satisfies NpcNote),
      summoned: (event) => this.broadcast('npc:summoned', event satisfies NpcSummoned),
    });
  }

  /** Whoever hears something said here: the whole room, or only the private zone it's in */
  private toHearers(at: { x: number; z: number }, type: string, message: unknown) {
    const zone = zoneAtIn(this.map, at.x, at.z);
    if (!zone) return void this.broadcast(type, message);
    for (const [sessionId, c] of this.clients_) {
      const o = this.state.players.get(sessionId);
      if (o && zoneAtIn(this.map, o.x, o.z)?.id === zone.id) c.send(type, message);
    }
  }

  /** Walking off the TV rug or standing up from your desk ends your share */
  private checkShare(p: Player) {
    if (!p.share) return;
    const here = p.share === 'tv' ? inArea(this.map.tvArea, p.x, p.z) : p.share === `table:${this.map.seatById.get(p.seatId)?.tableId}`;
    if (!here) Object.assign(p, { share: '', shareAudio: false });
  }

  /** Near the door, spread out a little so people walking in together don't stack. */
  private doorSpot() {
    const { spawn, bounds } = this.map;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.8;
    return {
      x: clamp(spawn.x + Math.cos(a) * r, bounds.minX, bounds.maxX),
      z: clamp(spawn.z + Math.sin(a) * r * 0.5, bounds.minZ, bounds.maxZ),
    };
  }

  /** Step out to the seat's stand-up spot (behind a chair, in front of the sofa). */
  private standUp(p: Player) {
    const out = this.map.seatById.get(p.seatId)?.out ?? p;
    p.x = clamp(out.x, this.map.bounds.minX, this.map.bounds.maxX);
    p.z = clamp(out.z, this.map.bounds.minZ, this.map.bounds.maxZ);
    p.seatId = '';
  }
}

/** Presence counts each connection as a tab of its own. */
const tabId = (sessionId: string) => `game:${sessionId}`;

export type { PlayerRole };
