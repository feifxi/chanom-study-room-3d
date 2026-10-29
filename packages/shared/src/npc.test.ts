import { describe, expect, it } from 'vitest';
import { NPC_RADIUS, npcRadius, parseJson } from './npc';
import { sanitizeLook, DEFAULT_LOOK } from './avatar';

describe('parseJson', () => {
  it('parses valid JSON', () => expect(parseJson('{"coat":"grey"}', {})).toEqual({ coat: 'grey' }));
  it('falls back on broken JSON or null', () => {
    expect(parseJson('{oops', { roam: true })).toEqual({ roam: true });
    expect(parseJson('null', { roam: true })).toEqual({ roam: true });
  });
});

describe('npcRadius', () => {
  it('is smaller for cats than for buddies', () => {
    expect(npcRadius('cat')).toBe(NPC_RADIUS.cat);
    expect(npcRadius('buddy')).toBe(NPC_RADIUS.buddy);
  });
});

describe('sanitizeLook', () => {
  it('replaces anything unknown with defaults', () => {
    expect(sanitizeLook({ hair: 'javascript:alert(1)', outfit: 42, accessory: 'crown' })).toEqual(DEFAULT_LOOK);
    expect(sanitizeLook(null)).toEqual(DEFAULT_LOOK);
  });
});

describe('seats', () => {
  it('lets people sit on the sofa, standing up in front of it', async () => {
    const { SEATS, SOFA } = await import('./layout');
    const { isWalkable } = await import('./navigation');
    const sofa = SEATS.filter((s) => s.kind === 'sofa');
    expect(sofa.length).toBeGreaterThan(0);
    for (const s of sofa) {
      expect(s.x).toBeGreaterThan(SOFA.minX);
      expect(s.x).toBeLessThan(SOFA.maxX);
      expect(isWalkable(s.out)).toBe(true);
    }
  });

  it('has a walkable stand-up spot for every seat', async () => {
    const { SEATS } = await import('./layout');
    const { isWalkable, nearestWalkable } = await import('./navigation');
    for (const s of SEATS) {
      const out = nearestWalkable(s.out);
      expect(isWalkable(out)).toBe(true);
      expect(Math.hypot(out.x - s.out.x, out.z - s.out.z)).toBeLessThan(0.5);
    }
  });
});
