import { describe, expect, it } from 'vitest';
import { reconcile, recordMove, type SentMove } from './reconcile';

const walk = (n: number, step = 0.35) => {
  const h: SentMove[] = [];
  for (let i = 1; i <= n; i++) recordMove(h, { seq: i, x: i * step, z: 0 });
  return h;
};

describe('reconcile', () => {
  it('leaves us alone when the server agrees, however far behind it is (high latency)', () => {
    const h = walk(10); // we are at x=3.5, the server has only processed move 3 (x=1.05)
    expect(reconcile(h, 3, { x: 1.05, z: 0 })).toBeNull();
    expect(h[0]!.seq).toBe(4); // acknowledged moves are dropped
  });

  it('corrects by exactly what the server changed, and shifts later predictions too', () => {
    const h = walk(10);
    // The server stopped move 3 half a metre short (say a speed clamp)
    expect(reconcile(h, 3, { x: 0.55, z: 0 })).toEqual({ dx: expect.closeTo(-0.5), dz: 0 });
    expect(h[0]).toMatchObject({ seq: 4, x: expect.closeTo(0.9) });
  });

  it('ignores an acknowledgement it has already handled', () => {
    const h = walk(5);
    reconcile(h, 2, { x: 0.2, z: 0 });
    expect(reconcile(h, 2, { x: 0.2, z: 0 })).toBeNull();
  });

  it('ignores tiny differences', () => {
    const h = walk(3);
    expect(reconcile(h, 1, { x: 0.37, z: 0.01 })).toBeNull();
  });

  it('does nothing for a seq it never sent (e.g. after reconnecting)', () => {
    const h = walk(3);
    expect(reconcile(h, 99, { x: 50, z: 0 })).toBeNull();
  });
});
