import { describe, expect, it } from 'vitest';
import { parseYouTube, watchPosition } from './watch.js';

describe('watch together', () => {
  it('reads every kind of YouTube link', () => {
    for (const link of [
      'https://youtu.be/lTRiuFIWV54',
      'https://www.youtube.com/watch?v=lTRiuFIWV54&t=30',
      'https://www.youtube.com/watch?list=x&v=lTRiuFIWV54',
      'https://youtube.com/shorts/lTRiuFIWV54',
      'https://www.youtube.com/live/lTRiuFIWV54',
      ' lTRiuFIWV54 ',
    ])
      expect(parseYouTube(link)).toBe('lTRiuFIWV54');
    expect(parseYouTube('https://vimeo.com/123')).toBeNull();
  });

  it('keeps one timeline', () => {
    expect(watchPosition({ offset: 10, startedAt: 1000, paused: false }, 6000)).toBe(15);
    expect(watchPosition({ offset: 10, startedAt: 1000, paused: true }, 6000)).toBe(10);
  });
});
