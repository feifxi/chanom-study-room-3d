import { describe, expect, it } from 'vitest';
import { SlowFrameDetector } from './quality';

describe('SlowFrameDetector', () => {
  it('stays quiet while frames keep up', () => {
    const d = new SlowFrameDetector(1000 / 60, 10);
    for (let i = 0; i < 50; i++) expect(d.add(17)).toBe(false);
  });

  it('reports a device that keeps falling far behind', () => {
    const d = new SlowFrameDetector(1000 / 60, 10);
    const results = Array.from({ length: 10 }, () => d.add(40));
    expect(results.at(-1)).toBe(true);
  });

  it('ignores a single hitch and pauses like a hidden tab', () => {
    const d = new SlowFrameDetector(1000 / 60, 10);
    for (let i = 0; i < 9; i++) d.add(17);
    expect(d.add(5000)).toBe(false); // ignored outright
    expect(d.add(80)).toBe(false); // one slow frame among fast ones
  });
});
