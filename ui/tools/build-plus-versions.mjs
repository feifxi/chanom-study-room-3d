// ONE-TIME authoring pass (2026-11-21): creates plus-a.html, plus-b.html and plus-d.html from the
// current plus.html shell (head + rail) and adds the version switcher to plus.html.
// Do NOT rerun over edited pages: it overwrites plus-a/b/d.html. Edit those HTML files directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'plus.html'), 'utf8');
const mainOpen = src.indexOf('<main class="rail-page-content">');
const mainClose = src.indexOf('</main>');
let head = src.slice(0, mainOpen);
const tail = src.slice(mainClose);

// Reuse the existing FAQ ("Good to know") section as-is.
const faqStart = src.lastIndexOf('<section', src.indexOf('Good to know'));
const faqEnd = src.indexOf('</section>', src.indexOf('Refunds?')) + '</section>'.length;
const faq = src.slice(faqStart, faqEnd);

const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const YES = `<span class="pc-yes">${icon('<path d="m5 12 4 4L19 6"/>')}</span>`;
const NO = `<span class="pc-no">${icon('<path d="M6 6l12 12M18 6 6 18"/>')}</span>`;
const LIM = `<span class="pc-no">${icon('<path d="M7 12h10"/>')}</span>`;
const yes = t => `${YES}<span>${t}<span class="pc-sr"> (included)</span></span>`;
const no = t => `${NO}<span>${t}<span class="pc-sr"> (not included)</span></span>`;
const lineIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CHECK_SM = lineIcon('<path d="m5 12 4 4L19 6"/>');
const INFO = lineIcon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>');

// One feature list used by every version. Free values that the demo does not state are placeholders.
const groups = [
  { name: 'Your rooms', tone: 'lavender', note: 'Everyone inside a room you run gets these. Only you pay.', rows: [
    { f: 'People in a room at once', free: '25', plus: '100 on Big maps' },
    { f: 'Members per room', free: '100', plus: '1,000' },
    { f: 'Maps', free: 'Basic versions', plus: 'Big + premium maps, new ones as they arrive' },
  ] },
  { name: 'You', tone: 'mint', rows: [
    { f: 'Outfits', free: 'Standard outfits', plus: 'Premium skins' },
    { f: 'Pet that follows you', free: null, plus: 'Included' },
    { f: 'Name tag', free: 'Plain', plus: 'Animated, plus a profile banner' },
  ] },
  { name: 'Sharing & tools', tone: 'sky', rows: [
    { f: 'Screen sharing', free: '720p', plus: '1080p' },
    { f: 'AI decks (Pick a Side)', free: '3 a day', plus: '30 a day' },
    { f: 'Uploads in chat', free: 'Up to 10 MB', plus: 'Up to 50 MB' },
  ] },
  { name: 'Always free', tone: 'peach', same: true, rows: [
    { f: 'Join any room, including Plus rooms', free: 'Included', plus: 'Included' },
    { f: 'Voice, chat, Focus and friends', free: 'Included', plus: 'Included' },
    { f: 'No ads, never pay to win', free: 'Included', plus: 'Included' },
  ] },
];

const billing = `<div class="pc-billing" role="group" aria-label="Billing period">
  <button type="button" data-billing="monthly" aria-pressed="true">Monthly</button>
  <button type="button" data-billing="yearly" aria-pressed="false">Yearly <small>2 months free</small></button>
</div>`;
const plusPrice = `<div class="pc-price" data-bill="monthly"><strong>฿89</strong><span>/ month</span></div>
<div class="pc-price" data-bill="yearly" hidden><strong>฿890</strong><span>/ year</span></div>`;
const plusNote = `<p class="pc-price-note" data-bill="monthly">Billed monthly. Cancel any time.</p>
<p class="pc-price-note" data-bill="yearly" hidden>≈ ฿74 a month, billed once a year.</p>`;
const getPlus = (label = 'Get Plus') => `<a class="pc-btn pc-btn-primary" href="checkout-monthly.html" data-href-monthly="checkout-monthly.html" data-href-yearly="checkout.html">${label}</a>`;
const current = `<span class="pc-btn pc-btn-quiet" aria-disabled="true">Your current plan</span>`;

