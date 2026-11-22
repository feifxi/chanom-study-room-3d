import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
const conversations = JSON.parse(await readFile(path.join(ROOT, 'tools/chat-content.json'), 'utf8'));
const require = createRequire(path.join(manifest.source, 'package.json'));
const { chromium } = require('playwright');
const prettier = require('prettier');
try { await access(path.join(ROOT, 'home-chat.html')); }
catch { await copyFile(path.join(ROOT, 'home.html'), path.join(ROOT, 'home-chat.html')); }
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const parser = await browser.newPage();
await parser.route('**/*', r => r.abort());
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const arrow = '<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5m5 5H3"/></svg>';
const color = { Mai: '#7758c4', Jod: '#b3612f', Ploy: '#b3612f', Ken: '#2f7d55', Nam: '#2e6ea8' };
const chanom = conversations.find(c => c.id === 'room-chanom');
const targets = ['home', 'messages', 'home-active', 'home-you-run', ...conversations.filter(c => c.kind === 'room').map(c => c.id)];
const roomInfo = c => {
  const type = c.walk?.includes('rooftop') ? 'rooftop' : c.walk?.includes('cafe') ? 'cafe' : 'library';
  const capacity = c.summary?.match(/(\d+)\/(\d+)/);
  const inside = capacity ? +capacity[1] : c.groups[0]?.members.length || 0;
  return { type, map: { library: 'Cosy Library', cafe: 'Cat Café', rooftop: 'Starry Rooftop' }[type], inside, full: !!capacity && inside >= +capacity[2] };
};
function preview(c) {
  const { type, map, inside, full } = roomInfo(c);
  const members = c.groups[0]?.members || [];
  const firstName = members[0]?.name;
  const headline = inside ? firstName ? `${firstName}${inside > 1 ? ` and ${inside - 1} ${inside === 2 ? 'friend' : 'friends'}` : ''} ${inside === 1 ? 'is' : 'are'} inside` : `${inside} people are inside` : 'The room is quiet right now';
  const note = full ? 'Join them when a spot opens.' : !inside ? 'Be the first to walk in.' : { library: 'Come study with them.', cafe: 'There’s a seat for you.', rooftop: 'Come hang out under the stars.' }[type];
  const image = type === 'library' ? 'assets/captures/library-social-cover.png' : `assets/captures/walk-${type}-0.png`;
  const href = c.walk || 'walk-library.html';
  return `<section class="room-peek room-peek-${type}" aria-label="3D room preview"><img class="room-peek-image" src="${image}" alt="Screenshot from the original ${map} 3D room" width="1440" height="800">
    ${full ? '' : `<a class="room-peek-image-link" href="${href}" aria-label="Walk into ${map}"></a>`}
    <span class="room-peek-map">${esc(map)}</span><span class="room-peek-snapshot">Room preview</span>
    <div class="room-peek-caption"><div class="room-peek-invitation">${inside && members.length ? `<div class="room-peek-faces" aria-hidden="true">${members.slice(0, 3).map(p => `<span style="--face-color:${color[p.name] || '#7758c4'}">${esc(p.name[0])}</span>`).join('')}</div>` : ''}<div><h3>${esc(headline)}</h3><p>${esc(note)}</p></div></div>
    ${full ? '<button class="room-peek-enter" disabled>Room full</button>' : `<a class="room-peek-enter" href="${href}" aria-label="Walk in">${arrow}<span>Walk in</span></a>`}</div></section>`;
}
try {
  for (const id of targets) {
    const c = conversations.find(c => c.id === id) || chanom;
    const file = path.join(ROOT, id + '.html');
    const original = await readFile(file, 'utf8');
    await parser.setContent(original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
    const html = await parser.evaluate(({ preview, arrow, roomRows }) => {
      document.querySelector('.room-peek')?.remove();
      document.querySelector('.conversation-actions .chat-walk-in')?.remove();
      const thread = document.querySelector('.chat-thread');
      const pinned = document.querySelector('.pinned-message');
      thread.insertAdjacentHTML('afterbegin', preview);
      if (pinned) thread.querySelector('.room-peek').after(pinned);
      document.querySelectorAll('.conversation-row').forEach(row => {
        row.querySelector('.conversation-room-status')?.remove();
        const info = roomRows[row.getAttribute('href')];
        if (info) row.querySelector('.conversation-copy').insertAdjacentHTML('beforeend', `<span class="conversation-room-status">${arrow}<span>${info.inside ? `${info.inside} in the room` : 'Room is quiet'}</span></span>`);
      });
      document.documentElement.dataset.uiLayout = 'chat-with-room-preview';
      if (!document.querySelector('link[href="assets/room-preview.css"]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'assets/room-preview.css'; document.head.append(css);
      }
      const theme = document.createElement('script'); theme.src = 'assets/theme.js'; document.head.append(theme);
      for (const src of ['assets/prototype.js', 'assets/chat-layout.js']) { const js = document.createElement('script'); js.src = src; document.body.append(js); }
      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, { preview: preview(c), arrow, roomRows: Object.fromEntries(conversations.filter(c => c.kind === 'room').map(c => [c.file, roomInfo(c)])) });
    await writeFile(file, await prettier.format(html, { parser: 'html', printWidth: 120 }));
  }
  if (!manifest.pages.some(p => p.id === 'home-chat')) manifest.pages.push({ id: 'home-chat', file: 'home-chat.html', title: 'Chat only · before room preview', group: 'Comparison', url: '/home', preservedFrom: 'home' });
  manifest.roomPreviewRevision = { date: '2026-11-16', description: 'A real room screenshot, named presence and primary Walk in above room chat', files: targets.map(id => id + '.html'), comparison: 'home-chat.html', capture: 'assets/captures/library-social-cover.png' };
  await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(ROOT, 'assets/pages.js'), `window.UI_PAGES = ${JSON.stringify(manifest.pages, null, 2)};\n`);
  await writeFile(path.join(ROOT, 'assets/captures/library-social-cover.json'), JSON.stringify({ sourceUrl: 'http://localhost:3100/servers/chanom/rooms/library', method: 'Playwright canvas screenshot after walking in the original demo; HUD hidden only for capture', image: 'library-social-cover.png', viewport: { width: 1440, height: 800 }, capturedAt: new Date().toISOString(), generated: false }, null, 2));
  console.log(`Added room previews to ${targets.length} pages. Preserved home-chat.html.`);
} finally { await browser.close(); }
