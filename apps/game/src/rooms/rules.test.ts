import { describe, expect, it } from 'vitest';
import { BOUNDS, RUN_SPEED, SPEED_TOLERANCE } from '@study/shared';
import { RoomNumbers, deriveStatus, limitMove, sanitizeName, sanitizeVisitorId } from './rules';

describe('limitMove', () => {
  const from = { x: 0, z: 0 };

  it('allows a normal step', () => {
    expect(limitMove(from, { x: 0.1, z: 0 }, 0.1)).toEqual({ x: 0.1, z: 0 });
  });

  it('caps teleports at running speed for the time that passed', () => {
    const next = limitMove(from, { x: 50, z: 0 }, 0.5);
    expect(next.x).toBeCloseTo(RUN_SPEED * SPEED_TOLERANCE * 0.5);
  });

  it('never lets a long pause bank more than one second of movement', () => {
    const next = limitMove(from, { x: 50, z: 0 }, 30);
    expect(next.x).toBeCloseTo(RUN_SPEED * SPEED_TOLERANCE);
  });

  it('clamps to the room', () => {
    const edge = { x: BOUNDS.maxX - 0.01, z: 0 };
    expect(limitMove(edge, { x: BOUNDS.maxX + 1, z: 0 }, 1).x).toBe(BOUNDS.maxX);
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
