import { describe, expect, it } from 'vitest';
import { resolveCollisions } from './collision';
import { PLAYER_RADIUS } from './constants';
import { BOUNDS, SPAWN } from './layout';

describe('resolveCollisions', () => {
  it('leaves a free spot alone', () => {
    const p = { x: SPAWN.x, z: SPAWN.z };
    resolveCollisions(p, []);
    expect(p).toEqual({ x: SPAWN.x, z: SPAWN.z });
  });

  it('pushes two people apart until they no longer overlap', () => {
    const p = { x: SPAWN.x, z: SPAWN.z };
    resolveCollisions(p, [{ x: SPAWN.x + 0.1, z: SPAWN.z }]);
    expect(Math.hypot(p.x - (SPAWN.x + 0.1), p.z - SPAWN.z)).toBeGreaterThanOrEqual(PLAYER_RADIUS * 2 - 1e-6);
  });

  it('respects a custom radius for the other walker (e.g. a small cat)', () => {
    const p = { x: SPAWN.x, z: SPAWN.z };
    resolveCollisions(p, [{ x: SPAWN.x + 0.1, z: SPAWN.z, r: 0.22 }]);
    expect(Math.hypot(p.x - (SPAWN.x + 0.1), p.z - SPAWN.z)).toBeGreaterThanOrEqual(PLAYER_RADIUS + 0.22 - 1e-6);
  });

  it('keeps you inside the room', () => {
    const p = { x: BOUNDS.maxX + 5, z: BOUNDS.minZ - 5 };
    resolveCollisions(p, []);
    expect(p.x).toBeLessThanOrEqual(BOUNDS.maxX);
    expect(p.z).toBeGreaterThanOrEqual(BOUNDS.minZ);
  });
});
