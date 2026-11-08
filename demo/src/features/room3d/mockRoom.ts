import {
  NAP_SPOTS,
  SEAT_BY_ID,
  SPAWN,
  STARTER_CAT,
  WALK_SPEED,
  findPath,
  type AvatarLook,
  type NpcView,
  type PlayerView,
} from '@study/shared';
import { questProgress } from '@/lib/quests';
// Registers the demo's game table with the shared seats and collisions before anything uses them
import '../activities/spots';
import type { StudyRoom } from './roomSession';

/**
 * Plays the game server for the demo: holds the room state and answers the local player's
 * move / sit / stand like the real StudyRoom would, so the copied V1 driver works unchanged.
 * Other people are scripted: a few sit and study, one wanders around.
 */
export interface MockPerson {
  id: string;
  name: string;
  look: AvatarLook;
  seatId?: string;
  status?: PlayerView['status'];
  subject?: string;
  focusMin?: number;
  /** Walks between these points forever. */
  path?: { x: number; z: number }[];
  at?: { x: number; z: number };
}

const player = (p: Partial<PlayerView> & Pick<PlayerView, 'name' | 'look' | 'x' | 'z'>): PlayerView => ({
  yaw: 0,
  moving: false,
  seatId: '',
  status: 'idle',
  statusEndsAt: 0,
  subject: '',
  focusSince: 0,
  todayMin: 0,
  typing: false,
  moveSeq: 0,
  ...p,
});

const cat = (name: string, coat: string, x: number, z: number, y: number, anim: string): NpcView => ({
  kind: 'cat',
  name,
  look: JSON.stringify({ coat }),
  x,
  z,
  y,
  yaw: Math.PI / 2,
  moving: false,
  anim,
  seatId: '',
  status: 'idle',
  statusEndsAt: 0,
  focusSince: 0,
  subject: '',
  following: '',
});

export class MockRoom implements StudyRoom {
  readonly sessionId = 'me';
  readonly state = { players: new Map<string, PlayerView>(), npcs: new Map<string, NpcView>() };
  private walkers = new Map<string, { path: { x: number; z: number }[]; next: number }>();
  /** One-off walks the demo scripts send people on (to a spot), ending in a seat or standing. */
  private trips = new Map<string, { path: { x: number; z: number }[]; seatId?: string }>();

  constructor(me: { name: string; look: AvatarLook }, people: MockPerson[]) {
    this.state.players.set('me', player({ name: me.name, look: JSON.stringify(me.look), x: SPAWN.x, z: SPAWN.z }));
    const now = Date.now();
    for (const p of people) {
      const seat = p.seatId ? SEAT_BY_ID.get(p.seatId) : undefined;
      const start = seat ?? p.path?.[0] ?? p.at ?? SPAWN;
      this.state.players.set(
        p.id,
        player({
          name: p.name,
          look: JSON.stringify(p.look),
          x: start.x,
          z: start.z,
          yaw: seat?.yaw ?? 0,
          seatId: seat?.id ?? '',
          status: p.status ?? 'idle',
          subject: p.subject ?? '',
          focusSince: p.status === 'focus' ? now - (p.focusMin ?? 10) * 60_000 : 0,
        }),
      );
      if (p.path) this.walkers.set(p.id, { path: p.path, next: 1 });
    }
    this.state.npcs.set('mochi', cat('Mochi', 'calico', NAP_SPOTS[0]!.x, NAP_SPOTS[0]!.z, NAP_SPOTS[0]!.y, 'nap'));
    this.state.npcs.set('tofu', cat('Tofu', 'orange', STARTER_CAT.x, STARTER_CAT.z, 0, 'idle'));
  }

  send(type: string, payload: unknown) {
    const me = this.state.players.get('me')!;
    if (type === 'move') {
      const m = payload as { x: number; z: number; yaw: number; moving: boolean; seq?: number };
      if (me.seatId) return this.stand(me);
      Object.assign(me, { x: m.x, z: m.z, yaw: m.yaw, moving: m.moving, moveSeq: m.seq ?? me.moveSeq });
    } else if (type === 'sit') {
      const seat = SEAT_BY_ID.get((payload as { seatId: string }).seatId);
      const taken = [...this.state.players.values()].some((p) => p.seatId === seat?.id);
      if (seat && !taken) Object.assign(me, { seatId: seat.id, x: seat.x, z: seat.z, yaw: seat.yaw, moving: false });
    } else if (type === 'stand') {
      this.stand(me);
    } else if (type === 'npc:pet') {
      // The real server counts this for today's quests (feature 7's coin model)
      questProgress('pet-3');
    }
  }

  setStatus(status: PlayerView['status'], subject = '') {
    const me = this.state.players.get('me')!;
    Object.assign(me, { status, subject, focusSince: status === 'focus' ? Date.now() : 0 });
  }

  /** The typing dots over your head (sent while you type a bubble). */
  setTyping(typing: boolean) {
    this.state.players.get('me')!.typing = typing;
  }

  /** Demo scripts: send someone (not you) somewhere along a real path, and sit them down if there's a seat. */
  sendTo(id: string, dest: { x: number; z: number }, seatId?: string) {
    const p = this.state.players.get(id);
    if (!p || id === 'me') return;
    this.walkers.delete(id);
    if (p.seatId) this.stand(p);
    const seat = seatId ? SEAT_BY_ID.get(seatId) : undefined;
    const to = seat ? seat.out : dest;
    const path = findPath({ x: p.x, z: p.z }, to);
    this.trips.set(id, { path: path.length ? path : [to], seatId });
  }

  /** On a scripted walk right now. */
  traveling(id: string) {
    return this.trips.has(id);
  }

  /** Is this seat free (nobody on it and nobody heading to it)? */
  seatFree(seatId: string) {
    const sitting = [...this.state.players.values()].some((p) => p.seatId === seatId);
    const coming = [...this.trips.values()].some((t) => t.seatId === seatId);
    return !sitting && !coming;
  }

  private stand(me: PlayerView) {
    const seat = SEAT_BY_ID.get(me.seatId);
    if (!seat) return;
    Object.assign(me, { seatId: '', x: seat.out.x, z: seat.out.z });
  }

  /** Advance the scripted walkers. */
  tick(dt: number) {
    for (const [id, t] of this.trips) {
      const p = this.state.players.get(id)!;
      const target = t.path[0]!;
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      const step = WALK_SPEED * dt;
      if (d > step) {
        Object.assign(p, { x: p.x + (dx / d) * step, z: p.z + (dz / d) * step, yaw: Math.atan2(dx, dz), moving: true });
        continue;
      }
      Object.assign(p, { x: target.x, z: target.z });
      t.path.shift();
      if (t.path.length) continue;
      this.trips.delete(id);
      const seat = t.seatId ? SEAT_BY_ID.get(t.seatId) : undefined;
      const taken = [...this.state.players.values()].some((o) => o.seatId === seat?.id);
      if (seat && !taken) Object.assign(p, { seatId: seat.id, x: seat.x, z: seat.z, yaw: seat.yaw, moving: false });
      else p.moving = false;
    }
    for (const [id, w] of this.walkers) {
      const p = this.state.players.get(id)!;
      const target = w.path[w.next]!;
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      const step = WALK_SPEED * 0.6 * dt;
      if (d <= step) {
        Object.assign(p, { x: target.x, z: target.z });
        w.next = (w.next + 1) % w.path.length;
      } else {
        Object.assign(p, { x: p.x + (dx / d) * step, z: p.z + (dz / d) * step, yaw: Math.atan2(dx, dz), moving: true });
      }
    }
  }
}
