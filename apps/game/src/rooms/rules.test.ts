import { describe, expect, it } from 'vitest';
import { BOUNDS, RUN_SPEED, SPEED_TOLERANCE } from '@study/shared';
import { MOVE_BUDGET_MAX, RoomNumbers, deriveStatus, refillMoveBudget, sanitizeName, sanitizeVisitorId, spendMove } from './rules';

describe('movement budget', () => {
  const from = { x: 0, z: 0 };
  const speed = RUN_SPEED * SPEED_TOLERANCE;

  it('allows a normal step and charges it', () => {
    const r = spendMove(from, { x: 0.1, z: 0 }, refillMoveBudget(0, 0.1));
    expect(r.x).toBeCloseTo(0.1);
    expect(r.budget).toBeCloseTo(speed * 0.1 - 0.1);
  });

  it('cuts a teleport down to what the budget allows', () => {
    const r = spendMove(from, { x: 50, z: 0 }, refillMoveBudget(0, 0.5));
    expect(r.x).toBeCloseTo(speed * 0.5);
    expect(r.budget).toBeCloseTo(0);
  });

  it('saves up at most one second of movement, so a long pause is no head start', () => {
    expect(refillMoveBudget(0, 30)).toBeCloseTo(MOVE_BUDGET_MAX);
  });

  it('accepts a burst of late moves whole when it fits the time that passed (bad connections)', () => {
    // 600 ms of real time, then six 0.8 m moves arrive together
    let budget = refillMoveBudget(0, 0.6);
    let pos = { ...from };
    for (let i = 0; i < 6; i++) {
      const r = spendMove(pos, { x: pos.x + 0.8, z: 0 }, refillMoveBudget(budget, 0));
      pos = r;
      budget = r.budget;
    }
    expect(pos.x).toBeCloseTo(4.8);
  });

  it('keeps the average speed capped however the moves are split', () => {
    let budget = 0;
    let pos = { ...from };
    for (let i = 0; i < 100; i++) {
      budget = refillMoveBudget(budget, 0.01); // 1 s in total
      const r = spendMove(pos, { x: pos.x + 1, z: 0 }, budget);
      pos = r;
      budget = r.budget;
    }
    expect(pos.x).toBeLessThanOrEqual(speed + 1e-9);
  });

  it('clamps to the room', () => {
    const edge = { x: BOUNDS.maxX - 0.01, z: 0 };
    expect(spendMove(edge, { x: BOUNDS.maxX + 1, z: 0 }, 10).x).toBe(BOUNDS.maxX);
  });
});

describe('deriveStatus', () => {
  it('shows away above everything else', () => expect(deriveStatus(true, 'focus', 123)).toEqual({ status: 'away', endsAt: 0 }));
  it('shows the pomodoro phase with its end time', () =>
    expect(deriveStatus(false, 'break', 123)).toEqual({ status: 'break', endsAt: 123 }));
  it('is idle otherwise', () => expect(deriveStatus(false, 'idle', 123)).toEqual({ status: 'idle', endsAt: 0 }));
});

describe('join input', () => {
  it('trims names and falls back to Guest', () => {
    expect(sanitizeName('  Mint  ')).toBe('Mint');
    expect(sanitizeName('   ')).toBe('Guest');
    expect(sanitizeName(42)).toBe('Guest');
  });

  it('only accepts plausible visitor ids', () => {
    expect(sanitizeVisitorId('abc-123_XYZ', 'session')).toBe('abc-123_XYZ');
    expect(sanitizeVisitorId('short', 'session')).toBe('session');
    expect(sanitizeVisitorId('<script>alert(1)</script>', 'session')).toBe('session');
  });
});

describe('RoomNumbers', () => {
  it('hands out the lowest free number and reuses released ones', () => {
    const n = new RoomNumbers();
    expect([n.claim(), n.claim(), n.claim()]).toEqual([1, 2, 3]);
    n.release(2);
    expect(n.claim()).toBe(2);
    expect(n.claim()).toBe(4);
  });
});
