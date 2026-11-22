import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright');
const BASE = 'http://localhost:3200/';
const issues = [];
const checked = [];
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await mkdir(path.join(ROOT, 'reference/verified'), { recursive: true });
page.on('pageerror', e => issues.push(`JS: ${e.message}`));
page.on('response', r => { if (r.status() >= 400) issues.push(`HTTP ${r.status()}: ${r.url()}`); });
page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('file:')) issues.push(`External request: ${r.url()}`); });
try {
  for (const screen of [...manifest.pages, { file: 'catalogue.html' }]) {
    await page.goto(BASE + screen.file);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      media: document.querySelectorAll('audio,video,iframe').length,
      images: [...document.images].filter(i => i.getBoundingClientRect().width && (!i.complete || i.naturalWidth === 0)).map(i => i.src),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      links: [...document.querySelectorAll('a[href],[data-ui-go]')].map(a => a.getAttribute('href') || a.dataset.uiGo).filter(Boolean),
    }));
    if (result.canvases || result.media) issues.push(`${screen.file}: live canvas/media`);
    if (result.images.length) issues.push(`${screen.file}: missing images ${result.images.join(', ')}`);
    if (result.overflow) issues.push(`${screen.file}: desktop overflow`);
    for (const link of new Set(result.links)) {
      if (link.startsWith('#') || /^https?:|^mailto:/.test(link)) continue;
      try { await stat(path.join(ROOT, decodeURIComponent(link.split('#')[0].split('?')[0]))); }
      catch { issues.push(`${screen.file}: missing link ${link}`); }
    }
    checked.push(screen.file);
  }
  const screens = ['index', 'home', 'friends', 'discover', 'shop', 'plus', 'focus', 'settings-character', 'room-settings-map', 'walk-library', 'walk-cafe', 'walk-rooftop', 'walk-study', 'walk-activities', 'discover-guest', 'walk-guest', 'admin', 'inbox'];
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(t => localStorage.setItem('studyroom-ui:theme', t), theme);
    for (const id of screens) {
      await page.goto(BASE + id + '.html');
      await page.evaluate(() => document.fonts.ready);
      const state = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, dark: document.documentElement.classList.contains('dark') }));
      if (state.overflow) issues.push(`${id}: overflow at ${width}/${theme}`);
      if (state.dark !== (theme === 'dark')) issues.push(`${id}: wrong theme at ${width}/${theme}`);
      await page.screenshot({ path: path.join(ROOT, `reference/verified/${id}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(BASE + 'home.html');
  await page.getByRole('button', { name: 'Demo controls' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  if (!(await page.locator('html').getAttribute('class')).includes('dark')) issues.push('Theme control failed');
  await page.getByRole('button', { name: 'Close preview controls' }).click();
  await page.getByRole('button', { name: 'Make a room', exact: true }).click();
  await page.waitForURL('**/create-room.html');
  if (!await page.getByRole('dialog').isVisible()) issues.push('Create room navigation failed');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForURL('**/home.html');
  await page.goto(BASE + 'settings-profile.html');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.waitForURL('**/settings-appearance.html');
  await page.getByRole('button', { name: 'light', exact: true }).click();
  await page.getByRole('button', { name: 'Matcha latte', exact: true }).click();
  if (await page.locator('html').getAttribute('data-palette') !== 'matcha') issues.push('Palette control failed');
  await page.goto(BASE + 'shop.html');
  await page.getByRole('tab', { name: 'Pets', exact: true }).click();
  await page.waitForURL('**/shop-pets.html');
  await page.goto('file:///' + path.join(ROOT, 'home.html').replaceAll('\\', '/'));
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.getByRole('heading', { name: 'GroupChat', exact: true }).isVisible())) issues.push('file:// preview failed');
} finally { await browser.close(); }
const report = { checkedAt: new Date().toISOString(), pages: checked.length, layoutScreenshots: 72, issues: [...new Set(issues)] };
await writeFile(path.join(ROOT, 'reference/verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.issues.length ? 1 : 0;
