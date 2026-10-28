import { PLAYER_RADIUS } from './constants';
import { BOUNDS, OBSTACLES } from './layout';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function pushOutOfCircle(p: { x: number; z: number }, x: number, z: number, r: number) {
  const dx = p.x - x;
  const dz = p.z - z;
  const d = Math.hypot(dx, dz);
  if (d >= r) return;
  if (d < 1e-6) {
    p.x = x + r;
    return;
  }
  p.x = x + (dx / d) * r;
  p.z = z + (dz / d) * r;
}

/** Something else walking around: a player or an NPC, with an optional body radius. */
export interface Walker {
  x: number;
  z: number;
  r?: number;
}

/**
 * Push a walker of `radius` out of furniture, other walkers and the walls.
 * Mutates `p`. Used by clients (prediction) and the server (NPC movement).
 */
export function resolveCollisions(p: { x: number; z: number }, others: Iterable<Walker>, radius = PLAYER_RADIUS) {
  const R = radius;
  for (const o of OBSTACLES) {
    if (o.kind === 'circle') {
      pushOutOfCircle(p, o.x, o.z, o.r + R);
      continue;
    }
    const cx = clamp(p.x, o.minX, o.maxX);
    const cz = clamp(p.z, o.minZ, o.maxZ);
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * R;
      p.z = cz + (dz / d) * R;
    } else {
      // Centre inside the box: leave through the nearest side
      const exits: [number, number][] = [
        [o.minX - R - p.x, 0],
        [o.maxX + R - p.x, 0],
        [0, o.minZ - R - p.z],
        [0, o.maxZ + R - p.z],
      ];
      exits.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
      p.x += exits[0]![0];
      p.z += exits[0]![1];
    }
  }
  for (const q of others) pushOutOfCircle(p, q.x, q.z, R + (q.r ?? PLAYER_RADIUS));
  p.x = clamp(p.x, BOUNDS.minX, BOUNDS.maxX);
  p.z = clamp(p.z, BOUNDS.minZ, BOUNDS.maxZ);
}
