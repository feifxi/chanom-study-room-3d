// Performance check for the 3D room: loads every map with nobody, 50 and 100 extra people, in smooth
// and battery-saver mode, zoomed all the way out, and fails if a frame goes over the budget
// (src/features/room3d/perf.ts). Zoomed out is the worst case: the whole map is on screen, so nothing
// is culled (at the opening zoom the maps once passed while costing ~70 draw calls more zoomed out).
// Needs the web app running (pnpm dev) and the seed: it signs in as Fei and walks into a seed room on
// each map (the pretend crowd is the Test tools' one, in this browser only). Draw calls, triangles and JS time are
// what we check; fps in a headless browser says little about a phone, so it's only printed.
//
//   pnpm --filter @connecta/web perf            (Chrome with the GPU if it can, else Chromium)
//   MAPS=cafe pnpm --filter @connecta/web perf  (one map)
import { chromium } from 'playwright';
import { signIn } from './sign-in.mjs';

const BASE = process.env.WEB_URL ?? 'http://localhost:3000';
// A seed room Fei is in, on each map (Chanom Friends is Big, the worst case for the Library)
const ROOM_ON = { library: 'seedchanom', cafe: 'seedgamenc', rooftop: 'seedlofish' };
const MAPS = (process.env.MAPS ?? 'library,cafe,rooftop').split(',');
const CROWDS = [0, 50, 100];
const launch = () =>
  chromium
    .launch({ channel: 'chrome', args: ['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] })
    .catch(() => chromium.launch({ args: ['--mute-audio', '--use-gl=swiftshader'] }));

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await signIn(ctx, BASE, process.env.PERF_AS ?? 'fei@connecta.test');
const rows = [];
let failed = false;
for (const map of MAPS)
  for (const mode of ['smooth', 'saver'])
    for (const crowd of CROWDS) {
      const page = await ctx.newPage();
      await page.addInitScript((c) => {
        localStorage.setItem('connecta:crowd', String(c));
        localStorage.setItem('connecta:perf', '1');
      }, crowd);
      await page.goto(`${BASE}/r/${ROOM_ON[map]}/walk`);
      await page.waitForFunction(() => window.__perf?.sample(), null, { timeout: 30_000 });
      if (mode === 'saver') {
        // Battery saver lives under the dock's More button
        await page.getByRole('button', { name: 'More', exact: true }).click();
        await page.getByRole('button', { name: /Battery saver/ }).click();
        await page.keyboard.press('Escape');
      }
      // Wheel out to the minimum zoom, so the whole map is drawn
      const box = await page.locator('canvas').first().boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 40; i++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(30);
      }
      // Let the crowd spread out, then take a few samples and keep the worst
      await page.waitForTimeout(5000);
      const worst = { cpuMs: 0, drawCalls: 0, triangles: 0, fps: Infinity, avatars: 0 };
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(600);
        const s = await page.evaluate(() => window.__perf.sample());
        for (const k of ['cpuMs', 'drawCalls', 'triangles', 'avatars']) worst[k] = Math.max(worst[k], s[k]);
        worst.fps = Math.min(worst.fps, s.fps);
      }
      const budget = await page.evaluate((n) => ({ ...window.__perf.budgetFor(n), cpuMs: window.__perf.budget.cpuMs }), worst.avatars);
      const over = ['drawCalls', 'triangles', 'cpuMs'].filter((k) => worst[k] > budget[k]);
      failed ||= over.length > 0;
      rows.push({
        map,
        mode,
        people: worst.avatars,
        fps: worst.fps,
        'JS ms': `${worst.cpuMs.toFixed(1)} / ${budget.cpuMs}`,
        'draw calls': `${worst.drawCalls} / ${budget.drawCalls}`,
        triangles: `${Math.round(worst.triangles / 1000)}k / ${Math.round(budget.triangles / 1000)}k`,
        result: over.length ? `OVER: ${over.join(', ')}` : 'ok',
      });
      await page.close();
    }
await browser.close();
console.table(rows);
process.exit(failed ? 1 : 0);
