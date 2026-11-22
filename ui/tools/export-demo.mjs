import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Capture the running original. React and Three.js are used only by the source,
// never by the exported HTML. Re-export deliberately replaces captured pages.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.env.STUDYROOM_SOURCE || 'D:/A_SIT04/SIT4-TERM1/a_M_CapStone/Project-StudyRoom3d';
const BASE = process.env.DEMO_URL || 'http://localhost:3100';
const require = createRequire(path.join(SOURCE, 'package.json'));
const { chromium } = require('playwright');
const prettier = require('prettier');
const assets = new Map();
const records = [];
await mkdir(path.join(ROOT, 'assets/source'), { recursive: true });
await mkdir(path.join(ROOT, 'assets/captures'), { recursive: true });
await mkdir(path.join(ROOT, 'reference'), { recursive: true });

const pages = [];
const add = (id, url, title, group = 'App', actions = [], extra = {}) => {
  pages.push({ id, url, title, group, actions, ...extra });
};
const click = (name, exact = true) => ({ name, exact });
add('index', '/', 'Landing', 'Welcome');
add('login', '/login', 'Sign in', 'Welcome');
add('home', '/home', 'Home');
add('friends', '/home/friends', 'Friends');
add('messages', '/home/messages', 'Messages');
for (const id of ['mai', 'jod', 'ken']) add(`messages-${id}`, `/home/messages/${id}`, `Messages · ${id}`);
add('focus', '/home/focus', 'Focus');
add('shop', '/home/shop', 'Shop');
add('plus', '/home/plus', 'Connecta Plus');
add('discover', '/discover', 'Discover');
add('checkout', '/checkout?plan=yearly', 'Checkout · yearly', 'Welcome');
add('checkout-monthly', '/checkout?plan=monthly', 'Checkout · monthly', 'Welcome');
add('checkout-promptpay', '/checkout?plan=yearly&method=promptpay', 'Checkout · PromptPay', 'Welcome');
add('invite', '/invite/cafe-chanom', 'Room invitation', 'Welcome');
const roomIds = ['chanom', 'cpe', 'gamenight', 'study-sprint', 'ielts-buddies', 'band', 'family', 'manga', 'dorm-3b', 'cpe-lab', 'werewolf'];
for (const id of roomIds) add(`room-${id}`, `/servers/${id}`, `Room · ${id}`, 'Rooms');
for (const map of ['library', 'cafe', 'rooftop']) add(`walk-${map}`, `/servers/chanom/rooms/${map}`, `Room view · ${map}`, 'Room views');
for (const id of ['library-1', 'library-2', 'cafe-1', 'cafe-2', 'rooftop-1']) add(`common-${id}`, `/servers/public/rooms/${id}`, `Common room · ${id}`, 'Room views');
for (const name of ['', 'reports', 'users', 'rooms', 'common', 'money', 'moderation', 'maps', 'audit']) {
  add(`admin${name ? '-' + name : ''}`, `/admin${name ? '/' + name : ''}`, `Admin · ${name || 'overview'}`, 'Admin', [], { viewer: 'admin' });
}

