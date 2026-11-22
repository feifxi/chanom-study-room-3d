// Inbox flyout beside the left rail. Local UI preview only: no requests or account changes.
// Read state is shared with inbox.html through sessionStorage for this browser tab.
(() => {
  const KEY = 'connecta-inbox-read';
  const svg = (paths, cls = 'inbox-icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const letter = (ch, color) => `<span class="flyout-avatar" style="background:${color};color:#fff;font-weight:900;font-size:16px">${ch}</span>`;
  const icon = (cls, paths) => `<span class="flyout-avatar ${cls}">${svg(paths)}</span>`;
  // The five latest of the thirteen mock notifications on inbox.html, newest first.
  const items = [
    { id: 9, href: 'inbox.html#whats-new', avatar: icon('bg-lavender text-lavender-ink', '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>'), text: '<b>What’s new in v0.9.2:</b> Inbox categories, room controls and a Free vs Plus comparison.', type: 'Update', time: '1m ago' },
    { id: 0, href: 'messages-mai.html', avatar: letter('M', 'rgb(119, 88, 196)'), text: '<b>Mai</b> gifted you 1 month of Plus', type: 'Gift', time: '2m ago' },
    { id: 1, href: 'room-chanom.html', avatar: letter('J', 'rgb(167, 82, 48)'), text: '<b>Jod</b> mentioned you in Chanom Friends: “@feifei library at 8?”', type: 'Mention', time: '5m ago' },
    { id: 11, href: 'focus.html', avatar: icon('bg-mint text-mint-ink', '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6m20 0-3-3"/>'), text: '<b>Focus reminder:</b> you planned 2 hours of Calculus today, 1h 15m to go', type: 'Reminder', time: '15m ago' },
    { id: 2, href: 'friends.html', avatar: letter('B', 'rgb(170, 53, 106)'), text: '<b>Bow</b> sent you a friend request', type: 'Friend request', time: '20m ago' },
  ];
  const initiallyUnread = [9, 0, 1, 11, 2, 3]; // matches data-unread on inbox.html

  const load = () => { try { const v = JSON.parse(sessionStorage.getItem(KEY)); return Array.isArray(v) ? v : null; } catch { return null; } };
  const save = unread => { try { sessionStorage.setItem(KEY, JSON.stringify(unread)); } catch {} };
  const getUnread = () => load() ?? initiallyUnread.slice();
  window.ConnectaInbox = { load: getUnread, save };

  const nav = document.querySelector('.app-rail [data-ui-go="inbox.html"]');
  const updateBadge = () => {
    if (!nav) return;
    const count = getUnread().length;
    nav.setAttribute('aria-label', count ? `Inbox, ${count} new` : 'Inbox');
    const badge = nav.querySelector('.rail-badge');
    if (badge) { badge.textContent = count; badge.hidden = !count; badge.style.display = count ? '' : 'none'; }
  };
  updateBadge();
  // The full page keeps its own behavior; pressing Inbox there stays on the page.
  if (!nav) return;
  if (document.querySelector('.inbox-page')) {
    document.addEventListener('click', event => {
      if (event.target.closest('.app-rail [data-ui-go="inbox.html"]')) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    return;
  }

  const panel = document.createElement('section');
  panel.className = 'inbox-flyout';
  panel.id = 'inbox-flyout';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'inbox-flyout-title');
  panel.innerHTML = `
    <header class="flyout-header">
      <h2 id="inbox-flyout-title">Notifications</h2>
      <button type="button" class="flyout-mark-all" data-flyout-mark-all title="Mark all as read">${svg('<path d="m5 12 4 4L19 6"/>')}<span>Mark all read</span></button>
    </header>
    <div class="flyout-tabs" role="tablist" aria-label="Notification filter">
      <button type="button" role="tab" data-flyout-filter="all" aria-selected="true">All</button>
      <button type="button" role="tab" data-flyout-filter="unread" aria-selected="false">Unread <span data-flyout-unread></span></button>
    </div>
    <p class="flyout-section">Latest</p>
    <ul class="flyout-list" data-flyout-list></ul>
    <p class="flyout-empty" data-flyout-empty hidden>You’re all caught up.</p>
    <a class="flyout-see-all" href="inbox.html">See all notifications</a>`;
  document.body.append(panel);
  nav.setAttribute('aria-haspopup', 'dialog');
  nav.setAttribute('aria-controls', panel.id);
  nav.setAttribute('aria-expanded', 'false');

  let filter = 'all';
  const tabs = [...panel.querySelectorAll('[data-flyout-filter]')];
  const render = () => {
    const unread = getUnread();
    const list = panel.querySelector('[data-flyout-list]');
    const shown = items.filter(item => filter === 'all' || unread.includes(item.id));
    list.innerHTML = shown.map(item => {
      const isUnread = unread.includes(item.id);
      return `<li class="flyout-row" data-unread="${isUnread}">
        <a href="${item.href}" data-flyout-open="${item.id}">${item.avatar}
          <span class="flyout-copy"><span class="flyout-message">${item.text}</span><span class="flyout-context">${item.type} · ${item.time}</span></span></a>
        <button type="button" class="flyout-read" data-flyout-read="${item.id}" title="Mark as ${isUnread ? 'read' : 'unread'}" aria-label="Mark as ${isUnread ? 'read' : 'unread'}"><span class="flyout-dot"></span>${svg('<path d="m5 12 4 4L19 6"/>', 'inbox-icon flyout-check')}</button>
      </li>`;
    }).join('');
    panel.querySelector('[data-flyout-empty]').hidden = shown.length > 0;
    panel.querySelector('[data-flyout-unread]').textContent = unread.length || '';
    panel.querySelector('[data-flyout-mark-all]').disabled = unread.length === 0;
    tabs.forEach(tab => { const on = tab.dataset.flyoutFilter === filter; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; });
    updateBadge();
  };

  const place = () => {
    const rail = document.querySelector('.app-rail').getBoundingClientRect();
    const btn = nav.getBoundingClientRect();
    const left = Math.round(rail.right + 8);
    panel.style.left = left + 'px';
    panel.style.width = Math.min(380, innerWidth - left - 10) + 'px';
    const height = panel.offsetHeight;
    panel.style.top = Math.max(10, Math.min(btn.top - 60, innerHeight - height - 10)) + 'px';
  };
  const open = () => { render(); panel.hidden = false; place(); nav.setAttribute('aria-expanded', 'true'); nav.classList.add('is-flyout-open'); panel.querySelector('[aria-selected="true"]').focus({ preventScroll: true }); };
  const close = (refocus = false) => { if (panel.hidden) return; panel.hidden = true; nav.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-flyout-open'); if (refocus) nav.focus(); };

  // Capture phase so prototype.js does not navigate to inbox.html.
  document.addEventListener('click', event => {
    if (event.target.closest('.app-rail [data-ui-go="inbox.html"]')) {
      event.preventDefault(); event.stopPropagation();
      panel.hidden ? open() : close();
      return;
    }
    if (!panel.hidden && !panel.contains(event.target)) close();
  }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(true); });
  addEventListener('resize', () => { if (!panel.hidden) place(); });

  panel.addEventListener('click', event => {
    const tab = event.target.closest('[data-flyout-filter]');
    if (tab) { filter = tab.dataset.flyoutFilter; render(); place(); return; }
    if (event.target.closest('[data-flyout-mark-all]')) { save([]); render(); return; }
    const toggle = event.target.closest('[data-flyout-read]');
    if (toggle) {
      const id = Number(toggle.dataset.flyoutRead);
      const unread = getUnread();
      save(unread.includes(id) ? unread.filter(n => n !== id) : [...unread, id].sort());
      render(); place(); return;
    }
    const link = event.target.closest('[data-flyout-open]');
    if (link) save(getUnread().filter(n => n !== Number(link.dataset.flyoutOpen))); // opening marks it read
  });
  panel.addEventListener('keydown', event => {
    const i = tabs.indexOf(event.target);
    if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const next = tabs[(i + 1) % tabs.length]; next.click(); next.focus();
  });
})();
