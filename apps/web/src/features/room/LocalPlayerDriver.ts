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
  type Point,
} from '@study/shared';
import type { LocalMotion } from './Avatar';
import type { StudyRoom } from './roomSession';
import { reconcile, recordMove, type SentMove } from './reconcile';
import { goalReached, planRoute, routeLength, type TapGoal, type TapTarget } from './tapToWalk';

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
/** Pushing the on-screen joystick further than this runs instead of walking. */
const STICK_RUN = 0.85;
/** Tap-to-walk runs when the trip is longer than this (metres), so crossing the room isn't slow. */
const RUN_ROUTE_OVER = 6;
/** When a tap route ends short, still act if the server would accept it (a bit inside its reach). */
const LOOSE_REACH = 0.95;
/** Seconds of barely moving (someone in the way) before a route is re-planned, then dropped. */
const STUCK_AFTER = 0.8;

interface Route {
  path: Point[];
  goal: TapGoal;
  target: Point;
  stuckFor: number;
  replanned: boolean;
}

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
  /** Tap-to-walk: the route being followed, a tap waiting for us to stand up, an action for the UI */
  private route: Route | null = null;
  private queuedTap: TapTarget | null = null;
  private pendingAction: 'openMachine' | null = null;
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

  /** Walk to a tapped spot (or thing) and use it on arrival. Standing up first if seated. */
  tap(target: TapTarget) {
    const p = localPlayer(this.room);
    if (p?.seatId) {
      if (target.goal.kind === 'seat' && target.goal.seatId === p.seatId) return;
      this.room.send('stand', {});
      this.queuedTap = target;
      return;
    }
    this.startRoute(target);
  }

  /** Where tap-to-walk is heading (for the marker), or null. */
  get destination(): Point | null {
    return this.route?.target ?? null;
  }

  /** An action the UI should take (e.g. open the Buddy Machine after walking to it), once. */
  takeAction() {
    const a = this.pendingAction;
    this.pendingAction = null;
    return a;
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
    if (this.wasSeated && !p.seatId) {
      this.jumpTo(p);
      if (this.queuedTap) this.startRoute(this.queuedTap);
      this.queuedTap = null;
    }
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
    const { move } = this;
    let speed = 0;
    if (ix || iz) {
      // Keys win over a tap route. They move relative to the camera, so "up" is always up the screen
      this.route = null;
      const { fwd, right } = this;
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, UP);
      move.set(0, 0, 0).addScaledVector(fwd, -iz).addScaledVector(right, ix).normalize();
      // Shift runs; so does the joystick pushed all the way (keys always read as a full push, so only the stick counts)
      const stickPush = Math.hypot(this.stick.x, this.stick.z);
      const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || stickPush > STICK_RUN;
      speed = running ? RUN_SPEED : WALK_SPEED;
    } else if (this.route) {
      speed = this.steerAlongRoute(this.route, dt);
    }
    m.moving = speed > 0;
    if (m.moving) {
      const before = { x: m.x, z: m.z };
      const step = speed * dt;
      const next = { x: m.x + move.x * step, z: m.z + move.z * step };
      // Right at a tap route's end we may brush furniture (a chair), so only dodge people there
      const nearEnd =
        this.route && this.route.path.length <= 1 && Math.hypot(this.route.path[0]!.x - m.x, this.route.path[0]!.z - m.z) < 0.6;
      resolveCollisions(next, nearEnd ? [] : this.obstaclesAround());
      Object.assign(m, { x: next.x, z: next.z, yaw: Math.atan2(move.x, move.z) });
      if (this.route) this.checkStuck(this.route, before, step, dt);
    }

    this.sendMove(false);
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

  /** Point `move` at the next waypoint and return the speed, finishing the route when we're there. */
  private steerAlongRoute(route: Route, dt: number): number {
    const m = this.motion.current;
    if (goalReached(this.room, route.goal, m)) {
      this.finishRoute(route);
      return 0;
    }
    let wp = route.path[0];
    // Close enough to a waypoint: aim for the next one
    while (wp && Math.hypot(wp.x - m.x, wp.z - m.z) < 0.08) {
      route.path.shift();
      wp = route.path[0];
    }
    if (!wp) {
      this.finishRoute(route);
      return 0;
    }
    const dx = wp.x - m.x;
    const dz = wp.z - m.z;
    const d = Math.hypot(dx, dz);
    this.move.set(dx / d, 0, dz / d);
    const speed = routeLength(m, route.path) > RUN_ROUTE_OVER ? RUN_SPEED : WALK_SPEED;
    // Don't overshoot the waypoint in one frame
    return dt > 0 ? Math.min(speed, d / dt) : speed;
  }

  private startRoute(target: TapTarget) {
    const m = this.motion.current;
    const route: Route = {
      path: planRoute(m, target),
      goal: target.goal,
      target: { x: target.x, z: target.z },
      stuckFor: 0,
      replanned: false,
    };
    if (goalReached(this.room, route.goal, m) || !route.path.length) {
      this.route = null;
      this.act(route.goal);
      return;
    }
    this.route = route;
  }

  /** The route is over (arrived, or gave up): do what the tap asked if it's in reach at all. */
  private finishRoute(route: Route) {
    this.route = null;
    this.act(route.goal);
  }

  /** Do what the tap asked for, if we're close enough for the server to allow it. */
  private act(goal: TapGoal) {
    if (!goalReached(this.room, goal, this.motion.current, LOOSE_REACH)) return;
    // The server checks reach against where it thinks we are, so make sure it has our last step first
    this.sendMove(true);
    if (goal.kind === 'seat') this.room.send('sit', { seatId: goal.seatId });
    else if (goal.kind === 'pet') this.room.send('npc:pet', { id: goal.npcId });
    else if (goal.kind === 'machine') this.pendingAction = 'openMachine';
  }

  /** Someone standing in the way: try one fresh route, then give up rather than walk into them forever. */
  private checkStuck(route: Route, before: Point, step: number, dt: number) {
    const m = this.motion.current;
    const moved = Math.hypot(m.x - before.x, m.z - before.z);
    route.stuckFor = moved < step * 0.3 ? route.stuckFor + dt : 0;
    if (route.stuckFor < STUCK_AFTER) return;
    if (route.replanned) {
      this.finishRoute(route);
      return;
    }
    route.path = planRoute(m, route.target);
    route.stuckFor = 0;
    route.replanned = true;
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
    if (this.history.length === 0 && Math.hypot(p.x - m.x, p.z - m.z) > IDLE_SNAP_DISTANCE) this.jumpTo(p);
  }

  /** Take the server's position as-is (spawn, standing up, recovering) and forget pending moves. */
  private jumpTo(p: { x: number; z: number }) {
    Object.assign(this.motion.current, { x: p.x, z: p.z });
    this.route = null;
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
