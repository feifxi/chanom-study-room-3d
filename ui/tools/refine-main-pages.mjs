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
const parser = await browser.newPage();
await parser.route('**/*', r => r.abort());
const svg = (paths, cls = '') => `<svg class="chat-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const message = svg('<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>');
const search = svg('<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>');
const plus = svg('<path d="M12 5v14M5 12h14"/>');
const arrow = svg('<path d="M5 12h14m-6-6 6 6-6 6"/>');
const friends = [
  { name: 'Mai', handle: 'maimai', color: '#7758c4', presence: 'focus', activity: 'Focusing · Calculus', place: 'Chanom Friends', message: 'messages-mai.html', join: 'walk-library.html' },
  { name: 'Jod', handle: 'jod.dev', color: '#a65728', presence: 'focus', activity: 'Focusing · Kuy pawa', place: 'Chanom Friends', message: 'messages-jod.html', join: 'walk-library.html' },
  { name: 'Ploy', handle: 'ployy', color: '#a65728', presence: 'online', activity: 'Walking around the Library', place: 'Chanom Friends', join: 'walk-library.html' },
  { name: 'Mook', handle: 'mookie', color: '#8652a0', presence: 'online', activity: 'In a Common room', place: 'Cat Café', join: 'common-cafe-2.html' },
  { name: 'Earth', handle: 'earth.k', color: '#2f7755', presence: 'online', activity: 'Jamming' },
  { name: 'Nam', handle: 'namwhan', color: '#2e6ea8', presence: 'idle', activity: 'On a break' },
];
const avatar = p => `<span class="friend-avatar" style="--friend-color:${p.color}"><span>${p.name[0]}</span><i class="friend-presence-${p.presence}" aria-label="${p.presence}"></i></span>`;
const faceStack = names => `<div class="friend-face-stack" aria-hidden="true">${names.map(n => avatar(friends.find(p => p.name === n))).join('')}</div>`;
const friendsPage = `<div class="friends-page page-refined"><header class="friends-heading"><div><h1>Friends</h1><p>Your people, a little closer.</p></div><div class="friends-header-actions"><button class="page-button page-button-quiet" data-ui-go="friend-requests.html">Requests <span class="friend-request-count">1</span></button><button class="page-button page-button-primary" data-ui-go="friend-add.html">${plus}Add friend</button></div></header>
  <section class="friends-now" aria-labelledby="friends-now-title"><div class="friends-section-heading"><h2 id="friends-now-title">Hanging out now</h2><span>5 friends around</span></div><div class="friends-hangouts">
    <article class="friend-hangout friend-hangout-library"><div class="friend-hangout-copy">${faceStack(['Mai', 'Jod', 'Ploy'])}<h3>Mai, Jod and Ploy</h3><p>Together in Chanom Friends</p><a class="friend-join" href="walk-library.html">Join them ${arrow}</a></div><div class="friend-hangout-image"><img src="assets/captures/library-social-cover.png" alt="The original 3D Library where friends are hanging out"></div></article>
    <article class="friend-hangout friend-hangout-cafe"><div class="friend-hangout-copy">${faceStack(['Mook'])}<h3>Mook is hanging out</h3><p>Cat Café Common Room #2</p><a class="friend-join" href="common-cafe-2.html">Join Mook ${arrow}</a></div><div class="friend-hangout-image"><img src="assets/captures/walk-cafe-0.png" alt="The original 3D Cat Café Common room"></div></article>
  </div></section>
  <section class="friends-directory" aria-labelledby="friends-directory-title"><div class="friends-directory-heading"><div><h2 id="friends-directory-title">Your friends <span>6</span></h2><p>A face, a status, and a way to say hello.</p></div><label class="friends-search">${search}<input type="search" placeholder="Search friends" aria-label="Search friends" data-friends-search autocomplete="off"></label></div>
    <div class="friends-roster">${friends.map(p => `<article class="friend-row" data-friend-row data-friend-search="${p.name.toLowerCase()} ${p.handle} ${p.activity.toLowerCase()}">${avatar(p)}<div class="friend-row-identity"><h3>${p.name}</h3><p>@${p.handle}</p></div><div class="friend-row-activity"><span>${p.activity}</span>${p.place ? `<small>${p.place}</small>` : ''}</div><span class="friend-status friend-status-${p.presence}">${p.presence === 'focus' ? 'Focusing' : p.presence === 'idle' ? 'Away' : 'Online'}</span><div class="friend-row-actions">${p.join ? `<a href="${p.join}" class="friend-row-join">Join</a>` : ''}${p.message ? `<a href="${p.message}" class="chat-icon-button" aria-label="Message ${p.name}">${message}</a>` : `<button class="chat-icon-button" aria-label="Message ${p.name}" data-page-preview>${message}</button>`}</div></article>`).join('')}<p class="friends-empty" role="status" hidden>No friends found. Try another name.</p></div>
  </section></div>`;
const files = ['friends.html', 'friend-add.html', 'friend-requests.html', 'discover.html', 'discover-guest.html', 'shop.html', 'shop-outfits.html', 'shop-accessories.html', 'shop-pets.html', 'shop-frames.html', 'shop-try-on.html'];
try {
  for (const file of files) {
    const html = await readFile(path.join(ROOT, file), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
    await parser.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
    const updated = await parser.evaluate(({ file, friendsPage, scripts }) => {
      const main = document.querySelector('.rail-page-content');
      if (file.startsWith('friend')) {
        main.innerHTML = friendsPage;
      } else if (file.startsWith('discover')) {
        const root = main.firstElementChild; root.classList.add('discover-page', 'page-refined');
        const header = root.querySelector('header'); header.classList.add('discover-intro');
        header.querySelector(':scope > span')?.remove();
        const copy = header.querySelector(':scope > div'); copy.classList.add('discover-intro-copy');
        const title = copy.querySelector('h1');
        const status = copy.querySelector(':scope > p');
        const titleRow = document.createElement('div'); titleRow.className = 'discover-title-row'; title.before(titleRow); titleRow.append(title, status);
        status.className = 'discover-live';
        copy.querySelector(':scope > p')?.classList.add('discover-description');
        const searchInput = copy.querySelector('input'); searchInput.setAttribute('aria-label', 'Search open rooms'); searchInput.parentElement.classList.add('discover-search');
        const featured = header.querySelector(':scope > div:last-child'); featured.classList.add('discover-featured');
        const paragraphs = [...featured.querySelectorAll(':scope > p')]; paragraphs[0]?.remove(); paragraphs[1]?.remove();
        root.querySelectorAll(':scope > section').forEach(s => s.classList.add('discover-room-section'));
      } else if (file.startsWith('shop')) {
        const layout = main.firstElementChild; layout.classList.add('shop-layout');
        const aside = layout.querySelector(':scope > aside'); aside.classList.add('shop-sidebar');
        aside.firstElementChild.classList.add('shop-heading');
        const portrait = aside.querySelector('img.captured-scene')?.closest('div.relative');
        if (portrait) portrait.classList.add('shop-avatar');
        aside.querySelectorAll(':scope > button').forEach(b => b.classList.add('shop-preview-action'));
        const quest = aside.querySelector(':scope > section');
        if (quest && !aside.querySelector('details.shop-quests')) {
          const details = document.createElement('details'); details.className = 'shop-quests';
          const summary = document.createElement('summary'); summary.innerHTML = '<span>Today’s quests</span><span>0 / 3</span>';
          quest.before(details); details.append(summary, quest);
        }
        aside.querySelector(':scope > p')?.classList.add('shop-note');
        const catalogue = layout.querySelector(':scope > section'); catalogue.classList.add('shop-catalogue');
        const promo = catalogue.querySelector(':scope > div:first-child'); promo.classList.add('shop-promo');
        promo.querySelector(':scope > div:first-child > span')?.remove();
        const art = promo.querySelector(':scope > div:last-child'); art.classList.add('shop-feature-art');
        art.querySelectorAll('span').forEach(s => {
          if (!s.textContent.trim() || s.textContent.trim() === '✨') s.remove();
          else s.classList.add('shop-promo-emoji');
        });
        const tabs = catalogue.querySelector('[data-slot="tabs"]') || catalogue.querySelector('[role="tablist"]')?.parentElement;
        tabs?.classList.add('shop-tabs');
        const grid = [...catalogue.children].filter(c => c.classList.contains('grid')).at(-1); grid?.classList.add('shop-product-grid');
        grid?.querySelectorAll(':scope > button').forEach(card => {
          card.classList.add('shop-product-card'); card.firstElementChild?.classList.add('shop-product-art'); card.lastElementChild?.classList.add('shop-product-info');
        });
      }
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'assets/main-pages.css'; document.head.append(css);
      for (const src of [...scripts, 'assets/main-pages.js']) { const script = document.createElement('script'); script.src = src; (src === 'assets/theme.js' ? document.head : document.body).append(script); }
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, { file, friendsPage, scripts });
    await writeFile(path.join(ROOT, file), await prettier.format(updated, { parser: 'html', printWidth: 120 }));
  }
  manifest.mainPagesRevision = { date: '2026-11-16', description: 'Rail-safe account popovers, compact Discover and Shop, profile-led Friends', files };
  await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Refined ${files.length} pages and state variants.`);
} finally { await browser.close(); }