// Extra screens expose original UI states as ordinary editable HTML files.
add('home-you-run', '/home', 'Home · You run', 'App states', [click('You run')], { back: 'home' });
add('home-active', '/home', 'Home · Active', 'App states', [click('Active')], { back: 'home' });
add('create-room', '/home', 'Make a room', 'Dialogs', [click('Make a room')], { back: 'home' });
add('friend-add', '/home/friends', 'Add friend', 'Dialogs', [click('Add friend')], { back: 'friends' });
add('friend-requests', '/home/friends', 'Friend requests', 'Dialogs', [click('Requests', false)], { back: 'friends' });
add('inbox', '/home', 'Inbox', 'Dialogs', [{ aria: 'Inbox,' }], { back: 'home' });
add('profile-menu', '/home', 'Your menu', 'Dialogs', [{ aria: 'You' }], { back: 'home' });
const settingsTabs = [
  ['profile', 'My profile'], ['character', 'My character'], ['appearance', 'Appearance'],
  ['voice', 'Voice & sound'], ['controls', 'Controls'], ['notifications', 'Notifications'],
  ['privacy', 'Privacy & safety'], ['plus', 'Plus & billing'], ['account', 'Account'],
];
for (const [id, label] of settingsTabs) {
  add(`settings-${id}`, '/home', label, 'Settings', [{ aria: 'You' }, { role: 'menuitem', name: 'Character & settings' }, click(label)], { back: 'home' });
}
const roomMenu = [{ aria: 'More for Chanom Friends' }];
add('room-menu', '/servers/chanom', 'Room menu', 'Dialogs', roomMenu, { back: 'room-chanom' });
for (const [id, name] of [['about', 'About this room'], ['invite', 'Invite friends']]) {
  add(`room-${id}`, '/servers/chanom', name, 'Dialogs', [...roomMenu, { role: 'menuitem', name }], { back: 'room-chanom' });
}
for (const [id, name] of [['overview', 'Overview'], ['map', 'Map & look'], ['members', 'Members & roles'], ['invites', 'Invites'], ['safety', 'Rules & safety']]) {
  add(`room-settings-${id}`, '/servers/chanom', `Room settings · ${name}`, 'Room settings', [...roomMenu, { role: 'menuitem', name: 'Room settings' }, click(name)], { back: 'room-chanom' });
}
for (const [id, name] of [['outfits', 'Outfits'], ['accessories', 'Accessories'], ['pets', 'Pets'], ['frames', 'Photo frames']]) {
  add(`shop-${id}`, '/home/shop', `Shop · ${name}`, 'App states', [{ role: 'tab', name }], { back: 'shop' });
}
add('shop-try-on', '/home/shop', 'Shop · try on', 'App states', [click('Try it on', false)], { back: 'shop' });
add('login-age', '/login', 'Sign in · birthday', 'Welcome', [click('Continue with Google')], { back: 'login' });
add('login-character', '/login', 'Sign in · character', 'Welcome', [click('Continue with Google'), click('Continue', false)], { back: 'login-age' });
add('login-code', '/login', 'Sign in · email code', 'Welcome', [{ fill: 'you@example.com', selector: '#email' }, click('Email me a code')], { back: 'login' });
add('invite-character', '/invite/cafe-chanom', 'Guest · character', 'Welcome', [click('Next')], { back: 'invite' });
const roomStates = [
  ['study', { aria: 'Study session:' }], ['quests', { aria: 'Today’s quests:' }],
  ['help', { aria: 'How to play' }], ['people', { aria: 'In this room ·' }],
  ['activities', { aria: 'Activities' }], ['tools', { aria: 'Room tools' }],
  ['card', { aria: 'Room: Chanom Friends' }],
];
for (const [id, action] of roomStates) add(`walk-${id}`, '/servers/chanom/rooms/library', `Room panel · ${id}`, 'Room panels', [action], { back: 'walk-library' });
add('discover-guest', '/discover', 'Discover · guest', 'Guest', [], { viewer: 'guest' });
add('walk-guest', '/servers/chanom/rooms/library?guest=Guest', 'Room view · guest', 'Guest', [], { viewer: 'guest' });

const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
let page = await ctx.newPage();
page.setDefaultTimeout(8000);

