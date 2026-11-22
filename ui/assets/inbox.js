// Local notification-preview state only. No requests, messages or account changes.
// Read and pinned state are shared with the rail flyout (assets/inbox-flyout.js) for this browser tab.
(() => {
  const page = document.querySelector('.inbox-page');
  if (!page) return;
  const rows = [...page.querySelectorAll('[data-notification]')];
  const tabs = [...page.querySelectorAll('[data-inbox-filter]')];
  const markAll = page.querySelector('[data-inbox-mark-all]');
  const pinnedGroup = page.querySelector('[data-pinned-group]');
  const pinnedList = pinnedGroup.querySelector('div');
  const shared = window.ConnectaInbox;
  const PIN_KEY = 'connecta-inbox-pinned';
  const read = key => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const id = row => Number(row.dataset.notification);
  const cats = row => (row.dataset.category || '').split(' ').filter(Boolean);

  // Remember where each row lives so unpinning returns it to its place.
  rows.forEach((row, order) => { row._home = row.parentElement; row._order = order; });

  const storedUnread = read('connecta-inbox-read');
  if (Array.isArray(storedUnread)) rows.forEach(row => row.dataset.unread = String(storedUnread.includes(id(row))));
  let pinned = new Set(Array.isArray(read(PIN_KEY)) ? read(PIN_KEY) : []);
  let filter = 'all';

  const PIN_SVG = '<svg class="inbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path></svg>';
  rows.forEach(row => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'notification-pin';
    pin.dataset.notificationPin = '';
    pin.innerHTML = PIN_SVG;
    row.querySelector('.notification-meta').insertBefore(pin, row.querySelector('[data-notification-read]'));
  });

  const empty = {
    all: ['Nothing here yet', 'New notifications will show up here.'],
    unread: ['You’re all caught up', 'No unread notifications. Everything is still available in All.'],
    mentions: ['No mentions', 'When someone @mentions you in a room or chat, it shows up here.'],
    events: ['No events', 'Scheduled sessions and game nights from your rooms show up here.'],
    reminders: ['No reminders', 'Focus goals and event reminders show up here.'],
    updates: ['No updates', 'News from the Connecta team shows up here.'],
    pinned: ['Nothing pinned', 'Use the pin on any notification to keep it at the top of your Inbox.'],
  };
  const matches = row => filter === 'all' ? true
    : filter === 'unread' ? row.dataset.unread === 'true'
    : filter === 'pinned' ? pinned.has(id(row))
    : cats(row).includes(filter);

  const render = (announce = false) => {
    const unreadIds = rows.filter(row => row.dataset.unread === 'true').map(id);
    shared?.save(unreadIds);
    write(PIN_KEY, [...pinned]);

    // Pinned rows move into the Pinned group; others return home in their original order.
    rows.forEach(row => {
      const target = pinned.has(id(row)) ? pinnedList : row._home;
      if (row.parentElement !== target) {
        const after = [...target.children].find(other => other._order > row._order);
        target.insertBefore(row, after || null);
      }
      const unread = row.dataset.unread === 'true';
      const isPinned = pinned.has(id(row));
      row.hidden = !matches(row);
      row.dataset.pinned = String(isPinned);
      const readBtn = row.querySelector('[data-notification-read]');
      readBtn.title = `Mark as ${unread ? 'read' : 'unread'}`;
      readBtn.setAttribute('aria-label', `Mark notification ${id(row) + 1} as ${unread ? 'read' : 'unread'}`);
      const pinBtn = row.querySelector('[data-notification-pin]');
      pinBtn.title = isPinned ? 'Unpin' : 'Pin';
      pinBtn.setAttribute('aria-label', `${isPinned ? 'Unpin' : 'Pin'} notification ${id(row) + 1}`);
      pinBtn.setAttribute('aria-pressed', String(isPinned));
    });

    const counts = { all: rows.length, unread: unreadIds.length, pinned: pinned.size };
    ['mentions', 'events', 'reminders', 'updates'].forEach(c => counts[c] = rows.filter(row => cats(row).includes(c)).length);
    tabs.forEach(tab => {
      const key = tab.dataset.inboxFilter;
      const selected = key === filter;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const badge = tab.querySelector('[data-inbox-count-for]');
      badge.textContent = counts[key];
      badge.hidden = !counts[key];
    });
    page.querySelector('#inbox-feed').setAttribute('aria-labelledby', `inbox-${filter}`);
    page.querySelector('[data-inbox-count]').textContent = unreadIds.length ? `${unreadIds.length} unread` : 'All read';
    markAll.disabled = unreadIds.length === 0;
    pinnedGroup.hidden = filter === 'pinned' ? !pinned.size : (!pinned.size || ![...pinnedList.children].some(row => !row.hidden));
    page.querySelectorAll('.notification-group:not([data-pinned-group])').forEach(group => group.hidden = ![...group.querySelectorAll('[data-notification]')].some(row => !row.hidden));
    const anyVisible = rows.some(row => !row.hidden);
    const emptyBox = page.querySelector('.inbox-empty');
    emptyBox.hidden = anyVisible;
    page.querySelector('[data-inbox-empty-title]').textContent = empty[filter][0];
    page.querySelector('[data-inbox-empty-text]').textContent = empty[filter][1];
    emptyBox.querySelector('[data-inbox-show-all]').hidden = filter === 'all';
    const nav = document.querySelector('.app-rail [data-ui-go="inbox.html"]');
    nav?.setAttribute('aria-label', unreadIds.length ? `Inbox, ${unreadIds.length} new` : 'Inbox');
    const railBadge = nav?.querySelector('.rail-badge');
    if (railBadge) { railBadge.textContent = unreadIds.length; railBadge.hidden = !unreadIds.length; railBadge.style.display = unreadIds.length ? '' : 'none'; }
    if (announce) {
      const label = tabs.find(tab => tab.dataset.inboxFilter === filter).firstChild.textContent.trim();
      page.querySelector('[data-inbox-status]').textContent = `${unreadIds.length} unread notifications. Showing ${label}.`;
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { filter = tab.dataset.inboxFilter; render(true); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1)
        : tabs[(index + (event.key === 'ArrowLeft' ? tabs.length - 1 : 1)) % tabs.length];
      target.click(); target.focus(); target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });
  markAll.addEventListener('click', () => { rows.forEach(row => row.dataset.unread = 'false'); render(true); });

  // What's new pop-up for platform updates.
  const dialog = document.getElementById('whats-new');
  const openWhatsNew = row => {
    if (row) row.dataset.unread = 'false';
    render();
    if (dialog && !dialog.open) { dialog.showModal(); dialog.querySelector('.whats-new-body').scrollTop = 0; }
  };
  dialog?.addEventListener('click', event => {
    if (event.target.closest('[data-whats-new-close]') || event.target === dialog) dialog.close();
  });

  page.addEventListener('click', event => {
    const whatsNew = event.target.closest('[data-whats-new]');
    if (whatsNew) { event.preventDefault(); openWhatsNew(whatsNew.closest('[data-notification]')); return; }
    const toggle = event.target.closest('[data-notification-read]');
    if (toggle) { const row = toggle.closest('[data-notification]'); row.dataset.unread = String(row.dataset.unread !== 'true'); render(true); }
    const pin = event.target.closest('[data-notification-pin]');
    if (pin) { const n = id(pin.closest('[data-notification]')); pinned.has(n) ? pinned.delete(n) : pinned.add(n); render(true); pin.focus(); }
    if (event.target.closest('[data-inbox-show-all]')) { filter = 'all'; render(true); tabs[0].focus(); }
  });
  render();
  if (location.hash === '#whats-new') openWhatsNew(page.querySelector('[data-whats-new]')?.closest('[data-notification]'));
})();
