import { describe, expect, it } from 'vitest';
import { NAP_SPOTS, NPC_SPAWN, SEATS, SPAWN } from './layout';
import { findPath, isWalkable, nearestWalkable, randomWalkable, type Point } from './navigation';

/** Seeded PRNG so failures are reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Every point along a polyline is walkable (sampled every 1 cm). */
function routeIsClear(from: Point, path: Point[]) {
  let prev = from;
  for (const w of path) {
    const n = Math.max(1, Math.ceil(Math.hypot(w.x - prev.x, w.z - prev.z) / 0.01));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!isWalkable({ x: prev.x + (w.x - prev.x) * t, z: prev.z + (w.z - prev.z) * t })) return false;
    }
    prev = w;
  }
  return true;
}

describe('navigation', () => {
  it('treats the spawn points as walkable', () => {
    expect(isWalkable(SPAWN)).toBe(true);
    expect(isWalkable(NPC_SPAWN)).toBe(true);
  });

  it('snaps a point inside furniture to the nearest walkable spot', () => {
    const insideSofa = NAP_SPOTS[0]!;
    const ground = nearestWalkable(insideSofa);
    expect(isWalkable(ground)).toBe(true);
    expect(Math.hypot(ground.x - insideSofa.x, ground.z - insideSofa.z)).toBeLessThan(1.5);
  });

  it('finds a clear route from the Buddy Machine to every seat and nap spot', () => {
    for (const goal of [...SEATS, ...NAP_SPOTS.map((n) => nearestWalkable(n))]) {
      const path = findPath(NPC_SPAWN, goal);
      expect(path.length, `no path to ${JSON.stringify(goal)}`).toBeGreaterThan(0);
      expect(routeIsClear(NPC_SPAWN, path), `route to ${JSON.stringify(goal)} clips furniture`).toBe(true);
    }
  });

  it('keeps almost every random route clear of furniture', () => {
    const rand = seeded(42);
    let clipped = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const from = randomWalkable(rand);
      const to = randomWalkable(rand);
      if (!routeIsClear(from, findPath(from, to))) clipped++;
    }
    // Rare grazes are fine: collision resolution pushes NPCs back out
    expect(clipped / trials).toBeLessThan(0.01);
  });

  it('ends paths at the requested goal', () => {
    const goal = SEATS[0]!;
    const path = findPath(SPAWN, goal);
    const end = path.at(-1)!;
    expect(Math.hypot(end.x - goal.x, end.z - goal.z)).toBeLessThan(0.05);
  });

  it('only picks random spots inside the requested area', () => {
    const rand = seeded(7);
    const area = { minX: -9, maxX: -6, minZ: 1, maxZ: 5 };
    for (let i = 0; i < 50; i++) {
      const p = randomWalkable(rand, area);
      expect(p.x).toBeGreaterThanOrEqual(area.minX);
      expect(p.x).toBeLessThanOrEqual(area.maxX);
      expect(isWalkable(p)).toBe(true);
    }
  });
});
