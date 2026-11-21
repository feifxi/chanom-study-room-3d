import { describe, expect, it } from 'vitest';
import { NPC_RADIUS, npcRadius, parseJson } from './npc';

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
