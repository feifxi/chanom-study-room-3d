import { describe, expect, it } from 'vitest';
import { TRACKS, nextIndex, prevIndex } from './tracks';

describe('playlist', () => {
  it('loops forwards and backwards', () => {
    expect(nextIndex(TRACKS.length - 1)).toBe(0);
    expect(prevIndex(0)).toBe(TRACKS.length - 1);
    expect(nextIndex(0)).toBe(1);
  });

  it('only lists files that are served from /music', () => {
    for (const t of TRACKS) expect(t.src).toMatch(/^\/music\/[\w-]+\.mp3$/);
  });
});

describe('files', () => {
  it('every track exists in public/music', async () => {
    const { existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    for (const t of TRACKS) expect(existsSync(fileURLToPath(new URL(`../../../public${t.src}`, import.meta.url))), t.src).toBe(true);
  });
});
