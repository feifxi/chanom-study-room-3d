import { Room, validate, type Client } from 'colyseus';
import { AccessToken } from 'livekit-server-sdk';
import { z } from 'zod';
import {
  BOUNDS,
  CHAT_MAX,
  MAX_PLAYERS,
  MAX_TIMER_MIN,
  NPC_KINDS,
  PATCH_RATE_MS,
  SEAT_BY_ID,
  SIT_REACH,
  SPAWN,
  STARTER_CAT,
  SUBJECT_MAX,
  TIMER_PHASES,
  sanitizeLook,
  type ChatMessage,
  type TimerPhase,
} from '@study/shared';
import { getTodayMinutes, upsertVisitor, type Db } from '@study/db';
import { metrics } from '../metrics';
import { NpcDirector } from '../npc/NpcDirector';
import { Player, StudyState } from '../state';
import { RoomNumbers, clamp, deriveStatus, limitMove, sanitizeName, sanitizeVisitorId } from './rules';

export interface StudyRoomMetadata {
  label: string;
  number: number;
}

/** A finished stretch of focus, reported to whoever records stats. */
export interface FocusRecord {
  visitorId: string;
  name: string;
  subject: string;
  roomLabel: string;
  startedAt: Date;
  endedAt: Date;
  minutes: number;
}

/** Services wired up by the server entry point (the database is optional). */
export const services: { db?: Db; recordFocus?: (r: FocusRecord) => void } = {};

const CHAT_COOLDOWN_MS = 500;
/** Clients refresh "typing" every few seconds; clear it if they go quiet (closed tab, crash). */
const TYPING_TIMEOUT_MS = 6000;
const RECONNECT_SECONDS = 20;
const MINUTE = 60_000;

const LIVEKIT = {
  /** URL browsers connect to (ws:// locally, wss:// behind TLS in production). */
  publicUrl: process.env.LIVEKIT_PUBLIC_URL ?? 'ws://localhost:7880',
  apiKey: process.env.LIVEKIT_API_KEY ?? 'devkey',
  apiSecret: process.env.LIVEKIT_API_SECRET ?? 'secret',
};

const roomNumbers = new RoomNumbers();

const finite = z.number().refine(Number.isFinite);
const npcId = z.object({ id: z.string().max(16) });

/** Per-player server-only bookkeeping (not synced). */
interface Private {
  visitorId: string;
  lastMoveAt: number;
  lastChatAt: number;
  typingAt: number;
  away: boolean;
  personalPhase: TimerPhase;
  personalEndsAt: number;
  focusStartedAt: number;
}

export class StudyRoom extends Room<{ state: StudyState; metadata: StudyRoomMetadata }> {
  maxClients = MAX_PLAYERS;
  patchRate = PATCH_RATE_MS;
  state = new StudyState();

  private priv = new Map<string, Private>();
  private npcs = new NpcDirector({
    state: this.state,
    say: (npcId, text) => this.broadcast('npc:say', { npcId, text }),
    react: (npcId, emote) => this.broadcast('npc:react', { npcId, emote }),
    announce: (text) => this.announce(text),
    spun: (event) => this.broadcast('gacha:spun', event),
  });

