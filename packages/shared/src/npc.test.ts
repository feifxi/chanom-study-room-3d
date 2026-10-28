import { describe, expect, it } from 'vitest';
import { CAT_COATS, NPC_RADIUS, npcRadius, parseJson, rollCoat } from './npc';
import { sanitizeLook, DEFAULT_LOOK } from './avatar';

describe('rollCoat', () => {
  it('maps the whole random range onto coats', () => {
    expect(rollCoat(() => 0).id).toBe(CAT_COATS[0]!.id);
    expect(rollCoat(() => 0.999999).id).toBe(CAT_COATS.at(-1)!.id);
  });

  it('makes the golden cat rare (about 5%)', () => {
    let golden = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) if (rollCoat().rare) golden++;
    expect(golden / n).toBeGreaterThan(0.03);
    expect(golden / n).toBeLessThan(0.07);
  });
});

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
