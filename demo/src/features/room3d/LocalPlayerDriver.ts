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
import { reconcile, recordMove, type SentMove } from './reconcile';

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
/**
 * Last resort: with no moves in flight we should match the server; if we're this far apart anyway
 * (we reconnected, or the server moved us), jump to it. Normal lag is handled by reconcile().
 */
const IDLE_SNAP_DISTANCE = 1;
/** How fast server corrections are blended in (per second); ~0.1 s instead of a visible jump. */
const CORRECTION_RATE = 12;
/** Don't spam "stand" while a movement key is held on a seat. */
const STAND_RETRY_MS = 400;
/**
 * Frame time handling: a slow device's long frames still move the full distance (otherwise a
 * 5 fps phone walks at a quarter speed), split into short steps so nobody slips through furniture.
 * Past a quarter second (a hidden tab, a hitch) the extra time is dropped.
 */
const MAX_FRAME_DT = 0.25;
const MAX_STEP = 0.05;

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
  /** On-screen joystick, -1..1 on each axis (x right, z down the screen); 0,0 when released */
  private stick = { x: 0, z: 0 };
  hint: Hint | null = null;
  private hintKey = '';
  private synced = false;
  private wasSeated = false;
  private standSentAt = 0;
  private lastSent = { at: 0, x: 0, z: 0, yaw: 0, moving: false };
  /** Moves sent but not yet acknowledged by the server, with where we predicted we'd be */
  private seq = 0;
  private history: SentMove[] = [];
  private correction = { x: 0, z: 0 };
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
    if (localPlayer(this.room)?.seatId) return void this.room.send('stand', {});
    // Not seated: the server checks reach against our last sent position, so send the latest first
    this.sendMove(true);
    if (h?.kind === 'pet') this.room.send('npc:pet', { id: h.npcId });
    else if (h?.kind === 'machine') return 'openMachine';
    else if (h?.kind === 'seat') this.room.send('sit', { seatId: h.seatId });
  }

  /** The on-screen joystick moved (or was released, 0,0). Screen-relative, like the arrow keys. */
  setStick(x: number, z: number) {
    this.stick = { x, z };
  }

  release(code: string) {
    this.keys.delete(code);
  }

  releaseAll() {
    this.keys.clear();
  }

  /** Advance one frame. Returns the new hint when it changed, otherwise undefined. */
  frame(rawDt: number, camera: THREE.Camera, controls: OrbitTarget | null): Hint | null | undefined {
    const dt = Math.min(rawDt, MAX_FRAME_DT);
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
    if (this.wasSeated && !p.seatId) this.jumpTo(p);
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
    if (this.stick.x || this.stick.z) return [this.stick.x, this.stick.z];
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
    this.followServer(p, dt);
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    let moving = false;
    for (let i = 0; i < steps; i++) moving = this.step(ix, iz, dt / steps, camera);
    m.moving = moving;
    this.sendMove(false);
  }

  /** One short movement step from the keys or the joystick. Returns whether we moved. */
  private step(ix: number, iz: number, dt: number, camera: THREE.Camera) {
    if (!ix && !iz) return false;
    const m = this.motion.current;
    // Relative to the camera, so "up" is always up the screen
    const { fwd, right, move } = this;
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, UP);
    move.set(0, 0, 0).addScaledVector(fwd, -iz).addScaledVector(right, ix).normalize();
    // Shift runs; the joystick always walks (a thumb nearly always pushes it to the edge)
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;
    const next = { x: m.x + move.x * speed * dt, z: m.z + move.z * speed * dt };
    resolveCollisions(next, this.obstaclesAround());
    Object.assign(m, { x: next.x, z: next.z, yaw: Math.atan2(move.x, move.z) });
    return true;
  }

  /** Send our position at a fixed rate while moving, plus once when we stop; `now` skips the rate limit. */
  private sendMove(now: boolean) {
    const m = this.motion.current;
    const at = performance.now();
    const ls = this.lastSent;
    const changed = Math.abs(ls.x - m.x) > 0.01 || Math.abs(ls.z - m.z) > 0.01 || ls.moving !== m.moving;
    if (!changed || (!now && at - ls.at <= 1000 / CLIENT_SEND_HZ)) return;
    const seq = ++this.seq;
    recordMove(this.history, { seq, x: m.x, z: m.z });
    this.room.send('move', { x: m.x, z: m.z, yaw: m.yaw, moving: m.moving, seq });
    Object.assign(ls, { at, x: m.x, z: m.z, yaw: m.yaw, moving: m.moving });
  }

  /** Reconcile with the server's acknowledged position, blending in any correction. */
  private followServer(p: PlayerView, dt: number) {
    const m = this.motion.current;
    const fix = reconcile(this.history, p.moveSeq ?? 0, p);
    if (fix) {
      this.correction.x += fix.dx;
      this.correction.z += fix.dz;
    }
    if (this.correction.x || this.correction.z) {
      const k = Math.min(1, dt * CORRECTION_RATE);
      const ax = this.correction.x * k;
      const az = this.correction.z * k;
      m.x += ax;
      m.z += az;
      this.correction.x -= ax;
      this.correction.z -= az;
      if (Math.hypot(this.correction.x, this.correction.z) < 0.005) this.correction = { x: 0, z: 0 };
    }
    // Out of sync only if nothing is in flight *and* nothing is waiting to be sent: a position we moved
    // to since the last send (a long frame, or the test helper) goes out this frame, so it isn't drift
    const ls = this.lastSent;
    const unsent = Math.abs(ls.x - m.x) > 0.01 || Math.abs(ls.z - m.z) > 0.01;
    if (this.history.length === 0 && !unsent && Math.hypot(p.x - m.x, p.z - m.z) > IDLE_SNAP_DISTANCE) this.jumpTo(p);
  }

  /** Take the server's position as-is (spawn, standing up, recovering) and forget pending moves. */
  private jumpTo(p: { x: number; z: number }) {
    Object.assign(this.motion.current, { x: p.x, z: p.z });
    this.history = [];
    this.correction = { x: 0, z: 0 };
  }

  /** Other people and NPCs we bump into. */
  private obstaclesAround() {
    const others: { x: number; z: number; r?: number }[] = [];
    for (const [id, o] of this.room.state.players ?? []) if (id !== this.room.sessionId) others.push(o);
    for (const [, n] of this.room.state.npcs ?? []) others.push({ x: n.x, z: n.z, r: npcRadius(n.kind) });
    return others;
  }
}
