import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-time HTML authoring pass for the approved chat-first layout.
// Uses the preserved original capture, never re-captures or edits the real app.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capture = JSON.parse(await readFile(path.join(ROOT, 'tools/capture-data.json'), 'utf8'));
const require = createRequire(path.join(capture.source, 'package.json'));
const { chromium } = require('playwright');
const prettier = require('prettier');
const original = new Map(capture.records.filter(r => r.data).map(r => [r.id, r]));
const rootClass = original.get('home').data.rootClass;
const browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] });
const parser = await browser.newPage();
await parser.route('**/*', r => r.abort());
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const paths = {
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  friends: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  focus: '<path d="M3 3v18h18M7 14v3m5-8v8m5-12v12"/>',
  discover: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z"/>',
  shop: '<path d="M6 3 3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7l-3-4ZM3 7h18M8 11a4 4 0 0 0 8 0"/>',
  crown: '<path d="m2 5 5 4 5-6 5 6 5-4-3 14H5L2 5Zm3 17h14"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  settings: '<path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 2 4 3-1 1-3 3-1 2-3-2-3 1-3-3-2-3 1-2-3Z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  compose: '<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7M15 3l6 6M10 14l1-5 8-8 5 5-8 8-6 1Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  walk: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5m5 5H3"/>',
  pin: '<path d="m16 3 5 5-4 1-4 5v4l-3-3-6 6m1-12 4 4 5-5 1-4 1-1Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m12 19-7-7 7-7m-7 7h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M8 8h.01M16 8h.01"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
};
const icon = name => `<svg class="chat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.chat}</svg>`;
const logo = '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path d="M25.85 17.74A10 10 0 1 1 16 6" fill="none" stroke="var(--primary)" stroke-width="6" stroke-linecap="round"/><circle cx="23.66" cy="9.57" r="3.6" fill="var(--tea)"/></svg>';
const people = {
  feifei: { name: 'feifei', color: '#bc4678', presence: 'online' },
  Mai: { name: 'Mai', color: '#7758c4', presence: 'focus' },
  Jod: { name: 'Jod', color: '#b3612f', presence: 'focus' },
  Ploy: { name: 'Ploy', color: '#b3612f', presence: 'online' },
  Ken: { name: 'Ken', color: '#2f7d55', presence: 'online' },
  Nam: { name: 'Nam', color: '#2e6ea8', presence: 'idle' },
  Bow: { name: 'Bow', color: '#a63367', presence: 'offline' },
  Pim: { name: 'Pim', color: '#7a6a3a', presence: 'offline' },
};
const avatar = (person, size = '') => `<span class="chat-avatar ${size}" style="--avatar-color:${esc(person.color || '#7758c4')}"><span>${esc(person.emoji || person.name.slice(0, 1))}</span>${person.presence ? `<i class="presence-${person.presence}" aria-label="${esc(person.presence)}"></i>` : ''}</span>`;
const rail = (active = 'Chat', guest = false) => {
  const nav = guest ? [['discover', 'Discover', 'discover-guest.html']] : [
    ['chat', 'Chat', 'home.html'], ['friends', 'Friends', 'friends.html'], ['focus', 'Focus', 'focus.html'],
    ['discover', 'Discover', 'discover.html'], ['shop', 'Shop', 'shop.html'],
  ];
  return `<nav class="app-rail" aria-label="App"><a class="rail-brand" href="${guest ? 'discover-guest.html' : 'home.html'}" aria-label="Connecta">${logo}</a>
  <div class="rail-links">${nav.map(([id, label, href]) => `<a class="rail-link${active === label ? ' is-active' : ''}" href="${href}"${active === label ? ' aria-current="page"' : ''}><span class="rail-icon">${icon(id)}${label === 'Friends' ? '<span class="rail-badge">1</span>' : ''}</span><span>${label}</span></a>`).join('')}</div>
  <div class="rail-bottom">${guest ? `<a class="rail-link" href="login.html">${icon('walk')}<span>Sign in</span></a>` : `<a class="rail-link${active === 'Plus' ? ' is-active' : ''}" href="plus.html">${icon('crown')}<span>Plus</span></a>
    <button class="rail-link" data-ui-go="inbox.html" aria-label="Inbox, 4 new"><span class="rail-icon">${icon('bell')}<span class="rail-badge">4</span></span><span>Inbox</span></button>
    <a class="rail-link" href="settings-profile.html">${icon('settings')}<span>Settings</span></a>
    <button class="rail-profile" aria-label="You" data-ui-go="profile-menu.html">${avatar(people.feifei)}<span>feifei</span></button>`}</div></nav>`;
};

