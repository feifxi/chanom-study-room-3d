// ONE-TIME authoring pass (2026-11-21): replaces the Discover and Home "Open now" room cards with one
// shared, simpler card (.room-card) and swaps Discover's category chips for a Filters pop-up.
// Do NOT rerun over edited pages. Edit the HTML directly afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rooms = {
  'Library': { kind: 'common', href: 'common-library-2.html', img: 'covers/library.webp', tone: 'lavender', desc: 'Quiet study with a library ambience.', chips: ['Text only'], here: '142', extra: '8 rooms', action: 'Walk in' },
  'Cat Café': { kind: 'common', href: 'common-cafe-2.html', img: 'covers/cafe.webp', tone: 'peach', desc: 'Chill and chat over a warm drink.', chips: ['Text only'], here: '57', extra: '3 rooms', friend: ['M', '#a86fd1', 'Mook'], action: 'Walk in' },
  'Starry Rooftop': { kind: 'common', href: 'common-rooftop-1.html', img: 'covers/rooftop.webp', tone: 'sky', desc: 'Late night talks under the stars.', chips: ['Text only'], here: '3', extra: '1 room', action: 'Walk in' },
  'Game Night Club': { kind: 'open', href: 'room-gamenight.html', img: 'covers/library.webp', tone: 'sky', desc: 'Werewolf, cards and drawing games every weekend.', lang: 'Thai', tags: ['Games', 'Late night'], here: '41/50', extra: '230 members', friend: ['P', '#b3612f', 'Ploy'], action: 'Walk in' },
  'Lo-fi Study Hall': { kind: 'open', img: 'covers/library.webp', tone: 'lavender', desc: 'Silent study all day, group sprints every hour.', lang: 'English', tags: ['Study'], here: '96/100', extra: '980 members', action: 'Join &amp; walk in' },
  'Anime Club TH': { kind: 'open', img: 'covers/library.webp', tone: 'peach', desc: 'Weekly watch parties on the big TV.', lang: 'Thai', tags: ['Anime', 'Chill'], here: '50/50', extra: '920 members', full: true, action: 'Room full' },
  'IELTS Speaking Café': { kind: 'open', img: 'covers/cafe.webp', tone: 'peach', desc: 'Practise speaking in small tables.', lang: 'English', tags: ['Language exchange'], here: '9/25', extra: '410 members', action: 'Ask to join' },
};
const slug = t => t.toLowerCase().replace(/[^a-z]+/g, '-');

const card = (name, { guest = false } = {}) => {
  const r = rooms[name];
  const href = guest && r.kind === 'open' ? 'login.html' : r.href;
  const action = guest && r.kind === 'open' ? 'Sign up to join' : r.action;
  const tag = href && !(r.full && !guest) ? 'a' : 'button';
  const attrs = [
    `class="room-card room-tone-${r.tone}${r.full ? ' is-full' : ''}"`,
    tag === 'a' ? `href="${href}"` : 'type="button"',
    r.full && !guest ? 'aria-disabled="true"' : '',
    r.kind === 'open' ? `data-room-tags="${r.tags.map(slug).join(' ')}" data-room-lang="${r.lang}"` : '',
  ].filter(Boolean).join(' ');
  const chips = r.kind === 'open' ? [r.lang, ...r.tags] : r.chips;
  const stats = r.kind === 'open'
    ? `<span class="room-card-dot"></span><b>${r.here}</b> here<span class="room-card-sep">·</span>${r.extra}${r.full ? '<span class="room-card-full">Full</span>' : ''}`
    : `<span class="room-card-dot"></span><b>${r.here}</b> here<span class="room-card-sep">·</span>${r.extra}`;
  const friend = r.friend ? `<span class="room-card-friend"><span class="room-card-avatar" style="--avatar:${r.friend[1]}">${r.friend[0]}</span>${r.friend[2]} is here</span>` : '';
  return `<${tag} ${attrs}
                ><span class="room-card-cover"><img src="assets/project-images/${r.img}" alt="" loading="lazy" /><span class="room-card-type">${r.kind === 'common' ? 'Common room' : 'Open room'}</span><span class="room-card-chips">${chips.map(c => `<span>${c}</span>`).join('')}</span></span
                ><span class="room-card-body"><span class="room-card-title">${name}</span><span class="room-card-desc">${r.desc}</span><span class="room-card-stats">${stats}</span>${friend}</span
                ><span class="room-card-action">${action}</span></${tag}
              >`;
};

