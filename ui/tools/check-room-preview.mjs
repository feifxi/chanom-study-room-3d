import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright');
const BASE = 'http://localhost:3200/';
const OUT = path.join(ROOT, 'reference/room-preview');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const issues = [];
const assert = (test, message) => { if (!test) issues.push(message); };
page.on('pageerror', e => issues.push(e.message));
page.on('response', r => { if (r.status() >= 400) issues.push(`HTTP ${r.status()}: ${r.url()}`); });
page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(BASE)) issues.push(`External request: ${r.url()}`); });
let screenshots = 0;
try {
  for (const file of manifest.roomPreviewRevision.files) {
    await page.goto(BASE + file);
    const check = await page.evaluate(() => ({
      preview: document.querySelectorAll('.room-peek').length,
      media: document.querySelectorAll('canvas,audio,video,iframe').length,
      images: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
      links: [...document.querySelectorAll('a[href],[data-ui-go]')].map(e => e.getAttribute('href') || e.dataset.uiGo),
    }));
    assert(check.preview === 1 && !check.media && !check.images.length, `${file}: preview/assets/media problem ${JSON.stringify(check.images)}`);
    for (const link of new Set(check.links)) {
      if (!link || /^(#|https?:|mailto:)/.test(link)) continue;
      try { await stat(path.join(ROOT, link.split(/[?#]/)[0])); } catch { issues.push(`${file}: broken link ${link}`); }
    }
  }
  for (const width of [390, 768, 1440, 1920]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(t => localStorage.setItem('studyroom-ui:theme', t), theme);
    for (const id of ['home', 'room-chanom']) {
      await page.goto(BASE + id + '.html');
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const hero = document.querySelector('.room-peek').getBoundingClientRect();
        const composer = document.querySelector('.chat-composer').getBoundingClientRect();
        const timeline = document.querySelector('.chat-timeline').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, visible: hero.width > 0, heroHeight: hero.height, composerBottom: composer.bottom, timelineHeight: timeline.height };
      });
      assert(!result.overflow, `${id}/${width}/${theme}: sideways scrolling`);
      if (id !== 'home' || width >= 768) {
        assert(result.visible && result.heroHeight <= 220, `${id}/${width}/${theme}: preview hidden or oversized`);
        assert(result.composerBottom <= (width === 390 ? 844 : 1000) && result.timelineHeight >= 100, `${id}/${width}/${theme}: chat/composer squeezed out`);
      }
      await page.screenshot({ path: path.join(OUT, `${id}-${width}-${theme}.png`), animations: 'disabled' }); screenshots++;
    }
  }
  for (const id of ['room-cpe', 'room-study-sprint', 'room-ielts-buddies', 'room-werewolf']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(BASE + id + '.html');
    await page.screenshot({ path: path.join(OUT, id + '-state.png'), animations: 'disabled' }); screenshots++;
  }
  await page.goto(BASE + 'room-cpe.html');
  assert(await page.locator('.room-peek-enter').isDisabled(), 'Full room allows walking in');
  await page.goto(BASE + 'room-study-sprint.html');
  assert(await page.getByText('Be the first to walk in.', { exact: true }).isVisible(), 'Quiet room invitation missing');
  await page.goto(BASE + 'home.html');
  await page.getByRole('link', { name: 'Walk in', exact: true }).click();
  await page.waitForURL('**/walk-library.html');
  await page.goto(BASE + 'home.html');
  await page.getByRole('button', { name: 'Hide members', exact: true }).click();
  assert(!await page.locator('.chat-members').isVisible(), 'Members toggle broke');
  await page.getByRole('button', { name: 'Demo controls', exact: true }).click();
  await page.getByRole('link', { name: 'Chat only', exact: true }).click();
  await page.waitForURL('**/home-chat.html');
  assert(!await page.locator('.room-peek').count(), 'Chat-only comparison was overwritten');
  await page.getByRole('button', { name: 'Demo controls', exact: true }).click();
  await page.getByRole('link', { name: 'Original Home', exact: true }).click();
  await page.waitForURL('**/home-old.html');
  assert(await page.getByRole('heading', { name: 'Where to tonight, feifei?', exact: true }).isVisible(), 'Original Home comparison changed');
  await page.goto(BASE + 'messages-mai.html');
  assert(!await page.locator('.room-peek').count(), 'DM incorrectly has a room preview');
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto(BASE + 'room-chanom.html');
  await page.getByRole('button', { name: 'Show members', exact: true }).click();
  assert(await page.locator('.chat-members').getByText('Mai', { exact: true }).isVisible(), 'Phone member names unavailable');
  await page.goto('file:///' + path.join(ROOT, 'room-chanom.html').replaceAll('\\', '/'));
  assert(await page.locator('.room-peek').isVisible(), 'Direct file preview failed');
} catch (error) { issues.push(error.message); }
finally { await browser.close(); }
const result = { checkedAt: new Date().toISOString(), pages: manifest.roomPreviewRevision.files.length, screenshots, issues: [...new Set(issues)] };
await writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.issues.length ? 1 : 0;