const hero = (title, text) => `<section class="pc-hero">
  <div class="pc-hero-copy">
    <span class="pc-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>You’re on Free</span>
    <h1>${title}</h1>
    <p>${text}</p>
  </div>
  <div class="pc-hero-art"><img src="assets/captures/plus-0.png" alt="Your character, captured from the original demo" /></div>
</section>`;

const always = `<div class="pc-always" aria-label="Always free for everyone">
  ${['Joining a room is always free', 'No ads in rooms', 'Never pay to win', 'Cancel any time'].map(t => `<span>${CHECK_SM}${t}</span>`).join('')}
</div>`;

const endsNote = `<div class="pc-note">${INFO}<p><b>If Plus ends, nothing is deleted.</b> Your rooms keep their space for 7 more days, then go back to 25 people at once, and Big or premium maps switch to their basic version while everyone stays inside.</p></div>`;

const finalCta = (title, text) => `<section class="pc-final">
  <h2>${title}</h2>
  <p>${text}</p>
  <div class="pc-btns">${getPlus()}<a class="pc-btn" href="checkout-monthly.html" style="background:var(--card)">Gift Plus to a friend</a></div>
</section>`;

const versions = [
  { file: 'plus.html', label: 'Current' },
  { file: 'plus-a.html', label: 'A · Cards' },
  { file: 'plus-b.html', label: 'B · Table' },
  { file: 'plus-d.html', label: 'D · Pros & cons' },
];
const switcher = file => `<div class="pc-switcher"><span>Plus page version</span><nav aria-label="Plus page version">${versions.map(v => `<a href="${v.file}"${v.file === file ? ' aria-current="page"' : ''}>${v.label}</a>`).join('')}</nav></div>`;

// ---------- Version A: two plan cards ----------
const planList = side => groups.filter(g => !g.same).map(g => `<li class="pc-plan-group"><span class="pc-chip pc-tone-${g.tone}">${g.name}</span></li>` + g.rows.map(r => {
  const v = r[side];
  if (!v) return `<li class="is-off">${no(`<b>${r.f}</b><small>Not on Free</small>`)}</li>`;
  const off = side === 'free';
  return `<li${off ? ' class="is-off"' : ''}>${off ? LIM : YES}<span><b>${r.f}</b><small>${v}</small><span class="pc-sr">${off ? ' (limited on Free)' : ' (included)'}</span></span></li>`;
}).join('')).join('');

