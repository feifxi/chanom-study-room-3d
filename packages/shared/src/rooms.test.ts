import { describe, expect, it } from 'vitest';
import { canActOn, maxInside } from './rooms.js';

describe('canActOn', () => {
  it('lets the owner act on anyone but the owner', () => {
    expect(canActOn('owner', 'mod')).toBe(true);
    expect(canActOn('owner', 'member')).toBe(true);
    expect(canActOn('owner', 'owner')).toBe(false);
  });

  it('lets mods act on members only', () => {
    expect(canActOn('mod', 'member')).toBe(true);
    expect(canActOn('mod', 'mod')).toBe(false);
    expect(canActOn('mod', 'owner')).toBe(false);
  });

  it('gives members and outsiders nothing', () => {
    expect(canActOn('member', 'member')).toBe(false);
    expect(canActOn(null, 'member')).toBe(false);
  });
});

describe('maxInside', () => {
  it('is the lower of the plan and the map size', () => {
    expect(maxInside(false, 'cosy')).toBe(25);
    expect(maxInside(true, 'cosy')).toBe(50);
    expect(maxInside(true, 'big')).toBe(100);
  });
});
