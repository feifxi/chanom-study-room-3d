// Screenshots pages at one width and theme, signed in or as a guest, and reports pages that
// scroll sideways or log errors. Needs the web app running (pnpm --filter @connecta/web dev) and the
// seed (pnpm db:seed). Pictures land in apps/web/.screens/ (git-ignored): look at them, they catch
// what typecheck and lint can't.
//
//   pnpm --filter @connecta/web screens                     (390 px, light, signed in)
//   pnpm --filter @connecta/web screens 390 dark guest      (width, theme, who)
//   pnpm --filter @connecta/web screens 1280 light me /admin /admin/money
//
// Who: `me` signs in first as a seed person (SCREENS_AS, default fei@connecta.test, who's on
// the Connecta team; the code comes from Mailpit); `guest` stays signed out. Phone widths get touch.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { signIn } from './sign-in.mjs';

const [width = '390', theme = 'light', viewer = 'me', ...paths] = process.argv.slice(2);
const BASE = process.env.WEB_URL ?? 'http://localhost:3000';
const OUT = new URL('../.screens/', import.meta.url).pathname;
const PAGES = paths.length
  ? paths
  : [
      '/login',
      '/home',
      '/home/friends',
      '/home/messages',
      '/home/messages/ter',
      '/home/shop',
      '/home/plus',
      '/home/focus',
      '/checkout?plan=yearly',
      '/discover',
      '/r/seedchanom',
      '/r/seedgamenc',
      '/i/seedchnm',
      '/common/cafe',
      '/r/seedchanom/walk',
    ];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: +width, height: 844 }, hasTouch: +width < 700 });
await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
if (viewer !== 'guest') await signIn(ctx, BASE, process.env.SCREENS_AS ?? 'fei@connecta.test');

/** Signs the browser context in with an email code, read from Mailpit. */
let problems = 0;
for (const path of PAGES) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45_000 }).catch((e) => errors.push(e.message.slice(0, 80)));
  await page.waitForTimeout(800);
  const { scrollW, W } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    W: document.documentElement.clientWidth,
  }));
  const file = `${width}-${theme}-${viewer}-${path.replace(/[/?=]/g, '_')}.png`;
  await page.screenshot({ path: OUT + file, fullPage: true });
  const notes = [scrollW > W && `scrolls sideways (${scrollW} > ${W})`, ...errors].filter(Boolean);
  problems += notes.length ? 1 : 0;
  console.log(`${notes.length ? '✗' : '✓'} ${path}  ${file}${notes.length ? '\n    ' + notes.join('\n    ') : ''}`);
  await page.close();
}
await browser.close();
console.log(`\n${PAGES.length} pages, ${problems} with problems. Pictures: ${OUT}`);
process.exit(problems ? 1 : 0);