async function extract(record) {
  await parser.setContent(record.data.body, { waitUntil: 'domcontentloaded' });
  return parser.evaluate(() => {
    const header = document.querySelector('header');
    const aside = document.querySelector('aside[aria-label="People"]');
    const section = document.querySelector('section[aria-label="Room chat"]');
    const messages = [...document.querySelectorAll('.group.relative.flex.gap-3')].map(row => {
      const content = [...row.children].find(c => c.classList.contains('min-w-0'));
      if (!content) return null;
      const text = content.querySelector('p.leading-relaxed');
      const author = content.querySelector('.font-extrabold')?.textContent;
      const time = content.querySelector('p.flex .text-xs')?.textContent;
      const image = content.querySelector('img');
      return { author: author?.trim(), time: time?.trim(), html: text?.innerHTML || '', text: text?.textContent || '', image: image?.getAttribute('src'), reactions: [...content.querySelectorAll('button')].map(b => b.textContent.trim()) };
    }).filter(m => m?.author && (m.html || m.image));
    const groups = aside ? [...aside.children].slice(1).map(group => ({
      title: group.querySelector('p')?.textContent.trim(),
      members: [...group.children].filter(e => e.tagName === 'DIV').map(row => {
        const spans = [...row.querySelectorAll('span.block')];
        return { name: spans[0]?.textContent.trim(), activity: spans[1]?.textContent.trim(), presence: row.querySelector('[aria-label]')?.getAttribute('aria-label')?.toLowerCase() || 'offline' };
      }).filter(p => p.name),
    })) : [];
    const emoji = header?.querySelector(':scope > span.grid')?.textContent.trim();
    return {
      name: header?.querySelector('.truncate')?.textContent.trim(), emoji,
      summary: header?.querySelector('span.text-xs')?.textContent.replace(/\s+/g, ' ').trim(),
      walk: header?.querySelector('a[href^="walk-"],a[href*="/rooms/"]')?.getAttribute('href'),
      description: aside?.firstElementChild?.querySelector('p.text-sm')?.textContent.trim(),
      membersSummary: aside?.firstElementChild?.querySelector('p.text-xs')?.textContent.trim(),
      pinned: section?.querySelector(':scope > p')?.textContent.trim(), messages, groups,
    };
  });
}

const conversations = [];
for (const record of original.values()) {
  if (record.group === 'Rooms') {
    const data = await extract(record);
    if (data.walk?.startsWith('/')) data.walk = data.summary?.includes('Rooftop') ? 'walk-rooftop.html' : data.summary?.includes('Café') ? 'walk-cafe.html' : 'walk-library.html';
    conversations.push({ id: record.id, kind: 'room', file: record.id + '.html', ...data });
  }
}
for (const [id, name, preview, time] of [['mai', 'Mai', 'bring your calculus notes', '09:15'], ['jod', 'Jod', 'You: 👍', 'Yesterday'], ['ken', 'Ken', 'gg last night 🎴', 'Mon']]) {
  const record = original.get('messages-' + id);
  const data = await extract(record);
  conversations.push({ ...data, id: 'messages-' + id, kind: 'dm', file: 'messages-' + id + '.html', name, preview, time, summary: name === 'Mai' ? 'Focusing · Calculus' : name === 'Jod' ? 'Focusing · Kuy pawa' : 'Online', groups: [] });
}
const chanom = conversations.find(c => c.id === 'room-chanom');
const sharedPhoto = chanom.messages.find(m => m.author === 'Jod');
if (sharedPhoto) sharedPhoto.image = 'assets/source/38e6ff301baf81.png';
// A single illustrative outgoing bubble makes the Messenger-like alignment
// reviewable. It is preview content, never a sent or saved chat message.
chanom.messages.push({ author: 'feifei', time: 'Today 20:56', html: 'I’m coming! Save me a seat 🐱', text: 'I’m coming! Save me a seat 🐱', reactions: [] });
const order = ['room-chanom', 'messages-mai', 'room-cpe', 'messages-jod', 'room-gamenight', 'messages-ken'];
conversations.sort((a, b) => (order.includes(a.id) ? order.indexOf(a.id) : 99) - (order.includes(b.id) ? order.indexOf(b.id) : 99));

