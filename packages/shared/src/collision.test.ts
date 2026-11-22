import { describe, expect, it } from 'vitest';
import { resolveCollisions } from './collision.js';
import { OPEN_SPOT, TEST_WORLD } from './test-fixtures.js';
import { PLAYER_RADIUS } from './movement.js';

const { bounds } = TEST_WORLD;

describe('resolveCollisions', () => {
  it('leaves a free spot alone', () => {
    const p = { ...OPEN_SPOT };
    resolveCollisions(TEST_WORLD, p, []);
    expect(p).toEqual(OPEN_SPOT);
  });

  it('pushes two people apart until they no longer overlap', () => {
    const p = { ...OPEN_SPOT };
    resolveCollisions(TEST_WORLD, p, [{ x: OPEN_SPOT.x + 0.1, z: OPEN_SPOT.z }]);
    expect(Math.hypot(p.x - (OPEN_SPOT.x + 0.1), p.z - OPEN_SPOT.z)).toBeGreaterThanOrEqual(PLAYER_RADIUS * 2 - 1e-6);
  });

  it('respects a custom radius for the other walker (e.g. a small cat)', () => {
    const p = { ...OPEN_SPOT };
    resolveCollisions(TEST_WORLD, p, [{ x: OPEN_SPOT.x + 0.1, z: OPEN_SPOT.z, r: 0.22 }]);
    expect(Math.hypot(p.x - (OPEN_SPOT.x + 0.1), p.z - OPEN_SPOT.z)).toBeGreaterThanOrEqual(PLAYER_RADIUS + 0.22 - 1e-6);
  });

  it('pushes you out of furniture', () => {
    const p = { x: 0, z: 0.9 };
    resolveCollisions(TEST_WORLD, p, []);
    expect(p.z).toBeGreaterThanOrEqual(0.8 + PLAYER_RADIUS - 1e-6);
  });

  it('keeps you inside the room', () => {
    const p = { x: bounds.maxX + 5, z: bounds.minZ - 5 };
    resolveCollisions(TEST_WORLD, p, []);
    expect(p.x).toBeLessThanOrEqual(bounds.maxX);
    expect(p.z).toBeGreaterThanOrEqual(bounds.minZ);
  });
});