  messages = {
    move: validate(z.object({ x: finite, z: finite, yaw: finite, moving: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s) return;
      if (p.seatId) p.seatId = ''; // moving stands you up

      const now = Date.now();
      const elapsed = (now - (s.lastMoveAt || now - 100)) / 1000;
      s.lastMoveAt = now;
      const next = limitMove(p, msg, elapsed);
      p.x = next.x;
      p.z = next.z;
      p.yaw = msg.yaw;
      p.moving = msg.moving;
    }),

    sit: validate(z.object({ seatId: z.string().max(16) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const seat = SEAT_BY_ID.get(msg.seatId);
      if (!p || !seat) return;
      if (Math.hypot(seat.x - p.x, seat.z - p.z) > SIT_REACH) return;
      for (const other of this.state.players.values()) {
        if (other !== p && other.seatId === seat.id) return; // taken
      }
      p.seatId = seat.id;
      p.x = seat.x;
      p.z = seat.z;
      p.yaw = seat.yaw;
      p.moving = false;
      // People come first: a study buddy in this seat politely moves elsewhere
      this.npcs.yieldSeat(seat.id);
    }),

    'gacha:spin': validate(z.object({ kind: z.enum(NPC_KINDS) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const error = this.npcs.spin(client.sessionId, p, msg.kind);
      if (error) client.send('gacha:error', { message: error });
    }),

    'npc:update': validate(
      z.object({ id: z.string().max(16), name: z.string().max(40).optional(), settings: z.record(z.string(), z.unknown()).optional() }),
      (client, msg) => {
        const p = this.state.players.get(client.sessionId);
        if (p) this.npcs.update(msg.id, msg, p.name);
      },
    ),

    'npc:remove': validate(npcId, (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npcs.remove(msg.id, p.name);
    }),

    'npc:pet': validate(npcId, (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npcs.pet(client.sessionId, p, msg.id);
    }),

    'npc:talk': validate(npcId, (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) this.npcs.talk(p, msg.id);
    }),

    stand: (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p?.seatId) return;
      // Step back from the table, away from the direction the seat faces.
      p.x = clamp(p.x - Math.sin(p.yaw) * 0.5, BOUNDS.minX, BOUNDS.maxX);
      p.z = clamp(p.z - Math.cos(p.yaw) * 0.5, BOUNDS.minZ, BOUNDS.maxZ);
      p.seatId = '';
    },

    chat: validate(z.object({ text: z.string() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      const text = msg.text.trim().slice(0, CHAT_MAX);
      if (!p || !s) return;
      // The sender's chat box is empty now, even if the message gets rate-limited below.
      p.typing = false;
      s.typingAt = 0;
      if (!text) return;
      const now = Date.now();
      if (now - s.lastChatAt < CHAT_COOLDOWN_MS) return;
      s.lastChatAt = now;
      const message: ChatMessage = { id: `${client.sessionId}-${now}`, sessionId: client.sessionId, name: p.name, text, at: now };
      this.broadcast('chat', message);
      metrics.chatMessages.inc();
    }),

    typing: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.priv.get(client.sessionId);
      if (!p || !s) return;
      p.typing = msg.on;
      s.typingAt = msg.on ? Date.now() : 0;
    }),

