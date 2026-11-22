// ONE-TIME authoring pass (2026-11-21): splits the settings window into "Edit profile"
// (My profile, My character) and "Settings" (the other seven pages), and rewrites the
// My profile / My character content into labelled sections. Do NOT rerun over edited pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const profilePages = [['settings-profile.html', 'My profile'], ['settings-character.html', 'My character']];
const settingsPages = [['settings-appearance.html', 'Appearance'], ['settings-voice.html', 'Voice &amp; sound'], ['settings-controls.html', 'Controls'], ['settings-notifications.html', 'Notifications'], ['settings-privacy.html', 'Privacy &amp; safety'], ['settings-plus.html', 'Plus &amp; billing'], ['settings-account.html', 'Account']];

// Reuse each nav item's original icon.
const sample = read('settings-profile.html');
const asideStart = sample.indexOf('<aside class="hidden w-52');
const asideSrc = sample.slice(asideStart, sample.indexOf('</aside>', asideStart));
const icons = {};
for (const m of asideSrc.matchAll(/data-ui-go="([^"]+)"\s*>\s*(<svg[\s\S]*?<\/svg>)/g)) icons[m[1]] = m[2].replace(/\s+/g, ' ');

const navButton = ([file, label], current) => `<button type="button" class="account-nav-item"${file === current ? ' aria-current="page"' : ''} data-ui-go="${file}">${icons[file]}<span>${label}</span></button>`;
const aside = (title, note, pages, current) => `<aside class="account-nav">
        <div class="account-nav-head"><p>${title}</p><span>${note}</span></div>
        ${pages.map(p => navButton(p, current)).join('\n        ')}
        ${title === 'Edit profile'
          ? '<a class="account-nav-switch" href="settings-appearance.html">Go to Settings <span aria-hidden="true">→</span></a>'
          : '<a class="account-nav-switch" href="settings-profile.html">Edit profile <span aria-hidden="true">→</span></a>'}
      </aside>`;
