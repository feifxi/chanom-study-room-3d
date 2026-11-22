// UI-only behavior. No framework, 3D engine, media, chat, auth or payment calls.
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const save = (key, value) => { try { localStorage.setItem('studyroom-ui:' + key, value); } catch {} };
  function updateThemeOptions() {
    const current = document.documentElement.dataset.theme;
    $$('[data-ui-theme]').forEach(option => {
      const selected = option.dataset.uiTheme === current;
      option.setAttribute('aria-pressed', String(selected));
      if (option.hasAttribute('data-appearance-mode')) {
        option.classList.toggle('border-primary', selected);
        option.classList.toggle('border-transparent', !selected);
      }
    });
  }
  function theme(value) {
    save('theme', value);
    const dark = value === 'dark' || value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = value;
    updateThemeOptions();
  }
  let toastTimer;
  function toast(text = 'Preview updated') {
    $('.ui-preview-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'ui-preview-toast'; el.role = 'status'; el.textContent = text;
    document.body.append(el);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 1800);
  }
  function toolbar() {
    let dialog = $('.ui-preview-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'ui-preview-dialog';
      dialog.setAttribute('aria-label', 'HTML preview controls');
      dialog.innerHTML = `<button class="ui-close" data-ui-close aria-label="Close preview controls">×</button>
        <h2>HTML playground</h2><p>Browse screens and switch between light and dark.</p>
        <h3>Theme</h3><div class="ui-row"><button data-ui-theme="light">Light</button><button data-ui-theme="dark">Dark</button><button data-ui-theme="system">System</button></div>
        <h3>Compare layouts</h3><a href="home.html">Chats + room preview</a><a href="home-chat.html">Chat only</a><a href="home-old.html">Original Home</a>
        <h3>Pages</h3><a href="catalogue.html">All screens</a><a href="index.html">Landing</a><a href="home-dashboard.html">Home</a><a href="home.html">Chats</a><a href="discover.html">Discover</a><a href="walk-library.html">Library room</a><a href="walk-cafe.html">Café room</a><a href="walk-rooftop.html">Rooftop room</a><a href="settings-profile.html">Character & settings</a><a href="room-settings-overview.html">Room settings</a><a href="admin.html">Admin</a><a href="discover-guest.html">Guest view</a>`;
      document.body.append(dialog);
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    }
    updateThemeOptions();
    dialog.showModal();
  }
  function anchorPopovers() {
    $$('[data-ui-popover]').forEach(wrapper => {
      const content = wrapper.firstElementChild;
      if (!content) return;
      const anchor = document.documentElement.dataset.uiPage === 'inbox' ? $('[data-workspace-action="inbox"]') || $('button[aria-label^="Inbox,"]')
        : document.documentElement.dataset.uiPage === 'profile-menu' ? $('button[aria-label="You"]')
        : document.documentElement.dataset.uiPage === 'room-menu' ? $('button[aria-label^="More for"]')
        : document.documentElement.dataset.uiPage === 'walk-tools' ? $('button[aria-label="Room tools"]') : null;
      const box = anchor?.getBoundingClientRect();
      if (anchor?.hasAttribute('data-workspace-action') && box) {
        const boundary = ($('.app-rail')?.getBoundingClientRect().right || 0) + 12;
        const width = Math.min(340, innerWidth - boundary - 12);
        wrapper.style.position = 'fixed'; wrapper.style.transform = 'none';
        wrapper.style.left = Math.max(boundary, Math.min(box.right - width, innerWidth - width - 12)) + 'px';
        wrapper.style.top = box.bottom + 8 + 'px'; wrapper.style.bottom = 'auto';
        wrapper.style.width = width + 'px'; wrapper.style.minWidth = '0';
        content.style.width = width + 'px'; content.style.minWidth = '0';
        content.style.maxWidth = width + 'px';
        content.style.maxHeight = Math.max(100, Math.min(560, innerHeight - box.bottom - 20)) + 'px';
        content.style.overflowY = 'auto';
        return;
      }
      const rail = anchor?.closest('.app-rail');
      if (rail && box) {
        // Left-rail menus start after the rail; right-aligning them to the
        // small trigger otherwise places their whole surface over navigation.
        const railBox = rail.getBoundingClientRect();
        const left = railBox.right + 10;
        const preferred = Number(wrapper.dataset.uiPreferredWidth) || content.offsetWidth || 320;
        wrapper.dataset.uiPreferredWidth = String(preferred);
        const width = Math.min(preferred, Math.max(0, innerWidth - left - 12));
        wrapper.style.transform = 'none'; wrapper.style.position = 'fixed';
        wrapper.style.left = left + 'px'; wrapper.style.width = width + 'px';
        wrapper.style.minWidth = '0'; wrapper.style.maxWidth = width + 'px';
        content.style.width = width + 'px'; content.style.minWidth = '0';
        content.style.maxWidth = width + 'px';
        content.style.maxHeight = Math.min(560, innerHeight - 24) + 'px';
        content.style.overflowY = 'auto';
        const height = content.offsetHeight;
        if (document.documentElement.dataset.uiPage === 'inbox') {
          // Inbox belongs to the bottom-left corner beside the navigation rail.
          wrapper.style.top = 'auto'; wrapper.style.bottom = '12px';
        } else {
          wrapper.style.bottom = 'auto';
          wrapper.style.top = Math.max(12, Math.min(box.bottom - height, innerHeight - height - 12)) + 'px';
        }
        wrapper.classList.add('rail-side-popover');
        return;
      }
      const width = Math.min(content.getBoundingClientRect().width || 320, innerWidth - 24);
      wrapper.style.transform = 'none'; wrapper.style.position = 'fixed';
      wrapper.style.left = Math.max(12, Math.min((box?.right || innerWidth - 12) - width, innerWidth - width - 12)) + 'px';
      wrapper.style.top = Math.max(12, Math.min(box?.bottom || 70, innerHeight - content.getBoundingClientRect().height - 12)) + 'px';
      wrapper.style.maxWidth = 'calc(100vw - 24px)';
      content.style.maxWidth = 'calc(100vw - 24px)';
      content.style.maxHeight = 'calc(100dvh - 32px)'; content.style.overflowY = 'auto';
    });
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button,a,[role="menuitem"],[role="tab"],[data-ui-go],[data-ui-close]');
    if (!target || target.disabled) return;
    if (target.hasAttribute('data-ui-toolbar')) { event.preventDefault(); toolbar(); return; }
    if (target.hasAttribute('data-ui-close')) { target.closest('dialog')?.close(); return; }
    if (target.dataset.uiTheme) { event.preventDefault(); theme(target.dataset.uiTheme); return; }
    if (target.dataset.uiGo) { event.preventDefault(); location.href = target.dataset.uiGo; return; }
    if (target.getAttribute('role') === 'switch' || target.getAttribute('role') === 'checkbox') {
      const checked = target.getAttribute('aria-checked') !== 'true';
      target.setAttribute('aria-checked', String(checked)); target.dataset.state = checked ? 'checked' : 'unchecked';
      $$('[data-state]', target).forEach(e => e.dataset.state = target.dataset.state);
      return;
    }
    if (target.hasAttribute('data-ui-hide-chat')) {
      const panel = $('[data-ui-chat-panel]') || $('[aria-label="Room chat"]') || $('[aria-label="Bubbles"]');
      if (panel) panel.hidden = !panel.hidden;
      return;
    }
    if (target.dataset.uiZoom) {
      const scene = $('.ui-desktop .captured-scene') || $('.captured-scene');
      if (scene) {
        const zoom = Math.max(1, Math.min(1.5, +(scene.dataset.zoom || 1) + +target.dataset.uiZoom * .1));
        scene.dataset.zoom = zoom; scene.style.transform = `scale(${zoom})`;
      }
      return;
    }
    if (target.tagName === 'BUTTON' && /^(Save|Apply|Copy|Accept|Ignore|Buy|Claim|Send request)/.test(target.textContent.trim())) {
      event.preventDefault(); toast(); return;
    }
    if (target.tagName === 'BUTTON' && /Mic|Deafen|Sound|Photo|Music|Share screen|Start|Go there|Pay|Subscribe/.test((target.getAttribute('aria-label') || '') + target.textContent)) {
      event.preventDefault(); toast('UI preview');
    }
  });
  document.addEventListener('submit', event => {
    event.preventDefault();
    const submit = $('button[type="submit"][data-ui-go]', event.target);
    if (submit) location.href = submit.dataset.uiGo;
    else toast();
  });
  document.addEventListener('input', event => {
    if (event.target.hasAttribute('data-ui-search')) {
      const q = event.target.value.toLowerCase().trim();
      $$('[data-ui-search-item]').forEach(e => e.hidden = !e.dataset.uiSearchItem.includes(q));
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('.ui-preview-dialog[open]') && document.body.dataset.uiBack) location.href = document.body.dataset.uiBack;
  });
  updateThemeOptions();
  addEventListener('resize', anchorPopovers);
  anchorPopovers();
})();