function threadList(active) {
  return `<aside class="conversation-list" aria-label="Chats"><header class="chat-list-header"><h1>Chats</h1><div><button class="chat-icon-button" aria-label="Make a room" data-ui-go="create-room.html">${icon('plus')}</button><a class="chat-icon-button" href="friend-add.html" aria-label="New message">${icon('compose')}</a></div></header>
    <label class="chat-list-search">${icon('search')}<input type="search" aria-label="Search chats" placeholder="Search chats" data-chat-search autocomplete="off"></label>
    <nav class="conversation-rows" aria-label="Conversations">${conversations.map(c => {
      const last = c.messages.at(-1);
      const preview = c.preview || (last?.author ? `${last.author === 'feifei' ? 'You' : last.author}: ${last.text || 'Shared a photo'}` : c.description || 'Say hello to your room');
      const unread = c.id === 'room-chanom' ? 3 : c.id === 'messages-mai' ? 2 : c.id === 'room-cpe' ? 12 : 0;
      const person = c.kind === 'dm' ? people[c.name] : { name: c.name, emoji: c.emoji, color: '#8259a5', presence: c.groups[0]?.members.length ? 'online' : null };
      return `<a href="${c.file}" class="conversation-row${active.id === c.id ? ' is-active' : ''}${unread ? ' has-unread' : ''}" data-chat-row data-chat-name="${esc(c.name.toLowerCase())}"${active.id === c.id ? ' aria-current="page"' : ''}>${avatar(person, 'avatar-list')}<span class="conversation-copy"><span class="conversation-name">${esc(c.name)}</span><span class="conversation-preview">${esc(preview)}</span></span><span class="conversation-meta"><time>${esc(c.time || (c.id === 'room-chanom' ? '20:56' : 'Yesterday'))}</time>${unread ? `<span class="unread-count">${unread}</span>` : ''}</span></a>`;
    }).join('')}<p class="chat-search-empty" hidden role="status">No chats found. Try another name.</p></nav></aside>`;
}

function messagesMarkup(c) {
  if (!c.messages.length) return `<div class="conversation-empty">${avatar({ name: c.name, emoji: c.emoji, color: '#8259a5' }, 'avatar-list')}<h2>${esc(c.name)}</h2><p>This is the start of your room chat.</p></div>`;
  return `<div class="chat-date"><span>Today</span></div>${c.messages.map((m, i) => {
    const mine = m.author === 'feifei' || m.author === 'You';
    const person = people[m.author] || { name: m.author, color: '#7758c4' };
    const photo = m.image ? `<a class="bubble-photo" href="${esc(m.image)}" aria-label="Open room photo"><img src="${esc(m.image)}" alt="Photo shared from the original study room demo"></a>` : '';
    const reactions = m.reactions?.length ? `<div class="bubble-reactions">${m.reactions.map(r => `<button type="button" aria-label="Reaction ${esc(r)}" data-chat-reaction>${esc(r)}</button>`).join('')}</div>` : '';
    return `${i === c.messages.length - 1 && mine ? '<div class="chat-time-divider">20:56</div>' : ''}<article class="chat-message${mine ? ' is-mine' : ''}" data-chat-message>${mine ? '' : avatar(person)}<div class="message-content">${mine ? '' : `<p class="message-author">${esc(m.author)}</p>`}<div class="message-bubble">${m.html ? `<p>${m.html}</p>` : ''}${photo}</div>${reactions}<time class="message-time">${esc(m.time)}</time></div></article>`;
  }).join('')}`;
}

