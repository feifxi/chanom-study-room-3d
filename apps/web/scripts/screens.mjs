// Screenshots pages at one width, theme and "View as", and reports pages that scroll sideways
// or log errors. Needs the web app running (pnpm --filter @connecta/web dev). Pictures land in
// apps/web/.screens/ (git-ignored): look at them, they catch what typecheck and lint can't.
//
//   pnpm --filter @connecta/web screens                     (390 px, light, as in the mock)
//   pnpm --filter @connecta/web screens 390 dark guest      (width, theme, viewer)
//   pnpm --filter @connecta/web screens 1280 light admin /admin /admin/money
//
// Viewers: auto, guest, member, mod, owner, admin (lib/viewer.ts). Phone widths get touch.
// Home and the rest of the signed-in app need an account: every viewer except guest signs in first
// as a seed person (SCREENS_AS, default maimai@connecta.test; needs `pnpm db:seed` and Mailpit).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [width = '390', theme = 'light', viewer = 'auto', ...paths] = process.argv.slice(2);
const BASE = process.env.WEB_URL ?? 'http://localhost:3000';
const OUT = new URL('../.screens/', import.meta.url).pathname;
const PAGES = paths.length
  ? paths
  : [
      '/',
      '/login',
      '/home',
      '/home/friends',
      '/home/messages',
      '/home/messages/mai',
      '/home/shop',
      '/home/plus',
      '/home/focus',
      '/checkout?plan=yearly',
      '/discover',
      '/servers/chanom',
      '/invite/cafe-chanom',
      '/servers/chanom/rooms/library',
      '/servers/chanom/rooms/cafe',
      '/servers/chanom/rooms/rooftop',
    ];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: +width, height: 844 }, hasTouch: +width < 700 });
await ctx.addInitScript(
  ([t, v]) => {
    localStorage.setItem('theme', t);
    localStorage.setItem('connecta-demo:viewer', v);
  },
  [theme, viewer],
);
if (viewer !== 'guest') await signIn(process.env.SCREENS_AS ?? 'maimai@connecta.test');

/** Signs the browser context in with an email code, read from Mailpit. */
async function signIn(email) {
  const headers = { origin: BASE };
  const send = await ctx.request.post(`${BASE}/api/auth/email-otp/send-verification-otp`, { headers, data: { email, type: 'sign-in' } });
  if (!send.ok()) throw new Error(`Couldn't send a code to ${email} (${send.status()}): is the API running?`);
  const inbox = await (await fetch(`${process.env.MAILPIT_URL ?? 'http://localhost:8025'}/api/v1/messages`)).json();
  const otp = inbox.messages.find((m) => m.To[0]?.Address === email)?.Subject.slice(0, 6);
  const res = await ctx.request.post(`${BASE}/api/auth/sign-in/email-otp`, { headers, data: { email, otp } });
  if (!res.ok()) throw new Error(`Couldn't sign in as ${email} (${res.status()})`);
}

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
