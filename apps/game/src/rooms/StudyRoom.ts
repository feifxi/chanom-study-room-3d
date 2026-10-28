import { Room, validate, type Client } from 'colyseus';
import { z } from 'zod';
import {
  BOUNDS, CHAT_MAX, MAX_PLAYERS, MAX_TIMER_MIN, MIN_TIMER_MIN, NAME_MAX, PATCH_RATE_MS, RUN_SPEED, SEAT_BY_ID,
  SIT_REACH, SPAWN, SPEED_TOLERANCE, SUBJECT_MAX, TIMER_MODES, TIMER_PHASES, sanitizeLook,
  type ChatMessage, type PlayerStatus, type TimerPhase,
} from '@study/shared';
import { Player, RoomTimer, StudyState } from '../state';

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

/** Hook for persisting focus time; set by the server entry point. */
export const focusSink: { record?: (r: FocusRecord) => void } = {};

const CHAT_COOLDOWN_MS = 500;
/** Clients refresh "typing" every few seconds; clear it if they go quiet (closed tab, crash). */
const TYPING_TIMEOUT_MS = 6000;
const RECONNECT_SECONDS = 20;
const MINUTE = 60_000;

// Public rooms are numbered "Library #1, #2, …"; a number is reused once its room closes.
const usedNumbers = new Set<number>();
function claimNumber(): number {
  let n = 1;
  while (usedNumbers.has(n)) n++;
  usedNumbers.add(n);
  return n;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finite = z.number().refine(Number.isFinite);
const minutes = z.number().min(MIN_TIMER_MIN).max(MAX_TIMER_MIN);

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

  messages = {
    move: validate(
      z.object({ x: finite, z: finite, yaw: finite, moving: z.boolean() }),
      (client, msg) => {
        const p = this.state.players.get(client.sessionId);
        const s = this.priv.get(client.sessionId);
        if (!p || !s) return;
        if (p.seatId) p.seatId = ''; // moving stands you up

        // Server-authoritative speed limit: never move further than possible since the last update.
        const now = Date.now();
        const elapsed = Math.min(1, (now - (s.lastMoveAt || now - 100)) / 1000);
        s.lastMoveAt = now;
        const maxStep = RUN_SPEED * SPEED_TOLERANCE * Math.max(elapsed, 0.05);
        let dx = msg.x - p.x;
        let dz = msg.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > maxStep) {
          dx = (dx / dist) * maxStep;
          dz = (dz / dist) * maxStep;
        }
        p.x = clamp(p.x + dx, BOUNDS.minX, BOUNDS.maxX);
        p.z = clamp(p.z + dz, BOUNDS.minZ, BOUNDS.maxZ);
        p.yaw = msg.yaw;
        p.moving = msg.moving;
      },
    ),

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

    'timer:mode': validate(z.object({ mode: z.enum(TIMER_MODES) }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.timerMode = msg.mode;
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

    'timer:start': validate(z.object({ focusMin: minutes, breakMin: minutes }), (client, msg) => {
      const timer = this.state.timer;
      Object.assign(timer, { phase: 'focus', focusMin: msg.focusMin, breakMin: msg.breakMin, cycle: 0, endsAt: Date.now() + msg.focusMin * MINUTE });
      const p = this.state.players.get(client.sessionId);
      if (p) p.timerMode = 'room'; // whoever starts it follows it
      this.broadcast('chime', { phase: 'focus' });
      this.refreshAll();
    }),

    /** Clock sync: the client measures round-trip time and lines its clock up with ours. */
    clock: (client: Client) => {
      client.send('clock', { serverNow: Date.now() });
    },

    'timer:stop': () => {
      Object.assign(this.state.timer, { phase: 'idle', endsAt: 0, cycle: 0 });
      this.refreshAll();
    },
  };

  onCreate() {
    const number = claimNumber();
    this.setMetadata({ number, label: `Library #${number}` });
    this.state.timer = new RoomTimer();

    this.clock.setInterval(() => this.tick(), 1000);
  }

  onJoin(client: Client, options: { name?: unknown; look?: unknown; visitorId?: unknown } = {}) {
    const name = typeof options.name === 'string' ? options.name.trim().slice(0, NAME_MAX) : '';
    const player = new Player();
    player.name = name || 'Guest';
    player.look = JSON.stringify(sanitizeLook(options.look));
    player.x = SPAWN.x + (Math.random() - 0.5) * 2;
    player.z = SPAWN.z + (Math.random() - 0.5) * 0.8;
    player.yaw = 0; // face the camera on arrival
    player.moving = false;
    this.state.players.set(client.sessionId, player);

    // Anonymous, client-generated id used only to group study stats. Trusted as-is in this demo.
    const visitorId = typeof options.visitorId === 'string' && /^[\w-]{8,64}$/.test(options.visitorId) ? options.visitorId : client.sessionId;
    this.priv.set(client.sessionId, {
      visitorId, lastMoveAt: 0, lastChatAt: 0, typingAt: 0,
      away: false, personalPhase: 'idle', personalEndsAt: 0, focusStartedAt: 0,
    });
  }

  async onDrop(client: Client) {
    // Keep the avatar in place briefly so a flaky connection can resume.
    await this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onLeave(client: Client) {
    this.endFocus(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.priv.delete(client.sessionId);
  }

  onDispose() {
    usedNumbers.delete(this.metadata?.number);
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

    // Advance the shared pomodoro: focus → break → focus …
    const timer = this.state.timer;
    if (timer.phase !== 'idle' && now >= timer.endsAt) {
      if (timer.phase === 'focus') {
        timer.phase = 'break';
        timer.endsAt = now + timer.breakMin * MINUTE;
      } else {
        timer.phase = 'focus';
        timer.cycle += 1;
        timer.endsAt = now + timer.focusMin * MINUTE;
      }
      this.broadcast('chime', { phase: timer.phase as TimerPhase });
      this.refreshAll();
    }
  }

  private refreshAll() {
    for (const id of this.priv.keys()) this.refreshStatus(id);
  }

  /** Derive a player's visible status from away/timer state, tracking focus stretches. */
  private refreshStatus(id: string) {
    const p = this.state.players.get(id);
    const s = this.priv.get(id);
    if (!p || !s) return;
    const timer = this.state.timer;
    let status: PlayerStatus = 'idle';
    let endsAt = 0;
    if (s.away) {
      status = 'away';
    } else if (p.timerMode === 'room' && timer.phase !== 'idle') {
      status = timer.phase as PlayerStatus;
      endsAt = timer.endsAt;
    } else if (p.timerMode === 'personal' && s.personalPhase !== 'idle') {
      status = s.personalPhase;
      endsAt = s.personalEndsAt;
    }

    if (p.status !== 'focus' && status === 'focus') s.focusStartedAt = Date.now();
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
    focusSink.record?.({
      visitorId: s.visitorId,
      name: p.name,
      subject: p.subject,
      roomLabel: this.metadata?.label ?? '',
      startedAt,
      endedAt,
      minutes: (endedAt.getTime() - startedAt.getTime()) / MINUTE,
    });
  }
}