const pageA = `${switcher('plus-a.html')}
<div class="pc-page">
${hero('Free gets you in. <em>Plus makes your rooms bigger.</em>', 'Rooms, voice and chat are free for everyone. Here is exactly what changes when you upgrade, and what stays the same.')}
<section class="pc-section" aria-labelledby="pc-plans-title">
  <div class="pc-stage">
  <div class="pc-stage-head"><div><h2 id="pc-plans-title">Pick your plan</h2><p class="pc-lead">Free gets everyone in. Plus grows the rooms you run.</p></div>${billing}</div>
  <div class="pc-plans">
    <article class="pc-plan" aria-labelledby="pc-free-title">
      <h3 id="pc-free-title">Free</h3>
      <p class="pc-plan-sub">Hang out, study and chat with anyone.</p>
      <div class="pc-price"><strong>฿0</strong><span>forever</span></div>
      <p class="pc-price-note">No card needed.</p>
      ${current}
      <ul>${planList('free')}</ul>
    </article>
    <article class="pc-plan pc-plan-plus" aria-labelledby="pc-plus-title">
      <span class="pc-plan-tag">For room owners</span>
      <h3 id="pc-plus-title">Plus</h3>
      <p class="pc-plan-sub">Bigger, nicer rooms for everyone inside. Cuter you.</p>
      ${plusPrice}
      ${plusNote}
      ${getPlus()}
      <ul>${planList('plus')}</ul>
    </article>
  </div>
  </div>
  ${always}
</section>
<section class="pc-section" aria-labelledby="pc-fit-title">
  <h2 id="pc-fit-title">Which one fits you?</h2>
  <div class="pc-fit">
    <div><h3>Free is enough if…</h3><ul>
      <li>You mostly join friends’ rooms. Plus rooms are full size for you too.</li>
      <li>Your own room rarely has more than 25 people at once.</li>
      <li>You don’t need premium maps, skins or a pet.</li></ul></div>
    <div><h3>Get Plus if…</h3><ul>
      <li>You run a class, club or study group bigger than 25.</li>
      <li>You want Big and premium maps for your room.</li>
      <li>You share slides or code and want 1080p, or make lots of AI decks.</li></ul></div>
  </div>
  ${endsNote}
</section>
${faq}
${finalCta('Ready for a bigger room?', 'One plan, everyone inside your rooms gets it.')}
</div>`;

// ---------- Version B: comparison table ----------
const cell = (v, plus) => v ? `<span class="pc-cell">${plus || v === 'Included' ? yes(v) : `${LIM}<span>${v}<span class="pc-sr"> (limited)</span></span>`}</span>` : `<span class="pc-cell">${no('Not included')}</span>`;
const tableRows = groups.map((g, gi) => `<tbody>
  <tr><th scope="rowgroup" colspan="3" id="pc-g${gi}"><span class="pc-chip pc-tone-${g.tone}">${g.name}</span>${g.note ? ` · <span style="text-transform:none;letter-spacing:0;font-weight:700">${g.note}</span>` : ''}</th></tr>
  ${g.rows.map(r => `<tr${g.same ? ' class="is-same"' : ''}><th scope="row">${r.f}</th><td>${cell(r.free)}</td><td class="pc-col-plus">${cell(r.plus, true)}</td></tr>`).join('\n  ')}
</tbody>`).join('\n');

const pageB = `${switcher('plus-b.html')}
<div class="pc-page">
${hero('Free vs Plus, <em>side by side.</em>', 'Every difference in one table. Plus upgrades the rooms you run for everyone inside them, and your own look.')}
<section class="pc-section" aria-labelledby="pc-table-title">
  <div class="pc-stage">
  <div class="pc-stage-head"><div><h2 id="pc-table-title">Compare plans</h2><p class="pc-lead">Every difference, row by row.</p></div>${billing}</div>
  <div class="pc-table-wrap">
    <table class="pc-table">
      <caption class="pc-sr">Free and Plus features compared</caption>
      <thead><tr>
        <th scope="col">Feature</th>
        <th scope="col"><div class="pc-col-head"><h3>Free</h3><div class="pc-price"><strong>฿0</strong><span>forever</span></div>${current}</div></th>
        <th scope="col" class="pc-col-plus"><div class="pc-col-head"><span class="pc-plan-tag">For room owners</span><h3>Plus</h3>${plusPrice}${getPlus()}</div></th>
      </tr></thead>
      ${tableRows}
    </table>
  </div>
  </div>
  ${endsNote}
</section>
${faq}
${finalCta('Run a room bigger than 25?', 'Plus fits 100 at once on Big maps, for everyone inside.')}
</div>`;

