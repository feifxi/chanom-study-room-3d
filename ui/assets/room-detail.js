// Shared room pop-up and ⋯ menu. Preferences are local to the browser tab.
// - Pressing a card opens the room pop-up (banner, details, next event, pinned, people, Chat / Walk in).
// - A card's ⋯ opens the room menu right beside it on Home; the pop-up's ⋯ opens the same menu.
// - Notifications opens a side menu (to the right, left if no space; replaces the menu on phones).
(() => {
  const cards = [...document.querySelectorAll('.home-featured-room')];
  const listSelector = '.home-featured-grid + div > [data-ui-search-item]';
  const compactRows = [...document.querySelectorAll(listSelector)];
  const chatTrigger = document.querySelector('[data-room-chat-menu]');
  const chatMain = chatTrigger?.closest('.chat-main');
  if (!cards.length && !chatMain) return;

  // Categories use the same names as the Discover filter. Events and pinned messages are sample content.
  const info = {
    'Chanom Friends': { tags: ['Chill', 'Games'], event: ['Werewolf night', 'Fri 20:00'], pinned: [['Room event', '#7758c4', 'Werewolf night · Fri 20:00'], 1] },
    'CPE Year 3': { tags: ['Study'], event: ['Exam review sprint', 'Mon 19:00'], pinned: [['Nam', '#3a8fb7', 'Past papers and the OS cheat sheet are in the shared drive.'], 2] },
    'Werewolf Fridays': { tags: ['Games', 'Late night'], event: ['Werewolf Fridays', 'Fri 21:00'], pinned: [['Bow', '#aa356a', 'New players: read the role cards before your first round.'], 1] },
    'IELTS Buddies': { tags: ['Language exchange', 'Study'], event: ['Speaking practice', 'Tue 18:30'], pinned: [['Ken', '#2e775d', 'Part 2 cue cards for this week are pinned in the room board.'], 1] },
    'Manga Club': { tags: ['Anime', 'Art'], event: ['Chapter talk', 'Sun 15:00'], pinned: [['Earth', '#2e6ea8', 'No spoilers past chapter 112 outside the spoiler table.'], 1] },
    'Game Night Club': { tags: ['Games', 'Late night'], event: ['Draw & Guess', 'Sat 21:00'], pinned: [['Ploy', '#b3612f', 'Teams are picked at 20:55. Late? Join the next round.'], 1] },
  };
  const pool = [['A', '#2e6ea8'], ['K', '#2e775d'], ['S', '#c0587e'], ['T', '#7758c4'], ['W', '#e9955a'], ['N', '#3a8fb7'], ['J', '#a7522f'], ['B', '#aa356a']];
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    more: svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    about: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
    invite: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
    link: svg('<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>'),
    pin: svg('<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>'),
    unpin: svg('<path d="M12 17v5M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89M2 2l20 20M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/>'),
    read: svg('<path d="m2 12 5 5L18 6M13 17l9-9"/>'),
    bell: svg('<path d="M10.27 21a2 2 0 0 0 3.46 0M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>'),
    next: svg('<path d="m9 18 6-6-6-6"/>'),
    back: svg('<path d="m15 18-6-6 6-6"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    settings: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    leave: svg('<path d="m16 17 5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'),
    calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v3l2 1"/>'),
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
    chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>'),
  };
  const notifyOptions = ['All messages', 'Mentions only', 'Nothing'];

  // ---------- Room pop-up ----------
  const dlg = document.createElement('dialog');
  dlg.className = 'room-detail';
  dlg.setAttribute('aria-labelledby', 'rd-title');
  dlg.innerHTML = `
    <div class="rd-banner"><img alt="" /><div class="rd-banner-chips" data-rd-status></div></div>
    <div class="rd-top-actions">
      <button type="button" class="rd-icon-button" data-rd-more aria-haspopup="menu" aria-expanded="false" aria-label="More options">${I.more}</button>
      <button type="button" class="rd-icon-button" data-rd-close aria-label="Close">${I.close}</button>
    </div>
    <div class="rd-body">
      <div class="rd-head"><span class="rd-map-icon"><img alt="" data-rd-icon /></span><div><h2 id="rd-title"></h2><p class="rd-map" data-rd-map></p></div></div>
      <p class="rd-desc" data-rd-desc></p>
      <div class="rd-tags" data-rd-tags></div>
      <div class="rd-event"><span class="rd-event-icon">${I.calendar}</span><div><span class="rd-label">Next event</span><b data-rd-event-name></b></div><span class="rd-event-time" data-rd-event-time></span></div>
      <section class="rd-pinned" aria-labelledby="rd-pinned-title">
        <h3 id="rd-pinned-title">${I.pin}Pinned messages<span class="rd-count-pill" data-rd-pinned-count></span></h3>
        <a class="rd-pinned-card" data-rd-pinned-link><span class="rd-pinned-avatar" data-rd-pinned-avatar></span><span class="rd-pinned-copy"><b data-rd-pinned-from></b><span data-rd-pinned-text></span></span>${I.next}</a>
      </section>
      <div class="rd-people"><span class="room-card-people" data-rd-stack aria-hidden="true"></span><span class="rd-count" data-rd-count></span></div>
    </div>
    <footer class="rd-footer">
      <p class="rd-toast" role="status" aria-live="polite" data-rd-toast></p>
      <div class="rd-buttons"><a class="rd-chat" data-rd-chat>${I.chat}Chat</a><a class="rd-walk" data-rd-walk>${I.play}<span data-rd-walk-label>Walk in</span></a><a class="rd-chat" data-rd-settings href="room-settings-overview.html">${I.settings}Settings</a></div>
    </footer>`;
  document.body.append(dlg);
  const $ = s => dlg.querySelector(s);

  // ---------- Shared room menu + Notifications side menu ----------
  const menu = document.createElement('div');
  menu.className = 'rd-menu';
  menu.id = 'rd-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Room options');
  menu.hidden = true;
  menu.innerHTML = `
    <button type="button" role="menuitem" class="rd-item" data-rd-about>${I.about}About this room</button>
    <a role="menuitem" class="rd-item" data-rd-invite href="room-invite.html">${I.invite}Invite friends</a>
    <button type="button" role="menuitem" class="rd-item" data-rd-copy>${I.link}Copy room link</button>
    <hr />
    <button type="button" role="menuitem" class="rd-item" data-rd-pin></button>
    <button type="button" role="menuitem" class="rd-item" data-rd-read>${I.read}Mark as read</button>
    <button type="button" role="menuitem" class="rd-item" data-rd-notify aria-haspopup="menu" aria-expanded="false" aria-controls="rd-side">${I.bell}<span>Notifications</span><span class="rd-item-end" data-rd-notify-value></span>${I.next}</button>
    <a role="menuitem" class="rd-item" data-rd-settings-link href="room-settings-overview.html">${I.settings}Room settings</a>
    <hr />
    <button type="button" role="menuitem" class="rd-item rd-leave" data-rd-leave>${I.leave}Leave room</button>`;
  const side = document.createElement('div');
  side.className = 'rd-side';
  side.id = 'rd-side';
  side.setAttribute('role', 'menu');
  side.setAttribute('aria-label', 'Notifications');
  side.hidden = true;
  side.innerHTML = `
    <button type="button" class="rd-side-back" data-rd-side-back>${I.back}Back</button>
    <p class="rd-side-title">Notify me about</p>
    ${notifyOptions.map(t => `<button type="button" role="menuitemradio" class="rd-side-option" data-rd-notify-option aria-checked="false">${t}${I.check}</button>`).join('')}`;
  document.body.append(menu, side);

  const pageToast = document.createElement('p');
  pageToast.className = 'rd-page-toast';
  pageToast.setAttribute('role', 'status');
  pageToast.setAttribute('aria-live', 'polite');
  document.body.append(pageToast);

  // ---------- Card data ----------
  const state = new Map();
  const roomKey = chat => `connecta-room-menu:${new URL(chat, location.href).pathname}`;
  const getState = (source, chat, defaults) => {
    if (!state.has(source)) {
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(roomKey(chat))); } catch {}
      state.set(source, { pinned: false, unread: false, notify: 'Mentions only', ...defaults, ...saved });
    }
    return state.get(source);
  };
  const saveState = (source, chat) => {
    try { sessionStorage.setItem(roomKey(chat), JSON.stringify(state.get(source))); } catch {}
  };

  const readChat = () => {
    const identity = chatMain.querySelector('.conversation-identity');
    const title = identity.querySelector('h2').cloneNode(true);
    title.querySelector('.chat-plus-badge')?.remove();
    const name = title.textContent.trim();
    const [map, presence = ''] = identity.querySelector('p').textContent.trim().split(' · ');
    const room = chatTrigger.dataset.roomChatMenu;
    const row = document.querySelector('.conversation-row.is-active');
    const roomInfo = info[name] || { tags: [], event: null, pinned: null };
    const icon = identity.querySelector('img')?.src || '';
    getState(chatTrigger, room, { pinned: room === 'room-chanom.html', unread: row?.classList.contains('has-unread') || false });
    return {
      name, role: '', room, map, desc: '',
      banner: chatMain.querySelector('.room-preview img')?.src || icon,
      icon, full: /full/i.test(presence), status: [], count: presence.match(/\d+\s*\/\s*\d+/)?.[0] || '0/25',
      avatars: [], walk: chatMain.querySelector('.chat-walk-in')?.getAttribute('href') || '', chat: room,
      info: roomInfo, settings: room === 'room-chanom.html', invite: room === 'room-chanom.html',
    };
  };

  const read = card => {
    if (card === chatTrigger) return readChat();
    if (card.matches(listSelector)) {
      const link = card.querySelector(':scope > a.absolute');
      const name = link.getAttribute('aria-label').replace(/^Open /, '');
      const chat = link.getAttribute('href');
      const [map, desc = ''] = card.querySelector('.min-w-0.flex-1 > .text-muted-foreground').textContent.trim().split(' · ');
      const icon = card.querySelector('.original-home-art img')?.src || '';
      const walk = card.querySelector('a[data-slot="button"]')?.getAttribute('href') || '';
      const count = card.querySelector('.font-mono')?.textContent.trim() || '0/25';
      getState(card, chat);
      return { name, role: '', room: chat, chat, map, desc, icon, banner: icon, count, walk,
        full: false, status: [], avatars: [], settings: false, invite: false,
        info: info[name] || { tags: [], event: null, pinned: null } };
    }
    const title = card.querySelector('.home-room-title');
    const nameEl = title.querySelector('.home-room-name');
    const badge = [...title.querySelectorAll(':scope > span')].filter(el => el !== nameEl && !el.querySelector('img')).pop();
    const role = badge ? badge.textContent.trim() : '';
    let name = nameEl ? nameEl.textContent.trim() : '';
    if (!name) { const t = title.cloneNode(true); t.querySelectorAll('span').forEach(x => x.remove()); name = t.textContent.trim(); }
    const parts = card.querySelector('.home-room-description').textContent.trim().split(' · ');
    const chips = [...card.querySelectorAll('.home-room-status > span, .home-chat-badge')].map(s => (s.getAttribute('title') || s.textContent).replace(/\s+/g, ' ').replace(/(\d)(inside|full)/, '$1 $2').trim()).filter(Boolean);
    const avatars = [...card.querySelectorAll('.home-room-people > span[style], .home-room-content .ml-auto [style*="background"]')].map(a => [a.textContent.trim(), (a.getAttribute('style').match(/#[0-9a-f]{6}/i) || ['#888'])[0]]);
    const buttons = [...card.querySelectorAll('.home-room-content [data-slot="button"]')];
    const walk = buttons.find(b => !/Chat/.test(b.textContent));
    const chat = buttons.find(b => /Chat/.test(b.textContent));
    const room = card.querySelector(':scope > a.absolute').getAttribute('href');
    const chatHref = chat ? chat.getAttribute('href') : room;
    getState(card, chatHref, { pinned: !!card.querySelector('.lucide-pin'), unread: /new/.test(chips.join(' ')) });
    return {
      name, role, room, map: parts[0], desc: parts.slice(1).join(' · ') || parts[0],
      banner: (card.querySelector(':scope > img') || card.querySelector(':scope > div img') || card.querySelector('.home-room-title img') || {}).src || '',
      icon: (card.querySelector('.home-room-title img') || {}).src || '',
      full: /full/i.test(chips.join(' ')),
      status: chips.filter(c => !/Plus/.test(c)),
      count: ((card.querySelector('.home-room-status .font-mono') || {}).textContent || '0/25').trim(),
      avatars,
      walk: walk ? walk.getAttribute('href') || '' : '',
      chat: chatHref,
      settings: chatHref === 'room-chanom.html', invite: chatHref === 'room-chanom.html',
      info: info[name] || { tags: [], event: null, pinned: null },
    };
  };
  const stack = (count, avatars) => {
    const n = parseInt(count, 10) || 0;
    const people = avatars.slice(0, 5);
    let k = n;
    while (people.length < Math.min(n, 5)) { const p = pool[k++ % pool.length]; if (!people.some(x => x[0] === p[0])) people.push(p); }
    const plus = n > 5;
    return (plus ? people.slice(0, 4) : people.slice(0, n)).map(([c, col]) => `<span style="--avatar:${col}">${c}</span>`).join('') + (plus ? `<span class="room-card-more">+${n - 4}</span>` : '');
  };

  const extraPins = chat => {
    try {
      const entries = JSON.parse(sessionStorage.getItem(`connecta-room-pins:${chat}`));
      return Array.isArray(entries) ? entries.map(entry => JSON.parse(entry)).filter(entry => typeof entry[0] === 'string' && typeof entry[2] === 'string') : [];
    } catch { return []; }
  };

  const fill = (card, d) => {
    $('.rd-banner img').src = d.banner;
    $('[data-rd-icon]').src = d.icon;
    $('#rd-title').innerHTML = `${d.name}${d.role ? `<span class="rd-role">${d.role}</span>` : ''}`;
    $('[data-rd-map]').textContent = d.map;
    $('[data-rd-desc]').textContent = d.desc;
    $('[data-rd-desc]').hidden = !d.desc;
    $('[data-rd-tags]').innerHTML = d.info.tags.map(t => `<span>${t}</span>`).join('');
    $('[data-rd-status]').innerHTML = d.status.map(s => `<span class="${/full/i.test(s) ? 'is-full' : /new|asking/.test(s) ? 'is-alert' : ''}">${s}</span>`).join('');
    const ev = d.info.event;
    $('.rd-event').hidden = !ev;
    if (ev) { $('[data-rd-event-name]').textContent = ev[0]; $('[data-rd-event-time]').textContent = ev[1]; }
    const added = extraPins(d.chat);
    const last = added.at(-1);
    const pin = last ? [[last[0], '#7758c4', last[2]], (d.info.pinned?.[1] || 0) + added.length] : d.info.pinned;
    $('.rd-pinned').hidden = !pin;
    if (pin) {
      const [[from, color, text], count] = pin;
      $('[data-rd-pinned-count]').textContent = count;
      $('[data-rd-pinned-avatar]').textContent = from[0];
      $('[data-rd-pinned-avatar]').style.setProperty('--avatar', color);
      $('[data-rd-pinned-from]').textContent = from;
      $('[data-rd-pinned-text]').textContent = text;
      $('[data-rd-pinned-link]').href = `${d.chat}#pinned-messages`;
      $('[data-rd-pinned-link]').setAttribute('aria-label', `Pinned message from ${from}: ${text} Open chat`);
    }
    $('[data-rd-stack]').innerHTML = stack(d.count, d.avatars);
    const [now, max] = d.count.split('/');
    $('[data-rd-count]').innerHTML = `<b>${now}</b> of ${max} inside${d.full ? '<span class="room-card-full">Full</span>' : ''}`;
    $('[data-rd-walk]').href = d.walk || '#';
    $('[data-rd-walk-label]').textContent = d.full ? 'Full · notify me' : 'Walk in';
    $('[data-rd-walk]').classList.toggle('is-full', d.full);
    $('[data-rd-chat]').href = d.chat;
    $('[data-rd-chat]').hidden = card === chatTrigger;
    $('[data-rd-settings]').hidden = !d.settings;
    $('[data-rd-walk]').hidden = !d.walk;
    $('[data-rd-toast]').textContent = '';
  };

  // ---------- Toasts ----------
  const toast = text => {
    const t = dlg.open ? $('[data-rd-toast]') : pageToast;
    t.textContent = text;
    t.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.textContent = ''; t.classList.remove('is-visible'); }, 2400);
  };

  // ---------- Menu ----------
  let ctx = null; // { card, anchor }
  const phone = () => matchMedia('(max-width: 639px)').matches;
  const place = (el, x, y) => {
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
  };
  const positionMenu = () => {
    const anchor = ctx.anchor.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const below = anchor.bottom + 8 + m.height <= innerHeight - 8;
    place(menu, anchor.right - m.width, below ? anchor.bottom + 8 : anchor.top - m.height - 8);
  };
  const positionSide = () => {
    const mr = menu.getBoundingClientRect();
    const sr = side.getBoundingClientRect();
    const nr = menu.querySelector('[data-rd-notify]').getBoundingClientRect();
    const right = mr.right + 8 + sr.width <= innerWidth - 8;
    place(side, right ? mr.right + 8 : mr.left - sr.width - 8, nr.top - 8);
  };
  const syncMenu = () => {
    const s = state.get(ctx.card);
    const room = read(ctx.card);
    menu.querySelector('[data-rd-about]').hidden = dlg.open;
    menu.querySelector('[data-rd-invite]').hidden = !room.invite;
    menu.querySelector('[data-rd-settings-link]').hidden = !room.settings;
    const pinBtn = menu.querySelector('[data-rd-pin]');
    pinBtn.innerHTML = `${s.pinned ? I.unpin : I.pin}${s.pinned ? 'Unpin' : 'Pin to top'}`;
    menu.querySelector('[data-rd-read]').disabled = !s.unread;
    menu.querySelector('[data-rd-notify-value]').textContent = s.notify;
    side.querySelectorAll('[data-rd-notify-option]').forEach(o => o.setAttribute('aria-checked', String(o.textContent.trim() === s.notify)));
  };
  const closeSide = (refocus = false) => {
    if (side.hidden) return false;
    side.hidden = true;
    menu.querySelector('[data-rd-notify]').setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-replaced');
    if (side.classList.contains('is-replacing')) { side.classList.remove('is-replacing'); menu.after(side); }
    if (refocus) menu.querySelector('[data-rd-notify]').focus();
    return true;
  };
  const closeMenu = (refocus = false) => {
    if (menu.hidden) return false;
    closeSide();
    menu.hidden = true;
    ctx?.anchor.setAttribute('aria-expanded', 'false');
    if (refocus) ctx?.anchor.focus();
    return true;
  };
  const openMenu = (card, anchor) => {
    if (!menu.hidden && ctx?.anchor === anchor) { closeMenu(true); return; }
    closeMenu();
    read(card);
    ctx = { card, anchor };
    syncMenu();
    const host = dlg.open ? dlg : document.body;
    host.append(menu, side);
    menu.hidden = false;
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', 'rd-menu');
    positionMenu();
    menu.querySelector('.rd-item:not([hidden]):not([disabled])').focus({ preventScroll: true });
  };
  const openSide = () => {
    if (menu.hidden) return;
    const notify = menu.querySelector('[data-rd-notify]');
    side.hidden = false;
    notify.setAttribute('aria-expanded', 'true');
    if (phone()) {
      // Phones: the list takes the menu's place inside it, with a Back row.
      menu.append(side);
      side.classList.add('is-replacing');
      menu.classList.add('is-replaced');
    } else positionSide();
    (side.querySelector('[aria-checked="true"]') || side.querySelector('[data-rd-notify-option]')).focus();
  };

  // ---------- Opening ----------
  const openPopup = card => {
    closeMenu();
    fill(card, read(card));
    ctx = { card, anchor: $('[data-rd-more]') };
    dlg.showModal();
    ($('[data-rd-walk]').hidden ? $('[data-rd-close]') : $('[data-rd-walk]')).focus();
  };

  const syncRoomIndicators = () => {
    for (const card of cards) {
      read(card);
      const { pinned, unread } = state.get(card);
      const unreadBadge = card.querySelector('.home-chat-badge');
      if (unreadBadge) unreadBadge.hidden = !unread;
      const icons = card.querySelector('.home-room-icons');
      let icon = icons?.querySelector('[aria-label="Pinned"]');
      if (!icon && icons && pinned) {
        icon = document.createElement('span');
        icon.className = 'home-room-icon';
        icon.title = 'Pinned';
        icon.setAttribute('aria-label', 'Pinned');
        icon.innerHTML = I.pin;
        icons.prepend(icon);
      }
      if (icon) icon.hidden = !pinned;
    }
    const grid = cards[0]?.parentElement;
    if (grid?.matches('.home-featured-grid')) {
      const ordered = [...cards].sort((first, second) => Number(state.get(second).pinned) - Number(state.get(first).pinned));
      if (ordered.some((card, index) => grid.children[index] !== card)) grid.append(...ordered);
    }
    for (const row of compactRows) {
      read(row);
      const title = row.querySelector('.min-w-0.flex-1 > .font-extrabold');
      let icon = title.querySelector('[data-rd-list-pin]');
      const { pinned } = state.get(row);
      if (!icon && pinned) {
        icon = document.createElement('span');
        icon.dataset.rdListPin = '';
        icon.title = 'Pinned';
        icon.innerHTML = I.pin;
        title.prepend(icon);
      }
      if (icon) icon.hidden = !pinned;
    }
    const firstRow = compactRows[0];
    if (firstRow) {
      const ordered = [...compactRows].sort((first, second) => Number(state.get(second).pinned) - Number(state.get(first).pinned));
      if (ordered.some((row, index) => row.parentElement.querySelectorAll(':scope > [data-ui-search-item]')[index] !== row)) firstRow.parentElement.append(...ordered);
    }
    if (chatMain) {
      readChat();
      const { unread } = state.get(chatTrigger);
      const row = document.querySelector('.conversation-row.is-active');
      row?.classList.toggle('has-unread', unread);
      const badge = row?.querySelector('.unread-count');
      if (badge) badge.hidden = !unread;
    }
  };

  function updateRoomState(key, value, message) {
    state.get(ctx.card)[key] = value;
    saveState(ctx.card, read(ctx.card).chat);
    syncRoomIndicators();
    closeMenu(true);
    toast(message);
  }

  chatTrigger?.addEventListener('click', () => openMenu(chatTrigger, chatTrigger));
  chatMain?.addEventListener('click', event => {
    if (!event.target.closest('[data-chat-room-about]')) return;
    event.preventDefault();
    if (readChat().settings) { location.href = 'room-about.html'; return; }
    chatMain.querySelector('#pinned-messages:popover-open')?.hidePopover();
    openPopup(chatTrigger);
  });

  // Capture phase so the card link and prototype.js navigation don't fire first.
  document.addEventListener('click', event => {
    const card = event.target.closest(`.home-featured-room, ${listSelector}`);
    if (card) {
      const link = event.target.closest('a.absolute');
      const more = event.target.closest('[aria-label^="More for"]');
      if (more) { event.preventDefault(); event.stopPropagation(); openMenu(card, more); return; }
      if (link && link.parentElement === card && card.matches('.home-featured-room')) { event.preventDefault(); event.stopPropagation(); openPopup(card); return; }
    }
    if (!menu.hidden && !menu.contains(event.target) && !side.contains(event.target) && event.target !== ctx?.anchor && !ctx?.anchor.contains(event.target)) closeMenu();
  }, true);

  const handleMenu = async event => {
    const s = ctx && state.get(ctx.card);
    if (!s) return;
    if (event.target.closest('[data-rd-about]')) {
      if (ctx.card === chatTrigger && readChat().settings) { location.href = 'room-about.html'; return; }
      const card = ctx.card; closeMenu(); openPopup(card); return;
    }
    if (event.target.closest('[data-rd-copy]')) {
      const link = new URL(read(ctx.card).room, location.href).href;
      closeMenu(true);
      try { await navigator.clipboard.writeText(link); toast('Room link copied'); }
      catch { toast('Couldn’t copy the room link'); }
      return;
    }
    if (event.target.closest('[data-rd-pin]')) { updateRoomState('pinned', !s.pinned, s.pinned ? 'Room unpinned' : 'Room pinned'); return; }
    if (event.target.closest('[data-rd-read]')) { updateRoomState('unread', false, 'Marked as read'); return; }
    if (event.target.closest('[data-rd-notify]')) { side.hidden ? openSide() : closeSide(true); return; }
    if (event.target.closest('[data-rd-leave]')) { closeMenu(true); toast('Leave room is a UI preview here'); }
  };
  menu.addEventListener('click', handleMenu);
  side.addEventListener('click', event => {
    if (event.target.closest('[data-rd-side-back]')) { closeSide(true); return; }
    const opt = event.target.closest('[data-rd-notify-option]');
    if (!opt) return;
    state.get(ctx.card).notify = opt.textContent.trim();
    saveState(ctx.card, read(ctx.card).chat);
    syncMenu();
    closeMenu(true);
    toast(`Notifications: ${opt.textContent.trim()}`);
  });
  dlg.addEventListener('click', event => {
    if (event.target === dlg || event.target.closest('[data-rd-close]')) { closeMenu(); dlg.close(); return; }
    if (event.target.closest('[data-rd-more]')) { openMenu(ctx.card, $('[data-rd-more]')); return; }
    if (ctx?.card === chatTrigger && event.target.closest('[data-rd-pinned-link]')) {
      event.preventDefault();
      dlg.close();
      chatMain.querySelector('[data-pinned-toggle]')?.click();
      return;
    }
    if (event.target.closest('.rd-walk.is-full')) { event.preventDefault(); toast('We’ll let you know when a spot opens'); }
  });
  dlg.addEventListener('close', () => { closeMenu(); document.body.append(menu, side); });

  // Keyboard: Escape closes the side menu, then the menu, then the pop-up. Arrows move within a menu.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (!side.hidden || !menu.hidden)) {
      event.preventDefault(); event.stopPropagation();
      if (!closeSide(true)) closeMenu(true);
      return;
    }
    const list = side.contains(document.activeElement) ? side : menu.contains(document.activeElement) ? menu : null;
    if (!list) return;
    if (event.key === 'ArrowRight' && document.activeElement.matches('[data-rd-notify]')) { event.preventDefault(); openSide(); return; }
    if (event.key === 'ArrowLeft' && list === side) { event.preventDefault(); closeSide(true); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...list.querySelectorAll('button:not([disabled]), a')].filter(el => el.offsetParent !== null);
    const i = items.indexOf(document.activeElement);
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }, true);
  dlg.addEventListener('cancel', event => { if (!menu.hidden) event.preventDefault(); });
  let lastWidth = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastWidth) { lastWidth = innerWidth; closeMenu(); } });
  const scrollArea = document.querySelector('.rail-page-content, main');
  scrollArea?.addEventListener('scroll', () => {
    if (menu.hidden || dlg.open) return;
    const anchor = ctx.anchor.getBoundingClientRect();
    const visibleArea = scrollArea.getBoundingClientRect();
    if (anchor.bottom <= visibleArea.top || anchor.top >= visibleArea.bottom) { closeMenu(); return; }
    positionMenu();
    if (!side.hidden && !phone()) positionSide();
  }, { passive: true });
  syncRoomIndicators();
  if (chatTrigger && new URLSearchParams(location.search).get('menu') === 'room') openMenu(chatTrigger, chatTrigger);
})();
