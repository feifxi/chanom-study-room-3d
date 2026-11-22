import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, sanitizeLook } from './avatar.js';

describe('sanitizeLook', () => {
  it('replaces anything unknown with defaults', () => {
    expect(sanitizeLook({ hair: 'javascript:alert(1)', outfit: 42, accessory: 'crown' })).toEqual(DEFAULT_LOOK);
    expect(sanitizeLook(null)).toEqual(DEFAULT_LOOK);
  });
});
