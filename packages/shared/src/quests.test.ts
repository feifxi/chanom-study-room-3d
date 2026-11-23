import { describe, expect, it } from 'vitest';
import { QUEST_POOL, questsFor } from './quests.js';

describe('questsFor', () => {
  it('picks one per group, the same all day, and varies between days and people', () => {
    const a = questsFor('u-1', '2026-11-23');
    expect(a.map((q) => q.group)).toEqual(['focus', 'together', 'play']);
    expect(questsFor('u-1', '2026-11-23')).toEqual(a);
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++)
      for (const u of ['u-1', 'u-2', 'u-3']) for (const q of questsFor(u, `2026-11-${String(d).padStart(2, '0')}`)) seen.add(q.id);
    // Over a month every quest comes up
    expect(seen.size).toBe(QUEST_POOL.length);
  });

  it('pays about 60 coins a day', () => {
    const coins = questsFor('u-1', '2026-11-23').reduce((n, q) => n + q.coins, 0);
    expect(coins).toBe(60);
  });
});