const phoneTabs = (pages, current) => `<nav class="account-phone-tabs" aria-label="Sections">${pages.map(([f, l]) => `<a href="${f}"${f === current ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

const swatches = (kind, colors, selected) => colors.map(c => `<button type="button" class="account-swatch" data-account-choice="${kind}" aria-label="${kind} ${c}" aria-pressed="${c === selected}" style="background:${c}"></button>`).join('');
const chips = (kind, items, selected) => items.map(i => `<button type="button" class="account-chip" data-account-choice="${kind}" aria-pressed="${i === selected}">${i}</button>`).join('');

const profileBody = (h2id, descId) => `<div class="account-content">
        ${phoneTabs(profilePages, 'settings-profile.html')}
        <header class="account-page-head">
          <h2 id="${h2id}" data-slot="dialog-title">My profile</h2>
          <p id="${descId}" data-slot="dialog-description">How other people see you in rooms, chats and friend lists.</p>
        </header>
        <div class="account-profile-grid">
          <figure class="account-preview">
            <img src="assets/captures/settings-profile-0.png" alt="Your character, captured from the original demo" class="captured-scene" />
            <figcaption><b>feifei</b><span>@feifei · CPE student · cat person</span></figcaption>
            <a class="account-secondary" href="settings-character.html">Change my character <span aria-hidden="true">→</span></a>
          </figure>
          <div class="account-sections">
            <section class="account-section" aria-labelledby="acc-name">
              <h3 id="acc-name">Name</h3>
              <label class="account-field"><span>Display name</span><input id="dn" value="feifei" /><small>Shown above your head and in chats.</small></label>
              <label class="account-field"><span>@handle</span><input id="un" value="@feifei" /><small>You can change it once every 30 days.</small></label>
            </section>
            <section class="account-section" aria-labelledby="acc-about">
              <h3 id="acc-about">About me</h3>
              <label class="account-field"><span>Short bio</span><textarea id="bio" rows="3" maxlength="120">CPE student · cat person ·</textarea><small>Up to 120 characters. Visible on your profile card.</small></label>
            </section>
          </div>
        </div>
        <footer class="account-actions"><button type="button" class="account-primary">Save profile</button></footer>
      </div>`;

const characterBody = (h2id, descId) => `<div class="account-content">
        ${phoneTabs(profilePages, 'settings-character.html')}
        <header class="account-page-head">
          <h2 id="${h2id}" data-slot="dialog-title">My character</h2>
          <p id="${descId}" data-slot="dialog-description">Your look in every room. Changes show after you save.</p>
        </header>
        <div class="account-profile-grid">
          <figure class="account-preview">
            <img src="assets/captures/settings-character-0.png" alt="Your character, captured from the original demo" class="captured-scene" />
            <figcaption><b>Preview</b><span>Turning and walking work in rooms only.</span></figcaption>
            <button type="button" class="account-secondary">Shuffle look</button>
          </figure>
          <div class="account-sections">
            <section class="account-section" aria-labelledby="acc-colours">
              <h3 id="acc-colours">Colours</h3>
              <div class="account-row"><span class="account-label">Hair</span><div class="account-swatches" role="group" aria-label="Hair colour">${swatches('Hair', ['#f59ac0', '#a58be8', '#8fdcc0', '#f7b267', '#fff1a8', '#c8e3ff', '#46527f', '#34313f'], '#fff1a8')}</div></div>
              <div class="account-row"><span class="account-label">Outfit</span><div class="account-swatches" role="group" aria-label="Outfit colour">${swatches('Outfit', ['#ff6fa8', '#7c5cff', '#2f80ed', '#12a37f', '#ef8a3c', '#e84855'], '#ff6fa8')}</div></div>
            </section>
            <section class="account-section" aria-labelledby="acc-acc">
              <h3 id="acc-acc">Accessory <small>Free for everyone</small></h3>
              <div class="account-chips" role="group" aria-label="Accessory">${chips('Accessory', ['None', 'Ribbon', 'Cat ears', 'Glasses', 'Headphones', 'Ahoge', 'Twin-tails'], 'Cat ears')}</div>
            </section>
            <section class="account-section" aria-labelledby="acc-shop">
              <h3 id="acc-shop">From the shop <small>Items you own</small></h3>
              <div class="account-chips" role="group" aria-label="Items you own">${chips('Owned', ['School uniform', 'Round glasses', 'Cat ears'], '')}</div>
              <a class="account-link" href="shop.html">Get more in the shop <span aria-hidden="true">→</span></a>
            </section>
          </div>
        </div>
        <footer class="account-actions"><button type="button" class="account-ghost">Reset</button><button type="button" class="account-primary">Save my look</button></footer>
      </div>`;

for (const [file] of [...profilePages, ...settingsPages]) {
  let s = read(file);
  const isProfile = profilePages.some(([f]) => f === file);
  const a0 = s.indexOf('<aside class="hidden w-52');
  const a1 = s.indexOf('</aside>', a0) + '</aside>'.length;
  s = s.slice(0, a0) + (isProfile ? aside('Edit profile', 'How others see you', profilePages, file) : aside('Settings', 'Only you, in every room', settingsPages, file)) + s.slice(a1);
  if (isProfile) {
    const c0 = s.indexOf('<div class="min-w-0 flex-1 overflow-y-auto p-6">');
    const c1 = s.lastIndexOf('<button', s.indexOf('data-slot="dialog-close"'));
    const h2id = s.slice(c0).match(/<h2 id="([^"]+)"/)[1];
    const descId = s.slice(c0).match(/<p\s+id="([^"]+)"/)[1];
    s = s.slice(0, c0) + (file === 'settings-profile.html' ? profileBody(h2id, descId) : characterBody(h2id, descId)) + '\n      ' + s.slice(c1);
  } else {
    s = s.replace('<div class="min-w-0 flex-1 overflow-y-auto p-6">', `<div class="min-w-0 flex-1 overflow-y-auto p-6 account-settings-content">\n        ${phoneTabs(settingsPages, file)}`);
  }
  s = s.replace('role="dialog"', 'role="dialog" data-account-window=""');
  if (!s.includes('assets/account-settings.css')) s = s.replace('</head>', '  <link rel="stylesheet" href="assets/account-settings.css" />\n  </head>');
  if (!s.includes('assets/account-settings.js')) s = s.replace('<script src="assets/prototype.js"></script>', '<script src="assets/prototype.js"></script>\n    <script src="assets/account-settings.js"></script>');
  fs.writeFileSync(path.join(root, file), s);
  console.log('updated', file);
}
