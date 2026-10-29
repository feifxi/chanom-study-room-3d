import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

// Animations and walking are driven by the scene clock. It once advanced in milliseconds instead
// of seconds, so everyone jittered 1000x too fast and walked ~3x faster than WALK_SPEED. The clock
// should read the page's time in seconds (as of the last frame, so allow a slow frame or two).
test('the scene clock runs in seconds', async ({ page }) => {
  await enterRoom(page);
  await page.waitForTimeout(1000);
  const [clock, now] = await page.evaluate(() => [
    (window as unknown as { __study: { clock: { elapsedTime: number } } }).__study.clock.elapsedTime,
    performance.now() / 1000,
  ]);
  expect(Math.abs(now! - clock!), `scene clock ${clock}s, page time ${now}s`).toBeLessThan(3);
});