// ---------- Version D: pros & cons ----------
const list = (title, items, cls, iconHtml) => `<div class="pc-pc-list ${cls}"><h4>${iconHtml}${title}</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
const pageD = `${switcher('plus-d.html')}
<div class="pc-page">
${hero('The honest pros and cons <em>of Free and Plus.</em>', 'No pressure. Here is what each plan is good at and where it falls short, so you can decide for yourself.')}
<section class="pc-section" aria-labelledby="pc-pc-title">
  <div class="pc-stage">
  <div class="pc-stage-head"><div><h2 id="pc-pc-title">What you get, what you give up</h2><p class="pc-lead">The honest version, for both plans.</p></div>${billing}</div>
  <div class="pc-pc">
    <article class="pc-pc-col" aria-labelledby="pc-d-free">
      <div class="pc-pc-head"><h3 id="pc-d-free">Free</h3><div class="pc-price"><strong>฿0</strong><span>forever</span></div></div>
      ${list('Pros', [
        'Join any room, voice, chat, Focus and friends, all free',
        'Plus rooms are full size for you when you join them',
        'No ads, and nobody can pay to win',
        'Make your own room for up to 25 people at once',
      ], 'pc-pc-pros', YES)}
      ${list('Cons', [
        'Your rooms cap at 25 at once and 100 members',
        'Basic versions of maps only',
        'Standard outfits, no pet, plain name tag',
        'Screen share at 720p, 3 AI decks a day, 10 MB uploads',
      ], 'pc-pc-cons', NO)}
      ${current}
    </article>
    <article class="pc-pc-col pc-plan-plus" aria-labelledby="pc-d-plus">
      <span class="pc-plan-tag">For room owners</span><div class="pc-pc-head"><h3 id="pc-d-plus">Plus</h3><div>${plusPrice}</div></div>
      ${list('Pros', [
        'Your rooms fit 100 at once and 1,000 members, for everyone inside',
        'Big and premium maps, new ones as they arrive',
        'Premium skins, a pet and an animated name tag',
        '1080p screen share, 30 AI decks a day, 50 MB uploads',
      ], 'pc-pc-pros', YES)}
      ${list('Cons', [
        'Costs ฿89 a month, or ฿890 a year',
        'Mostly helps if you run rooms; joining others gains you little',
        'If it ends, your rooms go back to 25 at once after 7 days',
      ], 'pc-pc-cons', NO)}
      ${getPlus()}
    </article>
  </div>
  </div>
  ${always}
</section>
<section class="pc-section" aria-labelledby="pc-verdict-title">
  <h2 id="pc-verdict-title">The short answer</h2>
  <div class="pc-verdict">
    <div><h3>Stay on Free</h3><p>if you mostly join friends’ rooms or your group is under 25. You miss nothing social.</p></div>
    <div><h3>Choose Plus</h3><p>if you run a bigger class, club or study group, or want the nicer maps and your own look.</p></div>
  </div>
</section>
${faq}
${finalCta('Still deciding?', 'Start on Free. You can upgrade any time, and cancel any time.')}
</div>`;

const write = (file, title, body) => {
  let h = head.replace(/<title>[^<]*<\/title>/, `<title>${title} · Connecta UI</title>`)
    .replace('</head>', '  <link rel="stylesheet" href="assets/plus-compare.css" />\n  </head>');
  const t = tail.replace('<script src="assets/chat-layout.js"></script>', '<script src="assets/chat-layout.js"></script>\n    <script src="assets/plus-compare.js"></script>');
  fs.writeFileSync(path.join(root, file), `${h}<main class="rail-page-content">\n${body}\n      ${t}`);
};
write('plus-a.html', 'Plus · A cards', pageA);
write('plus-b.html', 'Plus · B table', pageB);
write('plus-d.html', 'Plus · D pros and cons', pageD);

// Add the switcher to the current page only (structure unchanged otherwise).
if (!src.includes('pc-switcher')) {
  const out = src.replace('<main class="rail-page-content">', `<main class="rail-page-content">\n        ${switcher('plus.html')}`)
    .replace('</head>', '  <link rel="stylesheet" href="assets/plus-compare.css" />\n  </head>');
  fs.writeFileSync(path.join(root, 'plus.html'), out);
}
console.log('wrote plus-a.html, plus-b.html, plus-d.html');
