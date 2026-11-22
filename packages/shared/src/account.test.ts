import { describe, expect, it } from 'vitest';
import { ageOn, handleFrom, handleProblem, handleSuggestions } from './account.js';

describe('handles', () => {
  it('guesses from a display name', () => {
    expect(handleFrom('Mochi Bun!')).toBe('mochibun');
    expect(handleFrom('.mai.')).toBe('mai');
    expect(handleFrom('มะลิ')).toBe('');
  });

  it('checks the shape and reserved words', () => {
    expect(handleProblem('mai')).toBeNull();
    expect(handleProblem('mai.chan_26')).toBeNull();
    expect(handleProblem('ma')).toMatch(/3 characters/);
    expect(handleProblem('.mai')).toMatch(/a–z/);
    expect(handleProblem('Mai')).toMatch(/a–z/);
    expect(handleProblem('admin')).toMatch(/reserved/);
  });

  it('suggests valid alternatives', () => {
    expect(handleSuggestions('maimai', 2026)).toEqual(['maimai_', 'maimai.26', 'its.maimai', 'maimai123']);
    for (const s of handleSuggestions('a'.repeat(20), 2026)) expect(handleProblem(s)).toBeNull();
  });
});

describe('ageOn', () => {
  it('counts whole years, turning a year older on the birthday', () => {
    expect(ageOn('2013-11-21', '2026-11-20')).toBe(12);
    expect(ageOn('2013-11-21', '2026-11-21')).toBe(13);
    expect(ageOn('2004-05-14', '2026-11-21')).toBe(22);
  });
});
