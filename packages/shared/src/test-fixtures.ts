import type { World } from './world.js';

/** A small 12 × 10 m test room: a table in the middle, a round plant pot and a sofa on the left wall. */
export const TEST_WORLD: World = {
  bounds: { minX: -5.6, maxX: 5.6, minZ: -4.6, maxZ: 4.6 },
  obstacles: [
    { kind: 'box', minX: -1.5, maxX: 1.5, minZ: -0.8, maxZ: 0.8 },
    { kind: 'circle', x: 3.5, z: -2.5, r: 0.5 },
    { kind: 'box', minX: -5.6, maxX: -4.4, minZ: 1, maxZ: 3.5 },
  ],
};

export const OPEN_SPOT = { x: 0, z: 3 } as const;
/** A point inside the sofa. */
export const INSIDE_SOFA = { x: -5, z: 2.2 } as const;

/** Seeded PRNG so failures are reproducible. */
export function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
