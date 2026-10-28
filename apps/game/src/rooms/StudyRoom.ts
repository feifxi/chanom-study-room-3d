import { Room, validate, type Client } from 'colyseus';
import { z } from 'zod';
import {
  BOUNDS, CHAT_MAX, MAX_PLAYERS, NAME_MAX, PATCH_RATE_MS, RUN_SPEED, SEAT_BY_ID, SIT_REACH, SPAWN,
  SPEED_TOLERANCE, sanitizeLook, type ChatMessage,
} from '@study/shared';
import { Player, StudyState } from '../state';

export interface StudyRoomMetadata {
  label: string;
  number: number;
}

const CHAT_COOLDOWN_MS = 500;
/** Clients refresh "typing" every few seconds; clear it if they go quiet (closed tab, crash). */
const TYPING_TIMEOUT_MS = 6000;
const RECONNECT_SECONDS = 20;

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

export class StudyRoom extends Room<{ state: StudyState; metadata: StudyRoomMetadata }> {
  maxClients = MAX_PLAYERS;
  patchRate = PATCH_RATE_MS;
  state = new StudyState();

  private lastMoveAt = new Map<string, number>();
  private lastChatAt = new Map<string, number>();
  private typingAt = new Map<string, number>();

  messages = {
    move: validate(
      z.object({ x: finite, z: finite, yaw: finite, moving: z.boolean() }),
      (client, msg) => {
        const p = this.state.players.get(client.sessionId);
        if (!p) return;
        if (p.seatId) p.seatId = ''; // moving stands you up

        // Server-authoritative speed limit: never move further than possible since the last update.
        const now = Date.now();
        const elapsed = Math.min(1, (now - (this.lastMoveAt.get(client.sessionId) ?? now - 100)) / 1000);
        this.lastMoveAt.set(client.sessionId, now);
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
      const text = msg.text.trim().slice(0, CHAT_MAX);
      if (!p) return;
      // The sender's chat box is empty now, even if the message gets rate-limited below.
      p.typing = false;
      this.typingAt.delete(client.sessionId);
      if (!text) return;
      const now = Date.now();
      if (now - (this.lastChatAt.get(client.sessionId) ?? 0) < CHAT_COOLDOWN_MS) return;
      this.lastChatAt.set(client.sessionId, now);
      const message: ChatMessage = { id: `${client.sessionId}-${now}`, sessionId: client.sessionId, name: p.name, text, at: now };
      this.broadcast('chat', message);
    }),

    typing: validate(z.object({ on: z.boolean() }), (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.typing = msg.on;
      if (msg.on) this.typingAt.set(client.sessionId, Date.now());
      else this.typingAt.delete(client.sessionId);
    }),
  };

  onCreate() {
    const number = claimNumber();
    this.setMetadata({ number, label: `Library #${number}` });

    this.clock.setInterval(() => {
      const now = Date.now();
      for (const [sessionId, at] of this.typingAt) {
        if (now - at < TYPING_TIMEOUT_MS) continue;
        this.typingAt.delete(sessionId);
        const p = this.state.players.get(sessionId);
        if (p) p.typing = false;
      }
    }, 1000);
  }

  onJoin(client: Client, options: { name?: unknown; look?: unknown } = {}) {
    const name = typeof options.name === 'string' ? options.name.trim().slice(0, NAME_MAX) : '';
    const player = new Player();
    player.name = name || 'Guest';
    player.look = JSON.stringify(sanitizeLook(options.look));
    player.x = SPAWN.x + (Math.random() - 0.5) * 2;
    player.z = SPAWN.z + (Math.random() - 0.5) * 0.8;
    player.yaw = 0; // face the camera on arrival
    player.moving = false;
    this.state.players.set(client.sessionId, player);
  }

  async onDrop(client: Client) {
    // Keep the avatar in place briefly so a flaky connection can resume.
    await this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.lastMoveAt.delete(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
    this.typingAt.delete(client.sessionId);
  }

  onDispose() {
    usedNumbers.delete(this.metadata?.number);
  }
}
