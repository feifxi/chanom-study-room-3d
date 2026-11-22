import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
    const updated = await page.evaluate(scripts => {
      const main = document.querySelector('.chat-main');
      if (!main.querySelector('[data-pinned-toggle]')) {
        const pinIcon = '<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 9V4l1-1H7l1 1v5l-3 3v2h14v-2l-3-3M12 14v8"/></svg>';
        const oldPin = main.querySelector('.pinned-message');
        const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-icon-button pinned-toggle';
        button.setAttribute('data-pinned-toggle', ''); button.setAttribute('aria-label', 'Pinned messages');
        button.title = 'Pinned messages'; button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'pinned-messages');
        button.innerHTML = pinIcon;
        main.querySelector('[data-chat-members]').before(button);
        const popover = document.createElement('section'); popover.className = 'pinned-messages-popover';
        popover.id = 'pinned-messages'; popover.setAttribute('popover', 'auto'); popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-labelledby', 'pinned-messages-title');
        popover.innerHTML = '<header><h2 id="pinned-messages-title">Pinned messages</h2><button class="chat-icon-button" type="button" aria-label="Close pinned messages" data-pinned-close><svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header>';
        if (oldPin) {
          const item = document.createElement('a'); item.className = 'pinned-message-item';
          item.href = oldPin.getAttribute('href');
          const copy = document.createElement('span');
          const note = document.createElement('small'); note.textContent = oldPin.querySelector('small')?.textContent || 'Room event';
          const title = document.createElement('strong'); title.textContent = oldPin.querySelector('strong')?.textContent || oldPin.textContent.trim();
          copy.append(note, title); item.innerHTML = pinIcon; item.append(copy); popover.append(item);
          oldPin.remove();
        } else {
          const empty = document.createElement('p'); empty.className = 'pinned-messages-empty'; empty.textContent = 'No pinned messages yet.'; popover.append(empty);
        }
        main.append(popover);
      }
      for (const src of scripts) { const js = document.createElement('script'); js.src = src; (src === 'assets/theme.js' ? document.head : document.body).append(js); }
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, scripts);
    await writeFile(path.join(ROOT, file), await prettier.format(updated, { parser: 'html', printWidth: 120 }));
  }
  manifest.roomPreviewRevision.pins = 'Header icon opens pinned messages; no pinned strip below preview';
  await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Moved pins to the header in ${manifest.roomPreviewRevision.files.length} pages.`);
} finally { await browser.close(); }
