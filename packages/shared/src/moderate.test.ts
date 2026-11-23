import { beforeEach, describe, expect, it } from 'vitest';
import { hasBlockedWord, maskWords, setWordFilter } from './moderate.js';

// The database holds the real list; a few of its words are enough here
beforeEach(() => setWordFilter({ on: true, words: ['เหี้ย', 'สัส'] }));

describe('the word filter', () => {
  it('masks English, tricks included, and leaves innocent words', () => {
    expect(maskWords('what the fuck, sh1t happens')).toBe('what the ****, **** happens');
    expect(maskWords('Scunthorpe assassin class')).toBe('Scunthorpe assassin class');
  });
  it('masks Thai inside text, but not ordinary words that contain a listed one', () => {
    expect(maskWords('ไอ้เหี้ยนี่')).toBe('ไอ้*****นี่');
    expect(maskWords('เขาโหดเหี้ยมมาก')).toBe('เขาโหดเหี้ยมมาก');
    expect(maskWords('เปิดหีบสมบัติ')).toBe('เปิดหีบสมบัติ');
  });
  it('says whether a name has a blocked word', () => {
    expect(hasBlockedWord('Fuckboy')).toBe(true);
    expect(hasBlockedWord('สัสเอ้ย')).toBe(true);
    expect(hasBlockedWord('Mai')).toBe(false);
  });
  it('can be switched off, and the list changes at once', () => {
    setWordFilter({ on: true, words: ['badlink.example'] });
    expect(maskWords('see badlink.example')).toBe('see ***************');
    expect(maskWords('ไอ้เหี้ยนี่')).toBe('ไอ้เหี้ยนี่');
    setWordFilter({ on: false, words: ['badlink.example'] });
    expect(maskWords('what the fuck')).toBe('what the fuck');
    expect(hasBlockedWord('Fuckboy')).toBe(false);
  });
});