function membersMarkup(c) {
  const groups = c.kind === 'room' ? c.groups : [{ title: 'Conversation', members: [{ ...people[c.name], activity: c.summary }] }];
  return `<aside class="chat-members" id="chat-members" aria-label="Members"><header><h2>${c.kind === 'room' ? 'Members' : 'Conversation'}</h2><button class="chat-icon-button members-close" aria-label="Close members" data-chat-members-close>${icon('close')}</button></header>
  ${groups.map((group, i) => `<section class="member-group"><h3>${c.kind === 'room' ? i === 0 ? `In the room · ${group.members.length}` : `Other members · ${group.members.length}` : 'Friends'} </h3>${group.members.map(p => {
    const person = { ...(people[p.name] || { color: '#7758c4' }), ...p };
    const status = person.presence.startsWith('focus') ? 'focus' : person.presence === 'away' ? 'idle' : person.presence;
    return `<a class="member-row${status === 'offline' ? ' is-offline' : ''}" href="${['Mai', 'Jod', 'Ken'].includes(p.name) ? `messages-${p.name.toLowerCase()}.html` : 'friends.html'}">${avatar({ ...person, presence: status })}<span><strong>${esc(p.name)}</strong><span>${esc(p.activity)}</span></span></a>`;
  }).join('')}</section>`).join('')}
  ${c.kind === 'room' ? `<a class="members-invite" href="room-invite.html">${icon('plus')}Invite friends</a>` : ''}</aside>`;
}

function chatShell(c, id = 'home') {
  const person = c.kind === 'dm' ? people[c.name] : { name: c.name, emoji: c.emoji, color: '#8259a5', presence: 'online' };
  const mapSummary = c.summary || (c.kind === 'room' ? 'Your room' : 'Online');
  return `<div class="chat-layout" data-chat-layout data-mobile-view="${['home', 'home-active', 'home-you-run', 'messages'].includes(id) ? 'list' : 'thread'}">${rail('Chat')}${threadList(c)}
    <main class="chat-main" aria-label="${esc(c.name)} conversation" data-members="auto">
      <header class="conversation-header"><a class="chat-icon-button chat-mobile-back" href="home.html" aria-label="Back to chats">${icon('back')}</a><div class="conversation-identity">${avatar(person)}<div><h2>${esc(c.name)}${c.id === 'room-chanom' ? '<span class="chat-plus-badge">Plus</span>' : ''}</h2><p>${esc(mapSummary)}</p></div></div>
      <div class="conversation-actions"><button class="chat-icon-button" aria-label="Search in conversation" data-chat-find>${icon('search')}</button>${c.kind === 'room' ? `<a class="chat-walk-in" href="${esc(c.walk || 'walk-library.html')}" aria-label="Walk in">${icon('walk')}<span>Walk in</span></a>` : ''}<button class="chat-icon-button members-toggle" aria-label="Show members" aria-controls="chat-members" aria-expanded="true" data-chat-members>${icon('friends')}</button><button class="chat-icon-button" aria-label="${c.kind === 'room' ? `More for ${esc(c.name)}` : 'Conversation options'}" data-ui-go="${c.kind === 'room' ? 'room-menu.html' : 'friends.html'}">${icon('more')}</button></div></header>
      ${c.pinned ? `<a class="pinned-message" href="room-about.html" aria-label="Pinned event: ${esc(c.pinned)}">${icon('pin')}<span><small>Room event</small><strong>${esc(c.pinned)}</strong></span>${icon('chevron')}</a>` : ''}
      <div class="chat-find" hidden><label>${icon('search')}<input type="search" placeholder="Search in conversation" aria-label="Search in conversation" data-chat-find-input></label><button class="chat-icon-button" aria-label="Close search" data-chat-find-close>${icon('close')}</button><span role="status" data-chat-find-status></span></div>
      <div class="conversation-body"><section class="chat-thread" aria-label="${c.kind === 'room' ? 'Room chat' : 'Direct messages'}"><div class="chat-timeline" data-chat-timeline>${messagesMarkup(c)}</div>
        <form class="chat-composer" aria-label="Message composer"><button type="button" class="chat-icon-button" aria-label="Add attachment" data-chat-preview>${icon('plus')}</button><button type="button" class="chat-icon-button" aria-label="Attach image" data-chat-preview>${icon('image')}</button><label class="composer-field"><span class="sr-only">${c.kind === 'room' ? 'Message the room' : `Message ${esc(c.name)}`}</span><input placeholder="${c.kind === 'room' ? 'Message the room…' : `Message ${esc(c.name)}…`}" autocomplete="off" aria-label="${c.kind === 'room' ? 'Message the room' : `Message ${esc(c.name)}`}" maxlength="2000"><button type="button" class="chat-icon-button" aria-label="Emoji" data-chat-preview>${icon('smile')}</button></label><button type="submit" class="chat-send" aria-label="Send" title="Static UI preview">${icon('send')}</button></form>
      </section>${membersMarkup(c)}</div>
    </main></div>`;
}

