import * as THREE from 'three';
import {
  CLIENT_SEND_HZ,
  GACHA_MACHINE,
  NPC_REACH,
  RUN_SPEED,
  SEATS,
  SEAT_BY_ID,
  SIT_REACH,
  WALK_SPEED,
  npcRadius,
  resolveCollisions,
  type PlayerView,
} from '@study/shared';
import type { LocalMotion } from './Avatar';
import type { StudyRoom } from './roomSession';

/** What pressing E would do right now. */
export type Hint = { kind: 'seat'; seatId: string } | { kind: 'pet'; npcId: string; name: string } | { kind: 'machine' };

export interface OrbitTarget {
  target: THREE.Vector3;
}

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
const UP = new THREE.Vector3(0, 1, 0);
/** If our prediction drifts this far from the server, snap to the server. */
const SNAP_DISTANCE = 1.2;
/** Don't spam "stand" while a movement key is held on a seat. */
const STAND_RETRY_MS = 400;

const localPlayer = (room: StudyRoom): PlayerView | undefined => room.state.players?.get(room.sessionId);

/**
 * What E would do at (x, z): the closest thing in reach wins, whether it's a cat
 * to pet, the Buddy Machine or a free seat. A cat already following you is
 * skipped, so it can't stand between you and a chair. Pure, so it's easy to test.
 */
export function findHint(room: StudyRoom, x: number, z: number): Hint | null {
  let best: Hint | null = null;
  let bestD = Infinity;
  const consider = (hint: Hint, d: number, reach: number) => {
    if (d < reach && d < bestD) {
      bestD = d;
      best = hint;
    }
  };

  for (const [id, n] of room.state.npcs ?? []) {
    if (n.kind !== 'cat' || n.following === room.sessionId) continue;
    consider({ kind: 'pet', npcId: id, name: n.name }, Math.hypot(n.x - x, n.z - z), NPC_REACH);
  }
  consider({ kind: 'machine' }, Math.hypot(GACHA_MACHINE.x - x, GACHA_MACHINE.z - z), GACHA_MACHINE.reach);

  const taken = new Set<string>();
  for (const [, o] of room.state.players ?? []) if (o.seatId) taken.add(o.seatId);
  for (const s of SEATS) {
    if (!taken.has(s.id)) consider({ kind: 'seat', seatId: s.id }, Math.hypot(s.x - x, s.z - z), SIT_REACH * 0.8);
  }
  return best;
}

/**
 * Client-side prediction for the local player: reads held keys, moves and
 * collides, sends throttled updates, works out the E-key hint and moves the
 * camera. Lives outside React because it mutates things every frame.
 */
export class LocalPlayerDriver {
  readonly keys = new Set<string>();
  hint: Hint | null = null;
  private hintKey = '';
  private synced = false;
  private wasSeated = false;
  private standSentAt = 0;
  private lastSent = { at: 0, x: 0, z: 0, yaw: 0, moving: false };
  private fwd = new THREE.Vector3();
  private right = new THREE.Vector3();
  private move = new THREE.Vector3();
  private follow = new THREE.Vector3();

  constructor(
    private readonly room: StudyRoom,
    private readonly motion: { current: LocalMotion },
  ) {}

  /** Handle a key press. Returns true when it opened the Buddy Machine. */
  press(code: string): 'openMachine' | void {
    if (KEYS[code] || code.startsWith('Shift')) this.keys.add(code);
    if (code !== 'KeyE') return;
    const h = this.hint;
    if (localPlayer(this.room)?.seatId) this.room.send('stand', {});
    else if (h?.kind === 'pet') this.room.send('npc:pet', { id: h.npcId });
    else if (h?.kind === 'machine') return 'openMachine';
    else if (h?.kind === 'seat') this.room.send('sit', { seatId: h.seatId });
  }

  release(code: string) {
    this.keys.delete(code);
  }

  releaseAll() {
    this.keys.clear();
  }

