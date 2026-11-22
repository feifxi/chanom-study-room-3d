import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capture = JSON.parse(await readFile(path.join(ROOT, 'tools/capture-data.json'), 'utf8'));
const require = createRequire(path.join(capture.source, 'package.json'));
const { chromium } = require('playwright');
const prettier = require('prettier');
const pages = capture.records.filter(r => !r.failed);
const existing = new Set(pages.map(r => r.id));
const routeMap = Object.fromEntries(pages.filter(r => !r.actions.length && !r.viewer).map(r => [r.url, r.id + '.html']));
for (const r of pages.filter(r => r.group === 'Admin')) routeMap[r.url] = r.id + '.html';
routeMap['/home/messages'] = 'messages.html';
routeMap['/checkout'] = 'checkout-monthly.html';
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const page = await browser.newPage();
// Annotation is an authoring operation. It never runs the original JS or a server.
await page.route('**/*', r => r.abort());

async function annotate(body, recipe) {
  await page.setContent(body, { waitUntil: 'domcontentloaded' });
  return page.evaluate(({ recipe, routeMap, existing }) => {
    const exists = new Set(existing);
    const bind = (element, target) => { if (exists.has(target)) element.dataset.uiGo = target + '.html'; };
    const base = recipe.back || recipe.id;
    const inRoom = recipe.id.startsWith('walk-') || recipe.id.startsWith('common-');
    const phoneRoom = inRoom && !document.querySelector('button[aria-label^="In this room ·"]');
    const normalize = text => text.replace(/\s+/g, ' ').trim();
    const settings = {
      'My profile': 'profile', 'My character': 'character', 'Appearance': 'appearance',
      'Voice & sound': 'voice', 'Controls': 'controls', 'Notifications': 'notifications',
      'Privacy & safety': 'privacy', 'Plus & billing': 'plus', 'Account': 'account',
    };
    const roomSettings = { 'Overview': 'overview', 'Map & look': 'map', 'Members & roles': 'members', 'Invites': 'invites', 'Rules & safety': 'safety' };
    const shop = { Everything: 'shop', Outfits: 'shop-outfits', Accessories: 'shop-accessories', Pets: 'shop-pets', 'Photo frames': 'shop-frames' };
    const mapByRoom = { 'chanom/library': 'library', 'chanom/cafe': 'cafe', 'chanom/rooftop': 'rooftop', 'cpe/exam-hall': 'library', 'cpe/lounge': 'cafe' };
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href.startsWith('#') || href.startsWith('mailto:')) return;
      const url = new URL(href, 'http://localhost:3100');
      let target = routeMap[url.pathname + url.search] || routeMap[url.pathname];
      if (!target && url.pathname.startsWith('/servers/') && url.pathname.includes('/rooms/')) {
        const m = url.pathname.match(/\/servers\/([^/]+)\/rooms\/([^/]+)/);
        const map = mapByRoom[`${m[1]}/${m[2]}`] || (m[2].includes('cafe') ? 'cafe' : m[2].includes('rooftop') ? 'rooftop' : 'library');
        target = `walk-${map}.html`;
      }
      if (target) a.setAttribute('href', target + url.hash);
      else if (url.origin === 'http://localhost:3100') {
        a.setAttribute('href', 'catalogue.html'); a.dataset.originalHref = href;
      }
      a.removeAttribute('data-discover');
    });
    document.querySelectorAll('button,[role="menuitem"],[role="tab"]').forEach(b => {
      const text = normalize(b.textContent);
      const aria = b.getAttribute('aria-label') || '';
      if (aria === 'Demo controls') { b.dataset.uiToolbar = ''; return; }
      if (aria === 'You') bind(b, 'profile-menu');
      if (aria.startsWith('Inbox,')) bind(b, 'inbox');
      if (aria === 'Messages' && !inRoom) bind(b, 'messages');
      if (text === 'Character & settings') bind(b, 'settings-profile');
      if (settings[text] && recipe.group === 'Settings') bind(b, 'settings-' + settings[text]);
      if (text === 'Edit my character') bind(b, 'settings-character');
      if (text === 'Make a room' && recipe.id !== 'create-room') bind(b, 'create-room');
      if (recipe.url === '/home') {
        if (text === 'All') bind(b, 'home');
        if (text === 'You run') bind(b, 'home-you-run');
        if (text === 'Active') bind(b, 'home-active');
      }
      if (/^Requests\s*\d*$/.test(text)) bind(b, 'friend-requests');
      if (text === 'Add friend' && recipe.id !== 'friend-add') bind(b, 'friend-add');
      if (aria.startsWith('More for ')) bind(b, 'room-menu');
      if (text === 'About this room') bind(b, 'room-about');
      if (text === 'Invite friends' || aria === 'Invite') bind(b, 'room-invite');
      if (text === 'Room settings') bind(b, 'room-settings-overview');
      if (recipe.group === 'Room settings' && roomSettings[text]) bind(b, 'room-settings-' + roomSettings[text]);
      if (recipe.url === '/home/shop') {
        if (shop[text]) bind(b, shop[text]);
        if (text.includes('Try it on')) bind(b, 'shop-try-on');
        if (text === 'Back to the shop') bind(b, 'shop');
      }
      if (inRoom) {
        if (aria.startsWith('Study session:')) bind(b, 'walk-study');
        if (aria.startsWith('Today’s quests:')) bind(b, 'walk-quests');
        if (aria === 'How to play') bind(b, 'walk-help');
        if (aria.startsWith('In this room ·')) bind(b, recipe.id === 'walk-people' ? base : 'walk-people');
        if (aria === 'Activities') bind(b, recipe.id === 'walk-activities' ? base : 'walk-activities');
        if (aria === 'Room tools') bind(b, 'walk-tools');
        if (aria.startsWith('Room:')) bind(b, recipe.id === 'walk-card' ? base : 'walk-card');
        if (text === 'Leave') bind(b, 'home');
        if (/^(Close|Close .+)/.test(aria)) bind(b, base);
        if (aria === 'Hide chat' || aria === 'Chat') b.dataset.uiHideChat = '';
        if (aria === 'Chat' && phoneRoom) bind(b, 'walk-people');
      }
      if (recipe.url === '/login') {
        if (text.startsWith('Continue with')) bind(b, 'login-age');
        if (text === 'Email me a code') bind(b, 'login-code');
        if (text === 'Continue') bind(b, recipe.id === 'login-age' ? 'login-character' : 'login-age');
        if (recipe.id === 'login-character' && b.type === 'submit') bind(b, 'home');
        if (aria === 'Back' || text === 'Back') bind(b, base);
      }
      if (recipe.url.startsWith('/invite')) {
        if (text === 'Next') bind(b, 'invite-character');
        if (text === 'Walk in') bind(b, 'walk-guest');
        if (text === 'Back') bind(b, 'invite');
      }
      if (recipe.id === 'checkout' || recipe.id === 'checkout-monthly' || recipe.id === 'checkout-promptpay') {
        if (text.includes('PromptPay')) bind(b, 'checkout-promptpay');
        if (text === 'Card') bind(b, 'checkout');
      }
      if (recipe.back && (text === 'Close' || aria === 'Close' || b.dataset.slot === 'dialog-close')) bind(b, base);
      if (['Light', 'Dark', 'System', 'light', 'dark', 'system'].includes(text)) b.dataset.uiTheme = text.toLowerCase();
      const palettes = { 'Strawberry milk': 'strawberry', 'Thai tea': 'thaitea', 'Matcha latte': 'matcha', 'Blueberry soda': 'blueberry', 'Taro bubble tea': 'taro', 'Cocoa': 'cocoa', 'Lemon soda': 'lemon', 'Mint choco': 'mintchoco', 'Cherry cola': 'cherry', 'Mono': 'mono' };
      if (palettes[text] || palettes[aria]) b.dataset.uiPalette = palettes[text] || palettes[aria];
    });
    document.querySelectorAll('[data-slot="dialog-overlay"]').forEach(e => bind(e, base));
    document.querySelectorAll('form').forEach(form => { form.dataset.uiForm = ''; });
    document.querySelectorAll('button[aria-label="Send"],button[aria-label="Attach image"]').forEach(e => {
      e.disabled = true; e.title = 'Static UI preview';
    });
    if (inRoom) {
      document.querySelectorAll('button[aria-label="Hide chat"]').forEach(b => {
        const panel = b.closest('.panel') || b.closest('section');
        if (panel) panel.dataset.uiChatPanel = '';
      });
      document.querySelectorAll('input[placeholder],textarea').forEach(e => {
        if (/message|say |bubble/i.test(e.getAttribute('placeholder') || '')) { e.readOnly = true; e.title = 'Static UI preview'; }
      });
      document.querySelectorAll('[aria-label="Zoom in"],[aria-label="Zoom out"]').forEach(e => e.dataset.uiZoom = e.getAttribute('aria-label') === 'Zoom in' ? '1' : '-1');
    }
    if (recipe.back && document.querySelector('[role="dialog"]')) document.body.dataset.uiBack = recipe.back + '.html';
    document.querySelectorAll('[style*="translateZ"]').forEach(e => e.style.removeProperty('transform'));
    // Static Radix portals need a small viewport-aware anchor instead of the
    // screen coordinates measured on the original desktop.
    document.querySelectorAll('[data-radix-popper-content-wrapper]').forEach(e => e.dataset.uiPopover = '');
    // Home cards and room rows can be filtered without the original app state.
    if (recipe.url === '/home') {
      document.querySelectorAll('a[href^="room-"]').forEach(a => {
        const card = a.closest('.group') || a.parentElement;
        card.dataset.uiSearchItem = normalize(card.textContent).toLowerCase();
      });
      const search = document.querySelector('input[placeholder="Find a room"]');
      if (search) search.dataset.uiSearch = '';
    }
    return document.body.innerHTML;
  }, { recipe, routeMap, existing: [...existing] });
}