const demoButton = `<button class="chat-demo-control" aria-label="Demo controls" data-ui-toolbar>Demo</button>`;
const head = title => `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Connecta UI</title><link rel="stylesheet" href="assets/source/4f2683abfb221e.css"><link rel="stylesheet" href="assets/overrides.css"><link rel="stylesheet" href="assets/chat-layout.css"><script src="assets/theme.js"></script>`;
const routeMap = Object.fromEntries([...original.values()].filter(r => !r.actions.length && r.viewer !== 'guest').map(r => [r.url, r.id + '.html']));
routeMap['/checkout'] = 'checkout-monthly.html';

async function restoreBindings(body, record) {
  await parser.setContent(body, { waitUntil: 'domcontentloaded' });
  return parser.evaluate(({ routeMap, record }) => {
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      const url = new URL(a.getAttribute('href'), 'http://localhost:3100');
      let target = routeMap[url.pathname + url.search] || routeMap[url.pathname];
      if (!target && url.pathname.includes('/rooms/')) target = url.pathname.includes('rooftop') ? 'walk-rooftop.html' : url.pathname.includes('cafe') || url.pathname.includes('lounge') ? 'walk-cafe.html' : 'walk-library.html';
      a.setAttribute('href', (target || 'catalogue.html') + url.hash);
    });
    const tabs = { Everything: 'shop', Outfits: 'shop-outfits', Accessories: 'shop-accessories', Pets: 'shop-pets', 'Photo frames': 'shop-frames' };
    document.querySelectorAll('button,[role="tab"]').forEach(b => {
      if (b.hasAttribute('data-ui-go') || b.closest('[data-chat-layout],.app-rail')) return;
      const text = b.textContent.replace(/\s+/g, ' ').trim();
      const aria = b.getAttribute('aria-label') || '';
      let target;
      if (record.url === '/home/shop') {
        target = tabs[text];
        if (text.includes('Try it on')) target = 'shop-try-on';
        if (text === 'Back to the shop') target = 'shop';
      }
      if (text === 'Add friend' && record.id !== 'friend-add') target = 'friend-add';
      if (/^Requests\s*\d*$/.test(text)) target = 'friend-requests';
      if (aria.startsWith('More for ')) target = 'room-menu';
      if (aria.startsWith('Message ')) target = ['Mai', 'Jod', 'Ken'].some(n => aria.endsWith(n)) ? `messages-${aria.slice(8).toLowerCase()}` : 'messages';
      if (target) b.dataset.uiGo = target + '.html';
    });
    return document.body.innerHTML;
  }, { routeMap, record });
}
async function saveHtml(id, title, body, back) {
  const html = `<!doctype html><html lang="en" class="${rootClass}" data-palette="strawberry" data-ui-page="${id}" data-ui-layout="chat-first"><head>${head(title)}</head><body class="app-bg ui-with-rail"${back ? ` data-ui-back="${back}.html"` : ''}><!-- Chat-first HTML prototype. Edit this markup and assets/chat-layout.css. -->${body}${demoButton}<script src="assets/prototype.js"></script><script src="assets/chat-layout.js"></script></body></html>`;
  await writeFile(path.join(ROOT, id + '.html'), await prettier.format(html, { parser: 'html', printWidth: 120 }));
}

