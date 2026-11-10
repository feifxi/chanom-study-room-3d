// Performance check for the 3D room: loads every map with nobody, 50 and 100 extra people, in smooth
// and battery-saver mode, zoomed all the way out, and fails if a frame goes over the budget
// (src/features/room3d/perf.ts). Zoomed out is the worst case: the whole map is on screen, so nothing
// is culled (at the opening zoom the maps once passed while costing ~70 draw calls more zoomed out).
// Needs the demo running (pnpm --filter @study/demo demo:dev). Draw calls, triangles and JS time are
// what we check; fps in a headless browser says little about a phone, so it's only printed.
//
//   pnpm --filter @study/demo demo:perf            (Chrome with the GPU if it can, else Chromium)
//   MAPS=cafe pnpm --filter @study/demo demo:perf  (one map)
import { chromium } from 'playwright';

const BASE = process.env.DEMO_URL ?? 'http://localhost:3100/servers/chanom/rooms/';
// The Chanom Friends room ids match the map ids
const MAPS = (process.env.MAPS ?? 'library,cafe,rooftop').split(',');
const CROWDS = [0, 50, 100];
const launch = () =>
  chromium
    .launch({ channel: 'chrome', args: ['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] })
    .catch(() => chromium.launch({ args: ['--mute-audio', '--use-gl=swiftshader'] }));

const browser = await launch();
const rows = [];
let failed = false;
for (const map of MAPS)
  for (const mode of ['smooth', 'saver'])
    for (const crowd of CROWDS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
      await page.addInitScript((c) => {
        localStorage.setItem('connecta-demo:crowd', String(c));
        localStorage.setItem('connecta-demo:perf', '1');
      }, crowd);
      await page.goto(BASE + map);
      await page.waitForFunction(() => window.__perf?.sample(), null, { timeout: 30_000 });
      if (mode === 'saver') {
        // Battery saver lives in the room card (top left)
        await page
          .getByRole('button', { name: /Chanom Friends/ })
          .first()
          .click();
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
