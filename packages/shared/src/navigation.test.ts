import { describe, expect, it } from 'vitest';
import { INSIDE_SOFA, OPEN_SPOT, TEST_WORLD, seeded } from './test-fixtures.js';
import { createNavigator } from './navigation.js';
import type { Point } from './world.js';

const nav = createNavigator(TEST_WORLD);

/** Every point along a polyline is walkable (sampled every 1 cm). */
function routeIsClear(from: Point, path: Point[]) {
  let prev = from;
  for (const w of path) {
    const n = Math.max(1, Math.ceil(Math.hypot(w.x - prev.x, w.z - prev.z) / 0.01));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!nav.isWalkable({ x: prev.x + (w.x - prev.x) * t, z: prev.z + (w.z - prev.z) * t })) return false;
    }
    prev = w;
  }
  return true;
}

describe('createNavigator', () => {
  it('treats open floor as walkable and furniture as not', () => {
    expect(nav.isWalkable(OPEN_SPOT)).toBe(true);
    expect(nav.isWalkable({ x: 0, z: 0 })).toBe(false);
  });

  it('snaps a point inside furniture to the nearest walkable spot', () => {
    const ground = nav.nearestWalkable(INSIDE_SOFA);
    expect(nav.isWalkable(ground)).toBe(true);
    expect(Math.hypot(ground.x - INSIDE_SOFA.x, ground.z - INSIDE_SOFA.z)).toBeLessThan(1.5);
  });

  it('routes around the table and ends at the goal', () => {
    const from = { x: 0, z: -3 };
    const goal = { x: 0, z: 3 };
    const path = nav.findPath(from, goal);
    expect(path.length).toBeGreaterThan(0);
    expect(routeIsClear(from, path)).toBe(true);
    const end = path.at(-1)!;
    expect(Math.hypot(end.x - goal.x, end.z - goal.z)).toBeLessThan(0.05);
  });

  it('keeps almost every random route clear of furniture', () => {
    const rand = seeded(42);
    let clipped = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const from = nav.randomWalkable(rand);
      const to = nav.randomWalkable(rand);
      if (!routeIsClear(from, nav.findPath(from, to))) clipped++;
    }
    // Rare grazes are fine: collision resolution pushes NPCs back out
    expect(clipped / trials).toBeLessThan(0.01);
  });

  it('only picks random spots inside the requested area', () => {
    const rand = seeded(7);
    const area = { minX: 2, maxX: 5, minZ: 1, maxZ: 4 };
    for (let i = 0; i < 50; i++) {
      const p = nav.randomWalkable(rand, area);
      expect(p.x).toBeGreaterThanOrEqual(area.minX);
      expect(p.x).toBeLessThanOrEqual(area.maxX);
      expect(nav.isWalkable(p)).toBe(true);
    }
  });
});
