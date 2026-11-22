import { readFile, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage();
const issues = [], measurements = [];
const assert = (value, message) => { if (!value) issues.push(message); };
const base = 'http://localhost:3200/';
page.on('pageerror', e => issues.push(e.message));
page.on('response', r => { if (r.status() >= 400) issues.push(`${r.status()}: ${r.url()}`); });
try {
  for (const width of [390, 768, 1024, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(base + 'friends.html');
    await page.evaluate(t => localStorage.setItem('studyroom-ui:theme', t), theme);
    for (const file of [...manifest.mainPagesRevision.files, 'inbox.html', 'profile-menu.html']) {
      await page.goto(base + file); await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const box = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height }; };
        return {
          overflow:document.documentElement.scrollWidth > innerWidth + 1,
          images:[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
          popup:box('[data-ui-popover]'),rail:box('.app-rail'),hero:box('.discover-intro'),promo:box('.shop-promo'),
          people:document.querySelectorAll('[data-friend-row]').length,
          private:document.querySelector('main')?.textContent.includes('A private room'),
          products:document.querySelectorAll('.shop-product-grid > button').length,
          links:[...document.querySelectorAll('a[href],[data-ui-go]')].map(e => e.getAttribute('href') || e.dataset.uiGo),
        };
      });
      const label = `${file}/${width}/${theme}`;
      assert(!result.overflow, `${label}: horizontal overflow`);
      assert(!result.images.length, `${label}: missing images`);
      if (result.popup) assert(result.popup.left >= result.rail.right && result.popup.right <= width && result.popup.top >= 0 && result.popup.bottom <= (width === 390 ? 844 : 1000), `${label}: popup bounds`);
      if (result.hero && width === 1440) assert(result.hero.height < 200, `${label}: hero too tall`);
      if (result.people) assert(result.people === 6 && !result.private, `${label}: friend content`);
      if (result.promo) assert(result.promo.height < 200 && result.products > 0, `${label}: shop density`);
      if (width === 1440 && theme === 'light') {
        for (const link of new Set(result.links)) {
          if (!link || /^(#|https?:|mailto:)/.test(link)) continue;
          try { await stat(path.join(ROOT, link.split(/[?#]/)[0])); } catch { issues.push(`${file}: broken link ${link}`); }
        }
        measurements.push({ file, ...result, links:undefined });
      }
      if (['friends.html','discover.html','shop.html','inbox.html','profile-menu.html'].includes(file) && [390,1440].includes(width)) {
        await page.screenshot({ path:path.join(ROOT, `reference/main-pages/${file.replace('.html','')}-${width}-${theme}.png`), animations:'disabled' });
      }
    }
  }
  await page.goto(base + 'friends.html');
  await page.locator('[data-friends-search]').fill('earth');
  assert(await page.locator('[data-friend-row]:visible').count() === 1, 'Friends search should show one match');
  assert(await page.locator('[data-friend-row]:visible').innerText().then(t => t.includes('Earth') && t.includes('Jamming')), 'Earth activity retained');
  await page.locator('[data-friends-search]').fill('no-such-friend');
  assert(await page.locator('[data-friend-row]:visible').count() === 0 && await page.locator('.friends-empty').isVisible(), 'Friends search empty state');
  await page.goto(base + 'friends.html'); await page.getByRole('button', { name:'Add friend', exact:true }).click();
  await page.waitForURL('**/friend-add.html'); assert(await page.locator('[role="dialog"],dialog').first().isVisible(), 'Add friend dialog');
  await page.goto(base + 'shop.html');
  assert(await page.locator('.shop-product-grid > button').count() === 13, 'Shop default products');
  await page.locator('.shop-quests summary').click(); assert(await page.locator('.shop-quests').getAttribute('open') !== null, 'Quests disclosure');
  await page.getByRole('tab', { name:'Pets', exact:true }).click(); await page.waitForURL('**/shop-pets.html');
  assert(await page.locator('.shop-product-grid > button').count() === 3, 'Shop pet filter');
  await page.goto(base + 'shop.html'); await page.getByRole('button', {name:'Try it on',exact:true}).click();
  assert(await page.locator('.shop-try-list strong').textContent() === 'Pet Duckling', 'Featured Shop item is tried on in place');
  await page.goto(base + 'inbox.html');
  for (const width of [390,1440]) {
    await page.setViewportSize({width,height:1000});
    const bounds=await page.locator('.inbox-content').boundingBox();
    assert(bounds.width > width * .7 && bounds.x + bounds.width <= width, `Inbox page resize ${width}`);
  }
} finally { await browser.close(); }
await writeFile(path.join(ROOT,'reference/main-pages/verification.json'), JSON.stringify({issues,measurements},null,2));
console.log(JSON.stringify({issues,checked:13*8},null,2));
if (issues.length) process.exitCode=1;
