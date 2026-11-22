import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright');
const BASE = 'http://localhost:3200/';
const output = path.join(ROOT, 'reference/chat-first');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const issues = [];
const assert = (condition, message) => { if (!condition) issues.push(message); };
page.on('pageerror', e => issues.push(`JavaScript: ${e.message}`));
page.on('response', r => { if (r.status() >= 400) issues.push(`HTTP ${r.status()}: ${r.url()}`); });
page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(BASE)) issues.push(`External request: ${r.url()}`); });
const cases = [];
try {
  for (const file of manifest.uiRevision.files) {
    await page.goto(BASE + file);
    await page.evaluate(() => document.fonts.ready);
    const info = await page.evaluate(() => ({
      media: document.querySelectorAll('canvas,audio,video,iframe').length,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      missingImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
      links: [...document.querySelectorAll('a[href],[data-ui-go]')].map(e => e.getAttribute('href') || e.dataset.uiGo).filter(Boolean),
      rail: !!document.querySelector('nav.app-rail'),
    }));
    assert(!info.media, `${file}: live media/canvas`);
    assert(!info.overflow, `${file}: desktop overflow`);
    assert(info.rail, `${file}: no left navigation`);
    for (const src of info.missingImages) issues.push(`${file}: missing image ${src}`);
    for (const link of new Set(info.links)) {
      if (link.startsWith('#') || /^(https?:|mailto:)/.test(link)) continue;
      try { await stat(path.join(ROOT, decodeURIComponent(link.split(/[?#]/)[0]))); }
      catch { issues.push(`${file}: broken link ${link}`); }
    }
  }
  for (const width of [390, 768, 1024, 1440, 1920]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(t => localStorage.setItem('studyroom-ui:theme', t), theme);
    for (const id of ['home', 'room-chanom', 'messages-mai', 'friends', 'shop', 'discover-guest']) {
      await page.goto(BASE + id + '.html');
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        dark: document.documentElement.classList.contains('dark'),
        railLabels: [...document.querySelectorAll('.rail-links .rail-link > span:last-child')].map(e => ({ label: e.textContent, visible: e.getBoundingClientRect().height > 0 })),
        hasMembers: !!document.querySelector('.chat-members'),
        visibleMembers: document.querySelector('.chat-members')?.getBoundingClientRect().width > 0,
        mobileList: document.querySelector('[data-mobile-view]')?.dataset.mobileView,
      }));
      assert(!result.overflow, `${id}: overflow at ${width}/${theme}`);
      assert(result.dark === (theme === 'dark'), `${id}: wrong theme at ${width}/${theme}`);
      assert(result.railLabels.every(l => l.visible), `${id}: hidden rail labels at ${width}/${theme}`);
      if (width >= 1200 && result.hasMembers) assert(result.visibleMembers, `${id}: members hidden at desktop`);
      await page.screenshot({ path: path.join(output, `${id}-${width}-${theme}.png`), animations: 'disabled' });
      cases.push({ id, width, theme });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => localStorage.removeItem('studyroom-ui:chat-type'));
  await page.goto(BASE + 'home.html');
  assert(await page.getByRole('heading', { name: 'GroupChat', exact: true }).isVisible(), 'GroupChat does not replace Home');
  assert(!await page.getByText('Where to tonight, feifei?', { exact: true }).count(), 'Old Home dashboard remains');
  assert(await page.getByRole('link', { name: 'Chat', exact: true }).isVisible(), 'No labeled Chat navigation');
  assert(await page.locator('.chat-members').getByText('Mai', { exact: true }).isVisible(), 'Member name is hidden');
  assert(await page.locator('.chat-timeline').evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 2), 'Chat does not open at the latest message');
  await page.getByRole('button', { name: 'Hide members', exact: true }).click();
  assert(!await page.locator('.chat-members').isVisible(), 'Members toggle cannot hide');
  await page.getByRole('button', { name: 'Show members', exact: true }).click();
  assert(await page.locator('.chat-members').isVisible(), 'Members toggle cannot show');
  await page.getByRole('button', { name: 'GroupChat', exact: true }).click();
  await page.getByRole('menuitemradio', { name: /PrivateChat/ }).click();
  await page.waitForURL('**/messages-mai.html');
  await page.getByRole('searchbox', { name: 'Search chats', exact: true }).fill('maimai-does-not-exist');
  assert(await page.getByText('No private chats found. Try another name.', { exact: true }).isVisible(), 'Search empty state missing');
  await page.getByRole('searchbox', { name: 'Search chats', exact: true }).fill('mai');
  assert(await page.locator('.conversation-row:visible').count() === 1, 'Chat search does not filter');
  await page.locator('.conversation-row:visible').click();
  await page.waitForURL('**/messages-mai.html');
  assert(await page.locator('.conversation-identity h2').textContent() === 'Mai', 'DM selection failed');
  await page.evaluate(() => localStorage.removeItem('studyroom-ui:chat-type'));
  await page.goto(BASE + 'home.html');
  await page.getByRole('button', { name: 'Search in conversation', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search in conversation', exact: true }).fill('library');
  assert(await page.locator('.is-search-match').count() > 0, 'Conversation search failed');
  const count = await page.locator('.chat-message').count();
  await page.getByRole('textbox', { name: 'Message the room', exact: true }).fill('UI preview');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  assert(await page.locator('.chat-message').count() === count, 'Composer unexpectedly sent a message');
  await page.getByRole('link', { name: 'Walk in', exact: true }).click();
  await page.waitForURL('**/walk-library.html');
  await page.goto(BASE + 'home.html');
  await page.getByRole('button', { name: 'Make a room', exact: true }).click();
  await page.waitForURL('**/create-room.html');
  assert(await page.getByRole('dialog').isVisible(), 'Make a room dialog was lost');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForURL('**/home.html');
  await page.locator('.app-rail .rail-link[href="friends.html"]').click();
  await page.waitForURL('**/friends.html');
  await page.getByRole('link', { name: 'Shop', exact: true }).click();
  await page.waitForURL('**/shop.html');
  await page.getByRole('tab', { name: 'Pets', exact: true }).click();
  await page.waitForURL('**/shop-pets.html');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + 'home.html');
  assert(await page.locator('.conversation-list').isVisible(), 'Phone entry does not show chat list');
  await page.locator('.conversation-row').first().click();
  await page.waitForURL('**/room-chanom.html');
  assert(await page.locator('.chat-main').isVisible(), 'Phone cannot open conversation');
  await page.getByRole('button', { name: 'Show members', exact: true }).click();
  assert(await page.locator('.chat-members').getByText('Mai', { exact: true }).isVisible(), 'Phone cannot show named members');
  await page.getByRole('button', { name: 'Close members', exact: true }).click();
  await page.getByRole('link', { name: 'Back to chats', exact: true }).click();
  await page.waitForURL('**/home.html');
  await page.goto('file:///' + path.join(ROOT, 'home.html').replaceAll('\\', '/'));
  assert(await page.getByRole('heading', { name: 'GroupChat', exact: true }).isVisible(), 'Direct file preview failed');
} catch (e) { issues.push(e.message); }
finally { await browser.close(); }
const report = { checkedAt: new Date().toISOString(), checkedPages: manifest.uiRevision.files.length, screenshots: cases.length, issues: [...new Set(issues)] };
await writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.issues.length ? 1 : 0;
