// ONE-TIME authoring pass (2026-11-21): makes every Home "Your rooms" banner card use the same parts.
// - Background: the map's cover art, full-bleed (assets/project-images/covers/<map>.webp).
// - Status: one row — the count chip, then at most one alert chip; Pin and Plus become icon badges.
// - Title: the room name is wrapped in .home-room-name so it can be cut with an ellipsis.
// - People: every card gets the same stack (max 5 circles, last "+N"; "Nobody yet" when empty).
// Do NOT rerun over edited pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// End index of the element that starts at `i` (handles nested tags with the same name).
const elementEnd = (s, i) => {
  const name = s.slice(i + 1).match(/^[a-zA-Z][\w-]*/)[0];
  const first = s.slice(i).match(/^<[^>]*?(\/?)>/);
  if (first[1] || /^(img|br|hr|input|meta|link|source)$/i.test(name)) return i + first[0].length;
  const re = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, 'g');
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(s))) {
    if (m[1]) depth--; else if (!m[2]) depth++;
    if (depth === 0) return re.lastIndex;
  }
  throw new Error('unclosed ' + name);
};
// Top-level child elements between the end of the opening tag at `i` and its closing tag.
const children = (s, i) => {
  const end = elementEnd(s, i);
  let p = s.indexOf('>', i) + 1;
  const out = [];
  while (true) {
    const next = s.indexOf('<', p);
    if (next < 0 || next >= end || s[next + 1] === '/') break;
    const e = elementEnd(s, next);
    out.push([next, e]);
    p = e;
  }
  return out;
};

const coverFor = desc => /Cat Caf/.test(desc) ? 'cafe' : /Rooftop/.test(desc) ? 'rooftop' : 'library';
const pool = [['A', '#2e6ea8'], ['K', '#2e775d'], ['S', '#c0587e'], ['T', '#7758c4'], ['W', '#e9955a'], ['N', '#3a8fb7'], ['J', '#a7522f'], ['B', '#aa356a']];
const stack = (count, avatars) => {
  if (!count) return '<span class="home-room-people is-empty">Nobody yet</span>';
  const people = avatars.slice(0, 5);
  let k = count;
  while (people.length < Math.min(count, 5)) { const p = pool[k++ % pool.length]; if (!people.some(x => x[0] === p[0])) people.push(p); }
  const plus = count > 5;
  const shown = plus ? people.slice(0, 4) : people.slice(0, count);
  return `<span class="home-room-people room-card-people" aria-label="${count} ${count === 1 ? 'person' : 'people'} inside">${shown.map(([c, col]) => `<span style="--avatar:${col}">${c}</span>`).join('')}${plus ? `<span class="room-card-more">+${count - 4}</span>` : ''}</span>`;
};
const iconBadge = (kind, svg) => `<span class="home-room-icon" title="${kind}" aria-label="${kind}">${svg}</span>`;

for (const file of ['home-dashboard.html', 'home-dashboard-active.html', 'home-dashboard-you-run.html']) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;
  let from = 0;
  while (true) {
    const a = s.indexOf('<article', from);
    if (a < 0) break;
    const aEnd = elementEnd(s, a);
    let art = s.slice(a, aEnd);
    if (!art.includes('home-featured-room')) { from = aEnd; continue; }
    count++;
    const desc = art.match(/home-room-description">\s*([\s\S]*?)\s*<\/p>/)[1].replace(/\s+/g, ' ');
    const kids = children(art, 0);

    // 1. Background → map cover art (replace everything before the dark overlay).
    const overlay = kids.findIndex(([x, y]) => art.startsWith('<div class="absolute inset-0 -z-10', x) && /^<div[^>]*from-black\/80/.test(art.slice(x, y)));
    const bgStart = kids[0][0], bgEnd = kids[overlay][0];
    art = art.slice(0, bgStart) + `<img src="assets/project-images/covers/${coverFor(desc)}.webp" alt="" class="home-room-cover" />\n                ` + art.slice(bgEnd);

    // 2. Status chips → count + one alert; Pin / Plus → icon badges.
    const st = art.lastIndexOf('<div', art.indexOf('home-room-status'));
    const stEnd = elementEnd(art, st);
    const chips = children(art, st).map(([x, y]) => art.slice(x, y));
    const isPin = c => c.includes('lucide-pin');
    const isPlus = c => /Plus<\/span|>\s*Plus\s*</.test(c) || (c.includes('lucide-crown') && /Plus/.test(c));
    const isCount = c => !isPin(c) && !isPlus(c) && c.includes('font-mono');
    const countChip = chips.find(isCount);
    const alert = chips.find(c => !isPin(c) && !isPlus(c) && c !== countChip);
    const icons = [];
    const pinChip = chips.find(isPin), plusChip = chips.find(isPlus);
    if (pinChip) icons.push(iconBadge('Pinned', pinChip.match(/<svg[\s\S]*?<\/svg>/)[0]));
    if (plusChip) icons.push(iconBadge('Plus room', plusChip.match(/<svg[\s\S]*?<\/svg>/)[0]));
    const openTag = art.slice(st, art.indexOf('>', st) + 1);
    const newStatus = `${openTag}${[countChip, alert].filter(Boolean).join('')}</div>${icons.length ? `\n                <span class="home-room-icons">${icons.join('')}</span>` : ''}`;
    art = art.slice(0, st) + newStatus + art.slice(stEnd);

    // 3. Title text → .home-room-name
    art = art.replace(/(home-room-title">[\s\S]*?<\/span\s*>)\s*([^<]*\S)\s*(<span|<\/p>)/, (m, pre, name, post) => `${pre}<span class="home-room-name">${name.trim()}</span>${post}`);

    // 4. People stack on every card.
    const people = Number((art.match(/font-mono">(\d+)\//) || [])[1] || 0);
    const avatars = [...art.matchAll(/linear-gradient\(145deg, (#[0-9a-f]{6})[^"]*"\s*>([A-Z])</gi)].map(m => [m[2], m[1]]);
    const row = art.indexOf('<div class="pointer-events-auto');
    const rowEnd = elementEnd(art, row);
    let rowHtml = art.slice(row, rowEnd);
    const ml = rowHtml.indexOf('<span class="ml-auto"');
    if (ml >= 0) rowHtml = rowHtml.slice(0, ml) + rowHtml.slice(elementEnd(rowHtml, ml)).replace(/^\s*>/, '');
    rowHtml = rowHtml.replace(/<\/div>$/, `${stack(people, avatars)}</div>`);
    art = art.slice(0, row) + rowHtml + art.slice(rowEnd);

    s = s.slice(0, a) + art + s.slice(aEnd);
    from = a + art.length;
  }
  fs.writeFileSync(p, s);
  console.log(file, 'cards normalised:', count);
}
