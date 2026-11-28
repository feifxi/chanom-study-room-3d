import { describe, expect, it } from 'vitest';
import { canActOn, hasSeat, maxInside } from './rooms.js';

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
  it("follows the owner's plan, never past 30", () => {
    expect(maxInside(false)).toBe(15);
    expect(maxInside(true)).toBe(30);
  });
});

describe('hasSeat', () => {
  const nobodyInCharge = { ownerIn: false, modsIn: 0 };
  it('holds one seat for the owner and one for a mod, inside the cap', () => {
    // 28 people fill a Plus room for everyone else
    expect(hasSeat(30, 'member', { people: 27, ...nobodyInCharge })).toBe(true);
    expect(hasSeat(30, 'member', { people: 28, ...nobodyInCharge })).toBe(false);
    expect(hasSeat(30, 'guest', { people: 28, ...nobodyInCharge })).toBe(false);
    expect(hasSeat(30, 'mod', { people: 28, ...nobodyInCharge })).toBe(true);
    expect(hasSeat(30, 'owner', { people: 29, ownerIn: false, modsIn: 1 })).toBe(true);
  });

  it('gives a held seat to nobody else while its person is inside', () => {
    // The owner and a mod are in with 27 others: one ordinary seat left, then 30 is full
    expect(hasSeat(30, 'member', { people: 29, ownerIn: true, modsIn: 1 })).toBe(true);
    expect(hasSeat(30, 'member', { people: 30, ownerIn: true, modsIn: 1 })).toBe(false);
    // Only the owner is in: the mod's seat stays free, so 28 others is full
    expect(hasSeat(30, 'member', { people: 29, ownerIn: true, modsIn: 0 })).toBe(false);
  });

  it("lets a second mod in only on an ordinary seat, never the owner's", () => {
    // A mod and 28 others: the only seat left is the owner's
    expect(hasSeat(30, 'mod', { people: 29, ownerIn: false, modsIn: 1 })).toBe(false);
    expect(hasSeat(30, 'mod', { people: 28, ownerIn: false, modsIn: 1 })).toBe(true);
    expect(hasSeat(30, 'mod', { people: 30, ownerIn: true, modsIn: 1 })).toBe(false);
  });

  it('always lets the owner in', () => {
    expect(hasSeat(3, 'owner', { people: 10, ownerIn: false, modsIn: 2 })).toBe(true);
  });
});
