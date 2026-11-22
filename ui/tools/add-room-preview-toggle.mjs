import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright');
const prettier = require('prettier');
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage();
await page.route('**/*', r => r.abort());
try {
  for (const file of manifest.roomPreviewRevision.files) {
    const html = await readFile(path.join(ROOT, file), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
    await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(scripts => {
      const peek = document.querySelector('.room-peek');
      const img = peek.querySelector('.room-peek-image'); img.id = 'room-preview-image';
      peek.dataset.collapsed = 'false';
      peek.querySelector('.room-peek-snapshot')?.remove();
      if (!peek.querySelector('.room-peek-compact-map')) {
        const compactName = document.createElement('span'); compactName.className = 'room-peek-compact-map';
        compactName.textContent = peek.querySelector('.room-peek-map').textContent;
        peek.querySelector('.room-peek-invitation > div:last-child').prepend(compactName);
      }
      if (!peek.querySelector('[data-room-preview-toggle]')) {
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'room-peek-toggle';
        toggle.setAttribute('data-room-preview-toggle', ''); toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-controls', img.id); toggle.setAttribute('aria-label', 'Collapse room preview');
        toggle.title = 'Collapse room preview';
        toggle.innerHTML = '<span data-room-preview-toggle-label>Hide preview</span><svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>';
        peek.append(toggle);
      }
      for (const src of scripts) {
        const script = document.createElement('script'); script.src = src;
        (src === 'assets/theme.js' ? document.head : document.body).append(script);
      }
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, scripts);
    await writeFile(path.join(ROOT, file), await prettier.format(result, { parser: 'html', printWidth: 120 }));
  }
  manifest.roomPreviewRevision.collapsible = true;
  await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Added collapse/expand control to ${manifest.roomPreviewRevision.files.length} room-chat pages.`);
} finally { await browser.close(); }