  /** Advance one frame. Returns the new hint when it changed, otherwise undefined. */
  frame(rawDt: number, camera: THREE.Camera, controls: OrbitTarget | null): Hint | null | undefined {
    const dt = Math.min(rawDt, 0.05);
    const p = localPlayer(this.room);
    const m = this.motion.current;
    if (!p) return undefined;

    // Start from wherever the server spawned us
    if (!this.synced) {
      this.synced = true;
      Object.assign(m, { x: p.x, z: p.z, yaw: p.yaw });
    }

    const [ix, iz] = this.input();
    // Just stood up: the server moved us to the seat's stand-up spot, so start from there
    if (this.wasSeated && !p.seatId) Object.assign(m, { x: p.x, z: p.z });
    this.wasSeated = !!p.seatId;
    if (p.seatId) this.staySeated(p, ix || iz);
    else this.walk(p, ix, iz, dt, camera);

    // Camera follows us smoothly
    if (controls) {
      this.follow
        .set(m.x, 0.6, m.z)
        .sub(controls.target)
        .multiplyScalar(Math.min(1, dt * 4));
      controls.target.add(this.follow);
      camera.position.add(this.follow);
    }

    const next = p.seatId ? null : findHint(this.room, m.x, m.z);
    const key = next ? JSON.stringify(next) : '';
    if (key === this.hintKey) return undefined;
    this.hintKey = key;
    this.hint = next;
    return next;
  }

  private input(): [number, number] {
    let ix = 0;
    let iz = 0;
    for (const code of this.keys) {
      const k = KEYS[code];
      if (k) {
        ix += k[0];
        iz += k[1];
      }
    }
    return [ix, iz];
  }

  /** Seated: the server owns our position. Any movement key stands us up. */
  private staySeated(p: PlayerView, wantsToMove: number) {
    const m = this.motion.current;
    const seat = SEAT_BY_ID.get(p.seatId);
    if (seat) Object.assign(m, { x: seat.x, z: seat.z, yaw: seat.yaw });
    m.moving = false;
    const now = performance.now();
    if (wantsToMove && now - this.standSentAt > STAND_RETRY_MS) {
      this.standSentAt = now;
      this.room.send('stand', {});
    }
  }

  private walk(p: PlayerView, ix: number, iz: number, dt: number, camera: THREE.Camera) {
    const m = this.motion.current;
    if (Math.hypot(p.x - m.x, p.z - m.z) > SNAP_DISTANCE) Object.assign(m, { x: p.x, z: p.z });
    m.moving = !!(ix || iz);
    if (m.moving) {
      // Keys move relative to the camera, so "up" is always up the screen
      const { fwd, right, move } = this;
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, UP);
      move.set(0, 0, 0).addScaledVector(fwd, -iz).addScaledVector(right, ix).normalize();
      const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const step = (running ? RUN_SPEED : WALK_SPEED) * dt;
      const next = { x: m.x + move.x * step, z: m.z + move.z * step };
      resolveCollisions(next, this.obstaclesAround());
      Object.assign(m, { x: next.x, z: next.z, yaw: Math.atan2(move.x, move.z) });
    }

    // Send at a fixed rate while moving, plus once when we stop
    const now = performance.now();
    const ls = this.lastSent;
    const changed = Math.abs(ls.x - m.x) > 0.01 || Math.abs(ls.z - m.z) > 0.01 || ls.moving !== m.moving;
    if (changed && now - ls.at > 1000 / CLIENT_SEND_HZ) {
      this.room.send('move', { x: m.x, z: m.z, yaw: m.yaw, moving: m.moving });
      Object.assign(ls, { at: now, x: m.x, z: m.z, yaw: m.yaw, moving: m.moving });
    }
  }

  /** Other people and NPCs we bump into. */
  private obstaclesAround() {
    const others: { x: number; z: number; r?: number }[] = [];
    for (const [id, o] of this.room.state.players ?? []) if (id !== this.room.sessionId) others.push(o);
    for (const [, n] of this.room.state.npcs ?? []) others.push({ x: n.x, z: n.z, r: npcRadius(n.kind) });
    return others;
  }
}
