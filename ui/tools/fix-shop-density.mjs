import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright'); const prettier = require('prettier');
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage(); await page.route('**/*', r => r.abort());
try {
  for (const file of manifest.mainPagesRevision.files.filter(f => f.startsWith('shop'))) {
    const html = await readFile(path.join(ROOT, file), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
    await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(scripts => {
      const catalogue = document.querySelector('.shop-catalogue');
      const promoCopy = catalogue.querySelector('.shop-promo > div:first-child');
      if (!promoCopy.querySelector('h2')) {
        promoCopy.querySelector(':scope > span')?.remove();
        const title = document.createElement('h2'); title.textContent = 'Pet Duckling';
        promoCopy.prepend(title);
      }
      catalogue.querySelectorAll('.shop-product-grid,.shop-product-card,.shop-product-art,.shop-product-info').forEach(e => e.classList.remove('shop-product-grid', 'shop-product-card', 'shop-product-art', 'shop-product-info'));
      const grid = [...catalogue.children].filter(e => e.classList.contains('grid')).at(-1); grid.classList.add('shop-product-grid');
      grid.querySelectorAll(':scope > button').forEach(card => { card.classList.add('shop-product-card'); card.firstElementChild.classList.add('shop-product-art'); card.lastElementChild.classList.add('shop-product-info'); });
      for (const src of scripts) { const js = document.createElement('script'); js.src = src; (src === 'assets/theme.js' ? document.head : document.body).append(js); }
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, scripts);
    await writeFile(path.join(ROOT, file), await prettier.format(result, { parser: 'html', printWidth: 120 }));
  }
} finally { await browser.close(); }