async function download(input) {
  if (!input || input.startsWith('data:') || input.startsWith('#')) return input;
  const url = new URL(input, BASE).href;
  if (assets.has(url)) return assets.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset ${response.status}: ${url}`);
  const mime = response.headers.get('content-type') || '';
  let ext = mime.includes('css') ? '.css' : mime.includes('woff2') ? '.woff2' : mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : mime.includes('jpeg') ? '.jpg' : mime.includes('svg') ? '.svg' : path.extname(new URL(url).pathname).split('?')[0];
  const dest = `assets/source/${createHash('sha256').update(url).digest('hex').slice(0, 14)}${ext}`;
  assets.set(url, dest);
  if (mime.includes('css')) {
    let css = await response.text();
    const matches = [...css.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g)];
    for (const m of matches) {
      const local = await download(new URL(m[1], url).href);
      css = css.replace(m[0], `url("${path.posix.relative('assets/source', local)}")`);
    }
    await writeFile(path.join(ROOT, dest), css);
  } else await writeFile(path.join(ROOT, dest), Buffer.from(await response.arrayBuffer()));
  return dest;
}

async function act(action) {
  if (action.fill !== undefined) return page.locator(action.selector).fill(action.fill);
  const locator = page.getByRole(action.role || 'button', { name: action.name || '', exact: action.exact ?? true });
  if (action.aria) {
    const buttons = await page.locator('button[aria-label]').all();
    for (const button of buttons) {
      if ((await button.getAttribute('aria-label')).startsWith(action.aria) && await button.isVisible()) {
        await button.click(); return;
      }
    }
    if (action.aria.startsWith('In this room') && page.viewportSize().width < 700) {
      await page.getByRole('button', { name: 'Chat', exact: true }).click(); return;
    }
    throw new Error(`Missing button: ${action.aria}`);
  }
  await locator.filter({ visible: true }).first().click();
}

async function captureCanvases(id, suffix = '') {
  const canvases = page.locator('canvas');
  const count = await canvases.count();
  const images = [];
  for (let i = 0; i < count; i++) {
    const canvas = canvases.nth(i);
    const box = await canvas.boundingBox();
    if (!box || box.width < 1 || box.height < 1) { images.push(null); continue; }
    const relative = `assets/captures/${id}${suffix}-${i}.png`;
    // Hide other DOM paint so HUD controls remain editable HTML above the still.
    await canvas.evaluate(e => e.dataset.capture = 'yes');
    const style = await page.addStyleTag({ content: 'body * { visibility:hidden !important } canvas[data-capture="yes"] { visibility:visible !important }' });
    await canvas.screenshot({ path: path.join(ROOT, relative), animations: 'disabled', omitBackground: true });
    await style.evaluate(e => e.remove());
    await canvas.evaluate(e => delete e.dataset.capture);
    images.push({ src: relative, width: box.width, height: box.height });
  }
  return images;
}

async function serialize(recipe, suffix = '') {
  const images = await captureCanvases(recipe.id, suffix);
  const sources = await page.evaluate(() => ({
    css: [...document.querySelectorAll('link[rel="stylesheet"]')].map(e => e.href),
    images: [...document.querySelectorAll('img')].map(e => e.currentSrc || e.src),
  }));
  const replacements = {};
  for (const src of [...sources.css, ...sources.images]) if (src && !src.startsWith('data:')) replacements[src] = await download(src);
  return page.evaluate(({ images, replacements }) => {
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('script, nextjs-portal, [data-nextjs-toast], [data-sonner-toaster], link[rel="preload"], link[rel="modulepreload"], link[rel="icon"]').forEach(e => e.remove());
    const walker = document.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
    const comments = []; while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach(e => e.remove());
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(e => { e.setAttribute('href', replacements[e.href]); e.removeAttribute('data-precedence'); });
    doc.querySelectorAll('img').forEach((e, i) => {
      const original = document.querySelectorAll('img')[i];
      e.setAttribute('src', replacements[original.currentSrc || original.src] || original.currentSrc || original.src);
      e.removeAttribute('srcset'); e.removeAttribute('loading'); e.removeAttribute('fetchpriority');
    });
    doc.querySelectorAll('canvas').forEach((e, i) => {
      if (!images[i]) { e.remove(); return; }
      const img = document.createElement('img');
      img.src = images[i].src; img.alt = images[i].width > 700 ? 'Screenshot of the original demo 3D room' : 'Character screenshot from the original demo';
      img.className = 'captured-scene';
      img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;pointer-events:none';
      img.dataset.source = 'Original demo canvas capture';
      e.replaceWith(img);
    });
    // R3F measures its inner wrapper in pixels. The still must follow CSS sizing.
    doc.querySelectorAll('.captured-scene').forEach(e => {
      const p = e.parentElement; p.style.width = '100%'; p.style.height = '100%';
      const outer = p.parentElement;
      if (outer?.style.position === 'relative') { outer.style.width = '100%'; outer.style.height = '100%'; }
    });
    // Projected 3D labels are anchored to the captured viewport, not a live camera.
    doc.querySelectorAll('[style*="translate3d"]').forEach(e => {
      const match = e.style.transform.match(/translate3d\(([\d.-]+)px,\s*([\d.-]+)px,\s*0(?:px)?\)/);
      if (match) { e.style.left = `${+match[1] / innerWidth * 100}%`; e.style.top = `${+match[2] / innerHeight * 100}%`; e.style.transform = 'translate(-50%, -100%)'; }
    });
    doc.querySelectorAll('input,textarea,select').forEach((e, i) => {
      const original = document.querySelectorAll('input,textarea,select')[i];
      if (e.tagName === 'TEXTAREA') e.textContent = original.value;
      else e.setAttribute('value', original.value);
      if (original.checked) e.setAttribute('checked', '');
    });
    doc.querySelectorAll('[aria-hidden="true"][data-aria-hidden="true"]').forEach(e => { e.removeAttribute('aria-hidden'); e.removeAttribute('data-aria-hidden'); });
    doc.querySelectorAll('[data-radix-focus-guard]').forEach(e => e.remove());
    doc.querySelectorAll('audio,video,iframe').forEach(e => e.remove());
    doc.querySelectorAll('*').forEach(e => {
      for (const a of [...e.attributes]) if (/^on/i.test(a.name)) e.removeAttribute(a.name);
    });
    doc.querySelector('body').style.removeProperty('pointer-events');
    doc.querySelector('body').style.removeProperty('overflow');
    doc.classList.remove('dark'); doc.classList.add('light');
    return { rootClass: doc.className, bodyClass: doc.querySelector('body').className,
      head: doc.querySelector('head').innerHTML, body: doc.querySelector('body').innerHTML };
  }, { images, replacements });
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const selected = process.argv.slice(2);
  for (const recipe of pages.filter(r => !selected.length || selected.includes(r.id))) {
    await page.evaluate(viewer => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('connecta-demo:viewer', viewer);
      localStorage.setItem('connecta-demo:crowd', '0');
      localStorage.setItem('connecta-demo:palette', 'strawberry');
    }, recipe.viewer || 'auto');
    await page.goto(BASE + recipe.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(recipe.group.includes('Room view') || recipe.id.startsWith('walk-') ? 1600 : 180);
    try {
      for (const action of recipe.actions) { await act(action); await page.waitForTimeout(240); }
      if (['settings-character', 'login-character', 'invite-character'].includes(recipe.id)) {
        await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 20000 });
      }
      if (await page.locator('canvas').count()) await page.waitForTimeout(1000);
      const data = await serialize(recipe);
      // Keep a separate capture of compact room markup: the original changes HUD
      // structure in JS at phone widths, so CSS alone would lose its phone UI.
      let mobile;
      if (recipe.id.startsWith('walk-') || recipe.id.startsWith('common-')) {
        const desktopPage = page;
        const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1 });
        try {
          page = await phoneCtx.newPage();
          await page.addInitScript(viewer => {
            localStorage.setItem('theme', 'light');
            localStorage.setItem('connecta-demo:viewer', viewer);
            localStorage.setItem('connecta-demo:crowd', '0');
            localStorage.setItem('connecta-demo:palette', 'strawberry');
          }, recipe.viewer || 'auto');
          await page.goto(BASE + recipe.url, { waitUntil: 'networkidle', timeout: 60000 });
          await page.waitForTimeout(1500);
          for (const action of recipe.actions) { await act(action); await page.waitForTimeout(240); }
          mobile = await serialize(recipe, '-phone');
        } finally {
          await phoneCtx.close();
          page = desktopPage;
        }
      }
      if (['home', 'walk-library', 'walk-cafe', 'walk-rooftop', 'shop', 'settings-character'].includes(recipe.id)) {
        await page.screenshot({ path: path.join(ROOT, `reference/source-${recipe.id}.png`) });
      }
      records.push({ ...recipe, data, mobile });
      console.log(`Captured ${recipe.id}`);
    } catch (error) {
      console.log(`FAILED ${recipe.id}: ${error.message.split('\n')[0]}`);
      await page.screenshot({ path: path.join(ROOT, `reference/failed-${recipe.id}.png`) });
      records.push({ ...recipe, failed: error.message });
    }
  }
} finally { await browser.close(); }

if (process.argv.length > 2) {
  const previous = JSON.parse(await readFile(path.join(ROOT, 'tools/capture-data.json'), 'utf8'));
  for (const record of previous.records) if (!records.some(r => r.id === record.id)) records.push(record);
  records.sort((a, b) => pages.findIndex(r => r.id === a.id) - pages.findIndex(r => r.id === b.id));
}
await writeFile(path.join(ROOT, 'tools/capture-data.json'), JSON.stringify({ source: SOURCE, base: BASE, capturedAt: new Date().toISOString(), records }, null, 2));
console.log(`Captured ${records.filter(r => !r.failed).length}/${records.length}. Run node tools/build-html.mjs next.`);
