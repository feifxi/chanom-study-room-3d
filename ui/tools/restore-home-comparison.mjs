import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Restore only comparison pages from the saved capture. Leave the current UI intact.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capture = JSON.parse(await readFile(path.join(root, 'tools/capture-data.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const require = createRequire(path.join(capture.source, 'package.json'));
const { chromium } = require('playwright');
const prettier = require('prettier');
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage();
await page.route('**/*', request => request.abort());
const routes = Object.fromEntries(manifest.pages.map(p => [p.url, p.file]));
routes['/home'] = 'home-old.html';
const variants = [['home', 'home-old'], ['home-active', 'home-old-active'], ['home-you-run', 'home-old-you-run']];
try {
  for (const [sourceId, targetId] of variants) {
    const original = capture.records.find(r => r.id === sourceId);
    await page.setContent(original.data.body, { waitUntil: 'domcontentloaded' });
    const body = await page.evaluate(routes => {
      document.querySelectorAll('a[href^="/"]').forEach(a => {
        const url = new URL(a.getAttribute('href'), 'http://localhost:3100');
        let href = routes[url.pathname + url.search] || routes[url.pathname];
        if (!href && url.pathname.includes('/rooms/')) href = url.pathname.includes('rooftop') ? 'walk-rooftop.html' : /cafe|lounge/.test(url.pathname) ? 'walk-cafe.html' : 'walk-library.html';
        a.href = (href || 'catalogue.html') + url.hash;
      });
      document.querySelectorAll('button').forEach(b => {
        const text = b.textContent.replace(/\s+/g, ' ').trim();
        const aria = b.getAttribute('aria-label') || '';
        const targets = { All: 'home-old', Active: 'home-old-active', 'You run': 'home-old-you-run', 'Make a room': 'create-room' };
        let target = targets[text];
        if (aria === 'You') target = 'profile-menu';
        if (aria === 'Messages') target = 'messages';
        if (aria.startsWith('Inbox,')) target = 'inbox';
        if (aria.startsWith('More for ')) target = 'room-menu';
        if (aria === 'Demo controls') b.dataset.uiToolbar = '';
        if (target) b.dataset.uiGo = target + '.html';
      });
      document.querySelectorAll('a[href^="room-"]').forEach(a => {
        const card = a.closest('.group') || a.parentElement;
        card.dataset.uiSearchItem = card.textContent.toLowerCase();
      });
      const search = document.querySelector('input[placeholder="Find a room"]');
      if (search) search.dataset.uiSearch = '';
      return document.body.innerHTML;
    }, routes);
    const html = `<!doctype html><html lang="en" class="${original.data.rootClass}" data-ui-page="${targetId}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Original Home · Connecta UI</title><link rel="stylesheet" href="assets/source/4f2683abfb221e.css"><link rel="stylesheet" href="assets/overrides.css"><script src="assets/theme.js"></script></head><body class="${original.data.bodyClass}"><!-- Original Home, restored from the saved demo capture for comparison. -->${body}<script src="assets/prototype.js"></script></body></html>`;
    await writeFile(path.join(root, targetId + '.html'), await prettier.format(html, { parser: 'html', printWidth: 120 }));
    if (!manifest.pages.some(p => p.id === targetId)) manifest.pages.push({ id: targetId, file: targetId + '.html', url: original.url, title: sourceId === 'home' ? 'Original Home' : `Original Home · ${sourceId === 'home-active' ? 'Active' : 'You run'}`, group: 'Comparison', restoredFrom: sourceId });
  }
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(root, 'assets/pages.js'), `window.UI_PAGES = ${JSON.stringify(manifest.pages, null, 2)};\n`);
} finally { await browser.close(); }
console.log('Restored home-old.html and its two filter states. Current Chats is unchanged.');