    subject: validate(z.object({ text: z.string() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.subject = msg.text.trim().slice(0, SUBJECT_MAX);
    }),

    away: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const s = this.priv.get(client.sessionId);
      if (!s) return;
      s.away = msg.on;
      this.refreshStatus(client.sessionId);
    }),

    'timer:personal': validate(z.object({ phase: z.enum(TIMER_PHASES), endsAt: finite }), (client, msg) => {
      const s = this.priv.get(client.sessionId);
      if (!s) return;
      const now = Date.now();
      s.personalPhase = msg.phase;
      // Keep the end time plausible: in the future and no longer than one max-length segment.
      s.personalEndsAt = msg.phase === 'idle' ? 0 : clamp(msg.endsAt, now, now + MAX_TIMER_MIN * MINUTE);
      this.refreshStatus(client.sessionId);
    }),

    /**
     * Voice + screen share token. The LiveKit room is this Colyseus room and the
     * identity is the session id, so audio can be matched to avatars for proximity.
     */
    'voice:token': async (client: Client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const at = new AccessToken(LIVEKIT.apiKey, LIVEKIT.apiSecret, { identity: client.sessionId, name: p.name, ttl: '6h' });
      at.addGrant({ roomJoin: true, room: this.roomId, canPublish: true, canSubscribe: true });
      client.send('voice:token', { url: LIVEKIT.publicUrl, token: await at.toJwt() });
    },

    /** Clock sync: the client measures round-trip time and lines its clock up with ours. */
    clock: (client: Client) => {
      client.send('clock', { serverNow: Date.now() });
    },
  };

  onCreate() {
    const number = roomNumbers.claim();
    this.setMetadata({ number, label: `Library #${number}` });

    this.clock.setInterval(() => this.tick(), 1000);

    // Every new room starts with a resident cat; more friends come from the Buddy Machine
    this.npcs.spawn('cat', { at: STARTER_CAT });
    let last = Date.now();
    this.clock.setInterval(() => {
      const now = Date.now();
      this.npcs.tick(Math.min(0.25, (now - last) / 1000));
      last = now;
    }, 100);
  }

  /** A system line in everyone's chat (arrivals, departures, Buddy Machine news). */
  private announce(text: string) {
    const now = Date.now();
    const message: ChatMessage = {
      id: `system-${now}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: 'system',
      name: 'Room',
      text,
      at: now,
      system: true,
    };
    this.broadcast('chat', message);
  }

  onJoin(client: Client, options: { name?: unknown; look?: unknown; visitorId?: unknown } = {}) {
    const player = new Player();
    player.name = sanitizeName(options.name);
    player.look = JSON.stringify(sanitizeLook(options.look));
    player.x = SPAWN.x + (Math.random() - 0.5) * 2;
    player.z = SPAWN.z + (Math.random() - 0.5) * 0.8;
    player.yaw = 0; // face the camera on arrival
    player.moving = false;
    this.state.players.set(client.sessionId, player);
    metrics.joins.inc();
    this.announce(`👋 ${player.name} joined the room`);
    this.npcs.onPlayerJoined(player);

    // Anonymous, client-generated id used only to group study stats. Trusted as-is in this demo.
    const visitorId = sanitizeVisitorId(options.visitorId, client.sessionId);
    const db = services.db;
    if (db) {
      // Best effort: stats are a bonus, never a reason to fail a join
      upsertVisitor(db, { id: visitorId, name: player.name, look: JSON.parse(player.look) })
        .then(() => getTodayMinutes(db, visitorId))
        .then((min) => {
          player.todayMin = min;
        })
        .catch((e) => console.warn('stats: join bookkeeping failed', e));
    }
    this.priv.set(client.sessionId, {
      visitorId,
      lastMoveAt: 0,
      lastChatAt: 0,
      typingAt: 0,
      away: false,
      personalPhase: 'idle',
      personalEndsAt: 0,
      focusStartedAt: 0,
    });
  }

  async onDrop(client: Client) {
    // Keep the avatar in place briefly so a flaky connection can resume.
    await this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onLeave(client: Client) {
    this.endFocus(client.sessionId);
    const name = this.state.players.get(client.sessionId)?.name;
    if (name) this.announce(`🚪 ${name} left the room`);
    this.state.players.delete(client.sessionId);
    this.priv.delete(client.sessionId);
  }

  onDispose() {
    roomNumbers.release(this.metadata?.number);
  }

  private tick() {
    const now = Date.now();
    for (const [id, s] of this.priv) {
      if (s.typingAt && now - s.typingAt > TYPING_TIMEOUT_MS) {
        s.typingAt = 0;
        const p = this.state.players.get(id);
        if (p) p.typing = false;
      }
    }
  }

  /** Derive a player's visible status from away + their pomodoro, tracking focus stretches. */
  private refreshStatus(id: string) {
    const p = this.state.players.get(id);
    const s = this.priv.get(id);
    if (!p || !s) return;
    const { status, endsAt } = deriveStatus(s.away, s.personalPhase, s.personalEndsAt);

    if (p.status !== 'focus' && status === 'focus') {
      s.focusStartedAt = Date.now();
      p.focusSince = s.focusStartedAt;
    }
    if (p.status === 'focus' && status !== 'focus') this.endFocus(id);
    p.status = status;
    p.statusEndsAt = endsAt;
  }

  private endFocus(id: string) {
    const p = this.state.players.get(id);
    const s = this.priv.get(id);
    if (!p || !s || !s.focusStartedAt) return;
    const endedAt = new Date();
    const startedAt = new Date(s.focusStartedAt);
    s.focusStartedAt = 0;
    p.focusSince = 0;
    const minutes = (endedAt.getTime() - startedAt.getTime()) / MINUTE;
    p.todayMin += Math.round(minutes);
    this.npcs.onPlayerFocusEnded(p, minutes);
    services.recordFocus?.({
      visitorId: s.visitorId,
      name: p.name,
      subject: p.subject,
      roomLabel: this.metadata?.label ?? '',
      startedAt,
      endedAt,
      minutes,
    });
  }
}
