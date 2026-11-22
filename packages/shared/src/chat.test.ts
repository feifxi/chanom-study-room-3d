import { describe, expect, it } from 'vitest';
import { mentionedHandles } from './chat.js';

describe('mentionedHandles', () => {
  it('finds @handles once each, lowercased', () => {
    expect(mentionedHandles('@Mai and @jod.dev, also @mai!')).toEqual(['mai', 'jod.dev']);
  });
  it('keeps @room for the API to judge', () => {
    expect(mentionedHandles('dinner @room')).toEqual(['room']);
  });
  it('ignores emails and a trailing dot', () => {
    expect(mentionedHandles('mail me at a@b.co or ask @ploy.')).toEqual(['ploy']);
  });
});