const filterBar = `<div class="room-filter" data-room-filter="">
              <div class="room-filter-bar">
                <button type="button" class="room-filter-button" aria-haspopup="dialog" aria-expanded="false" aria-controls="room-filter-pop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M7 12h10M10 18h4"/></svg>Filters<span class="room-filter-badge" data-room-filter-badge="" hidden>0</span></button>
                <div class="room-filter-pills" data-room-filter-pills=""></div>
                <span class="room-filter-count" data-room-filter-count="" aria-live="polite"></span>
              </div>
              <div class="room-filter-pop" id="room-filter-pop" role="dialog" aria-labelledby="room-filter-title" hidden>
                <header><h3 id="room-filter-title">Filter open rooms</h3><button type="button" class="room-filter-close" data-room-filter-close="" aria-label="Close filters"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
                <section><h4>Categories <small>Pick any</small></h4><div class="room-filter-options" role="group" aria-label="Categories">${['Study', 'Chill', 'Games', 'Language exchange', 'Music', 'Art', 'Anime', 'Late night'].map(c => `<button type="button" data-room-tag="${slug(c)}" aria-pressed="false">${c}</button>`).join('')}</div></section>
                <section><h4>Language</h4><div class="room-filter-options" role="radiogroup" aria-label="Language">${['Any language', 'Thai', 'English', 'Japanese', 'Korean', 'Chinese', 'Mixed'].map((l, i) => `<button type="button" role="radio" data-room-lang-option="${i ? l : ''}" aria-checked="${i === 0}">${l}</button>`).join('')}</div></section>
                <footer><button type="button" class="room-filter-clear" data-room-filter-clear="">Clear</button><button type="button" class="room-filter-apply" data-room-filter-close="">Show <span data-room-filter-apply-count="">4</span> rooms</button></footer>
              </div>
            </div>`;
const emptyState = `<p class="room-filter-empty" data-room-filter-empty="" hidden>No open rooms match these filters. <button type="button" data-room-filter-clear="">Clear filters</button></p>`;

const cardRe = /<(a|button)\s+class="group flex flex-col[^"]*aligned-public-card"[\s\S]*?<\/\1\s*>/g;
const nameOf = html => {
  const t = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '|').split('|').map(x => x.trim()).filter(Boolean);
  return Object.keys(rooms).find(n => t.includes(n));
};

const pages = [
  ['discover.html', {}], ['discover-guest.html', { guest: true }],
  ['home-dashboard.html', { home: true }], ['home-dashboard-active.html', { home: true }], ['home-dashboard-you-run.html', { home: true }],
];
for (const [file, opts] of pages) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;
  s = s.replace(cardRe, (m) => {
    const name = nameOf(m);
    if (!name) return m;
    count++;
    // Home shows only rooms you can walk into now; the full room stays on Discover.
    if (opts.home && rooms[name].full) return '';
    return card(name, opts);
  });
  if (!opts.home) {
    // Replace the category chips + language select row with the Filters control.
    s = s.replace(/<div class="mb-3 flex flex-wrap items-center gap-1\.5">[\s\S]*?<\/select>\s*<\/div>/, filterBar);
    // Empty state after the open-room grid (the grid that holds data-room-tags cards).
    const sectionEnd = s.indexOf('</section>', s.lastIndexOf('data-room-tags='));
    s = s.slice(0, sectionEnd) + '  ' + emptyState + '\n          ' + s.slice(sectionEnd);
    if (!s.includes('assets/room-filter.js')) s = s.replace('<script src="assets/prototype.js"></script>', '<script src="assets/prototype.js"></script>\n    <script src="assets/room-filter.js"></script>');
  }
  if (!s.includes('assets/room-card.css')) s = s.replace('</head>', '  <link rel="stylesheet" href="assets/room-card.css" />\n  </head>');
  fs.writeFileSync(p, s);
  console.log(file, 'cards replaced:', count);
}