const changed = [];
try {
  for (const id of ['home', 'home-active', 'home-you-run', 'messages']) {
    await saveHtml(id, 'Chats', chatShell(chanom, id)); changed.push(id);
  }
  for (const conversation of conversations) {
    await saveHtml(conversation.id, conversation.name, chatShell(conversation, conversation.id)); changed.push(conversation.id);
  }
  const appRecords = [...original.values()].filter(r => !changed.includes(r.id) && (r.url.startsWith('/home') || r.url === '/discover' || r.url === '/servers/chanom'));
  for (const record of appRecords) {
    await parser.setContent(record.data.body, { waitUntil: 'domcontentloaded' });
    const extracted = await parser.evaluate(() => {
      const top = [...document.body.children].find(e => e.tagName === 'DIV' && e.querySelector('header'));
      const main = top?.querySelector(':scope > main');
      const content = main?.innerHTML;
      const extras = [...document.body.children].filter(e => e !== top && !['SCRIPT', 'NEXT-ROUTE-ANNOUNCER'].includes(e.tagName) && e.getAttribute('aria-label') !== 'Demo controls' && !e.hasAttribute('hidden')).map(e => e.outerHTML).join('');
      return { content, extras };
    });
    const homeBackground = record.url === '/home' || record.url === '/servers/chanom';
    const active = record.url.includes('/friends') ? 'Friends' : record.url.includes('/focus') ? 'Focus' : record.url.includes('/shop') ? 'Shop' : record.url.includes('/plus') ? 'Plus' : record.url === '/discover' ? 'Discover' : 'Chat';
    const body = homeBackground ? chatShell(chanom, 'home') : `<div class="rail-page-layout">${rail(active, record.viewer === 'guest')}<main class="rail-page-content">${extracted.content || ''}</main></div>`;
    // The initial export already supplied data-ui-go and local asset links on
    // captured dialogs; keep the authored current portal markup, not raw React.
    const current = await readFile(path.join(ROOT, record.id + '.html'), 'utf8');
    await parser.setContent(current.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
    const portals = await parser.evaluate(() => [...document.body.children].filter(e => e.hasAttribute('data-radix-popper-content-wrapper') || ['dialog-overlay', 'dialog-content', 'sheet-overlay', 'sheet-content'].includes(e.dataset.slot)).map(e => e.outerHTML).join(''));
    await saveHtml(record.id, record.title, await restoreBindings(body + portals, record), record.back); changed.push(record.id);
  }
  const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
  manifest.uiRevision = { date: '2026-11-16', name: 'Chat-first home with labeled left navigation', files: changed.map(id => id + '.html') };
  for (const p of manifest.pages) if (['home', 'messages', 'home-active', 'home-you-run'].includes(p.id)) p.title = p.id === 'home' ? 'Chats' : p.id === 'messages' ? 'Chats · messages' : 'Chats · legacy entry';
  await writeFile(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(ROOT, 'assets/pages.js'), `window.UI_PAGES = ${JSON.stringify(manifest.pages, null, 2)};\n`);
  await parser.setContent((await readFile(path.join(ROOT, 'catalogue.html'), 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
  const catalogue = await parser.evaluate(() => {
    document.querySelectorAll('a[href="home.html"]').forEach(a => a.textContent = a.textContent.includes('Open') ? 'Open Chats' : 'Chats');
    document.querySelectorAll('a[href="home-active.html"],a[href="home-you-run.html"]').forEach(a => a.textContent = 'Chats · legacy entry');
    const theme = document.createElement('script'); theme.src = 'assets/theme.js'; document.head.append(theme);
    const runtime = document.createElement('script'); runtime.src = 'assets/prototype.js'; document.body.append(runtime);
    return '<!doctype html>' + document.documentElement.outerHTML;
  });
  await writeFile(path.join(ROOT, 'catalogue.html'), await prettier.format(catalogue, { parser: 'html', printWidth: 120 }));
  await writeFile(path.join(ROOT, 'tools/chat-content.json'), JSON.stringify(conversations, null, 2));
  console.log(`Updated ${changed.length} HTML pages. Chat content: ${conversations.length} conversations.`);
} finally { await browser.close(); }
