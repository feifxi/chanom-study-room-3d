import { Room, ServerError, validate, type Client } from 'colyseus';
import { z } from 'zod';
import {
  DEFAULT_LOOK,
  GAME_CLOSE,
  PATCH_RATE_MS,
  RECONNECT_SECONDS,
  SIT_REACH,
  type GameJoinOptions,
  type GameRoomEvent,
  type GameTicket,
  type PlayerRole,
} from '@connecta/shared';
import { mapDataFor, type MapData } from '@connecta/shared/maps';
import { links, liveRooms } from './links.js';
import { log } from './log.js';
import { Player, RoomState } from './state.js';
import { clamp, refillMoveBudget, spendMove } from './rules.js';
import { readTicket } from './ticket.js';

/** Set by the entry point from GAME_SECRET. */
export const secrets = { ticket: '' };

/** Matchmaking keeps rooms apart by `place`, the Connecta room id (see GameJoinOptions). */
type JoinOptions = GameJoinOptions;

/** Owners and mods always fit (spec 01: "the owner and mods always fit"), so the hard cap sits well above capacity. */
const HARD_CAP = 250;

const finite = z.number().refine(Number.isFinite);

/** Server-only bookkeeping per connection (not synced). */
interface Private {
  userId: string;
  lastMoveAt: number;
  /** Metres of movement allowed right now (see refillMoveBudget) */
  moveBudget: number;
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
      },
    ),

    sit: validate(z.object({ seatId: z.string().max(40) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const seat = this.map.seatById.get(msg.seatId);
      if (!p || !seat) return;
      if (Math.hypot(seat.x - p.x, seat.z - p.z) > SIT_REACH) return;
      for (const other of this.state.players.values()) if (other !== p && other.seatId === seat.id) return; // taken
      p.seatId = seat.id;
      p.x = seat.x;
      p.z = seat.z;
      p.yaw = seat.yaw;
      p.moving = false;
    }),

    stand: (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (p?.seatId) this.standUp(p);
    },
  };

  /** The ticket is the only proof of who you are; its room must be this room. */
  async onAuth(_client: Client, options: Partial<JoinOptions>): Promise<Auth> {
    const ticket = await readTicket(options.ticket, secrets.ticket);
    if (!ticket || ticket.roomId !== options.place) throw new ServerError(401, 'unauthorized');
    if (this.connectaId && ticket.roomId !== this.connectaId) throw new ServerError(401, 'unauthorized');
    // A newer ticket carries the latest capacity (the owner changed it in Room settings)
    this.capacity = ticket.capacity;
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
        role: ticket.role,
        name: ticket.name,
        look: JSON.stringify(ticket.look ?? DEFAULT_LOOK),
        x: spot.x,
        z: spot.z,
        yaw: Math.PI,
        moving: false,
      }),
    );
    this.priv.set(client.sessionId, { userId: ticket.sub, lastMoveAt: Date.now(), moveBudget: 0 });
    this.clients_.set(client.sessionId, client);
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
          if (p) p.role = event.role;
        }
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
      Object.assign(p, { seatId: '', x: spot.x, z: spot.z, yaw: Math.PI, moving: false });
    }
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