try {
  for (const recipe of pages) {
    let body = await annotate(recipe.data.body, recipe);
    if (recipe.mobile) body = `<div class="ui-desktop">${body}</div><div class="ui-phone">${await annotate(recipe.mobile.body, recipe)}</div>`;
    let head = recipe.data.head.replace(/<style[^>]*>[\s\S]*?<\/style>/g, match => match.includes('__nextjs-Geist') ? '' : match).replace(/<title>[\s\S]*?<\/title>/, `<title>${recipe.title} · Connecta UI</title>`);
    head += '\n<link rel="stylesheet" href="assets/overrides.css">\n<script src="assets/theme.js"></script>';
    const html = `<!doctype html><html lang="en" class="${recipe.data.rootClass}" data-palette="strawberry" data-ui-page="${recipe.id}"><head>${head}</head><body class="${recipe.data.bodyClass}"${recipe.back ? ` data-ui-back="${recipe.back}.html"` : ''}>\n<!-- Editable HTML captured from ${recipe.url}. Custom styles belong in assets/overrides.css. -->\n${body}\n<script src="assets/prototype.js"></script></body></html>`;
    await writeFile(path.join(ROOT, `${recipe.id}.html`), await prettier.format(html, { parser: 'html', printWidth: 120, tabWidth: 2 }));
  }
} finally { await browser.close(); }
const manifest = { capturedAt: capture.capturedAt, source: capture.source, pages: pages.map(({ id, url, title, group, back }) => ({ id, file: id + '.html', url, title, group, back })), failures: capture.records.filter(r => r.failed).map(({ id, failed }) => ({ id, error: failed })) };
await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(path.join(ROOT, 'assets/pages.js'), `window.UI_PAGES = ${JSON.stringify(manifest.pages, null, 2)};\n`);
const groups = [...new Set(pages.map(p => p.group))];
const list = groups.map(group => `<section class="panel p-5"><h2 class="mb-3 text-xl font-black">${group}</h2><div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">${pages.filter(p => p.group === group).map(p => `<a class="rounded-xl border p-3 text-sm font-bold hover:bg-muted" href="${p.id}.html">${p.title}</a>`).join('')}</div></section>`).join('');
const catalogueHead = pages[0].data.head.replace(/<style[^>]*>[\s\S]*?<\/style>/g, match => match.includes('__nextjs-Geist') ? '' : match).replace(/<title>[\s\S]*?<\/title>/, '');
const catalogue = `<!doctype html><html lang="en" class="${pages[0].data.rootClass}"><head>${catalogueHead}<title>Page catalogue · Connecta UI</title><link rel="stylesheet" href="assets/overrides.css"><script src="assets/theme.js"></script></head><body class="app-bg"><main class="mx-auto flex max-w-6xl flex-col gap-5 p-5 sm:p-8"><div class="flex flex-wrap items-center gap-3"><h1 class="mr-auto text-3xl font-black">Connecta UI</h1><a class="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground" href="home.html">Open Home</a><button class="rounded-full border bg-card px-5 py-2 font-bold" data-ui-toolbar>Preview controls</button></div><p class="text-sm text-muted-foreground">${pages.length} editable HTML screens from the original demo. Room and character views use real screenshots.</p>${list}</main><script src="assets/prototype.js"></script></body></html>`;
await writeFile(path.join(ROOT, 'catalogue.html'), await prettier.format(catalogue, { parser: 'html', printWidth: 120 }));
console.log(`Built ${pages.length} HTML screens and catalogue.html`);
