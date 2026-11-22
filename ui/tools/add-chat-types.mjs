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
const files = [...new Set([...manifest.roomPreviewRevision.files, 'messages-mai.html', 'messages-jod.html', 'messages-ken.html'])];
try {
  for (const file of files) {
    const original = await readFile(path.join(ROOT, file), 'utf8');
    const scripts = [...original.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
    await page.setContent(original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
    const html = await page.evaluate(scripts => {
      const rows = [...document.querySelectorAll('[data-chat-row]')];
      for (const row of rows) row.dataset.chatKind = row.getAttribute('href').startsWith('messages-') ? 'private' : 'group';
      const selected = rows.find(r => r.classList.contains('is-active'))?.dataset.chatKind || 'group';
      const shell = document.querySelector('[data-chat-layout]');
      shell.dataset.chatType = selected;
      const title = selected === 'group' ? 'GroupChat' : 'PrivateChat';
      const chevron = '<svg class="chat-type-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
      const check = '<svg class="chat-type-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
      const icons = {
        group: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
        private: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
      };
      const switcher = document.createElement('div'); switcher.className = 'chat-type-switcher';
      switcher.innerHTML = `<h1><button class="chat-type-trigger" type="button" data-chat-type-trigger aria-haspopup="menu" aria-controls="chat-type-menu" aria-expanded="false"><span data-chat-type-label>${title}</span>${chevron}</button></h1>
        <div class="chat-type-menu" id="chat-type-menu" role="menu" aria-label="Chat type" popover="auto">${[['group', 'GroupChat', 'Rooms and communities'], ['private', 'PrivateChat', 'One-to-one conversations']].map(([kind, label, note]) => `<button class="chat-type-option" type="button" role="menuitemradio" aria-checked="${kind === selected}" data-chat-type-option="${kind}" tabindex="-1"><svg class="chat-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind]}</svg><span><strong>${label}</strong><small>${note}</small></span>${check}</button>`).join('')}</div>`;
      const header = document.querySelector('.chat-list-header');
      const previous = header.querySelector('.chat-type-switcher') || header.querySelector('h1'); previous.replaceWith(switcher);
      const create = header.querySelector('[aria-label="Make a room"]');
      const compose = header.querySelector('[aria-label="New message"]');
      if (create) { create.dataset.chatActionKind = 'group'; create.hidden = selected !== 'group'; }
      if (compose) { compose.dataset.chatActionKind = 'private'; compose.hidden = selected !== 'private'; }
      for (const row of rows) row.hidden = row.dataset.chatKind !== selected;
      for (const src of scripts) {
        const script = document.createElement('script'); script.src = src;
        (src === 'assets/theme.js' ? document.head : document.body).append(script);
      }
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, scripts);
    await writeFile(path.join(ROOT, file), await prettier.format(html, { parser: 'html', printWidth: 120 }));
  }
  manifest.chatTypeRevision = { date: '2026-11-16', description: 'Dropdown title switches GroupChat rooms and PrivateChat one-to-one conversations', files };
  await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Added GroupChat / PrivateChat dropdown to ${files.length} pages.`);
} finally { await browser.close(); }
