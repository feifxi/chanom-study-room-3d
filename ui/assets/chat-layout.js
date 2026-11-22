// Browser-only chat navigation, messages and panel previews.
(() => {
  const shell = document.querySelector('[data-chat-layout]');
  if (!shell) return;
  const main = shell.querySelector('.chat-main');
  const membersButton = main.querySelector('[data-chat-members]');
  const search = shell.querySelector('[data-chat-search]');
  const typeTrigger = shell.querySelector('[data-chat-type-trigger]');
  const typeMenu = shell.querySelector('#chat-type-menu');
  const chatRows = [...shell.querySelectorAll('[data-chat-row]')];
  let chatType = typeTrigger ? shell.dataset.chatType || 'group' : null;
  const typeKey = 'studyroom-ui:chat-type';
  const recall = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const remember = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const selectedRow = chatRows.find(row => row.classList.contains('is-active'));
  const lastChatKey = kind => `studyroom-ui:last-${kind}-chat`;
  const isListOnPhone = () => innerWidth < 768 && shell.dataset.mobileView === 'list';
  function filterChats() {
    const value = search.value.toLocaleLowerCase().trim();
    chatRows.forEach(row => row.hidden = (chatType && row.dataset.chatKind !== chatType) || !row.dataset.chatName.includes(value));
    const empty = shell.querySelector('.chat-search-empty');
    empty.hidden = chatRows.some(row => !row.hidden);
    empty.textContent = chatType === 'group' ? 'No groups found. Try another name.' : chatType === 'private' ? 'No private chats found. Try another name.' : 'No chats found. Try another name.';
  }
  function applyChatType(kind) {
    chatType = kind; shell.dataset.chatType = kind;
    shell.querySelector('[data-chat-type-label]').textContent = kind === 'group' ? 'GroupChat' : 'PrivateChat';
    typeMenu.querySelectorAll('[data-chat-type-option]').forEach(option => option.setAttribute('aria-checked', String(option.dataset.chatTypeOption === kind)));
    shell.querySelectorAll('[data-chat-action-kind]').forEach(action => action.hidden = action.dataset.chatActionKind !== kind);
    search.placeholder = kind === 'group' ? 'Search groups' : 'Search people';
    remember(typeKey, kind);
    filterChats();
  }
  function positionTypeMenu() {
    const anchor = typeTrigger.getBoundingClientRect();
    typeMenu.style.left = Math.max(12, Math.min(anchor.left, innerWidth - typeMenu.offsetWidth - 12)) + 'px';
    typeMenu.style.top = Math.min(anchor.bottom + 8, innerHeight - typeMenu.offsetHeight - 12) + 'px';
  }
  function openTypeMenu(last = false) {
    typeMenu.showPopover(); positionTypeMenu();
    const options = [...typeMenu.querySelectorAll('[data-chat-type-option]')];
    (last ? options.at(-1) : options.find(o => o.getAttribute('aria-checked') === 'true') || options[0]).focus();
  }
  if (typeTrigger) {
    const pageId = document.documentElement.dataset.uiPage;
    const isEntry = ['home', 'messages', 'home-active', 'home-you-run'].includes(pageId);
    const savedType = recall(typeKey);
    if (isEntry && ['group', 'private'].includes(savedType)) chatType = savedType;
    if (selectedRow) remember(lastChatKey(selectedRow.dataset.chatKind), selectedRow.getAttribute('href'));
    applyChatType(chatType);
    // On a phone, changing the list does not unexpectedly open a thread.
    // On desktop keep the visible conversation consistent with the chosen type.
    if (isEntry && !isListOnPhone() && selectedRow?.dataset.chatKind !== chatType) {
      const sameKind = chatRows.filter(row => row.dataset.chatKind === chatType);
      const saved = recall(lastChatKey(chatType));
      const next = sameKind.find(row => row.getAttribute('href') === saved) || sameKind[0];
      if (next) location.replace(next.getAttribute('href'));
    }
    typeTrigger.addEventListener('click', () => typeMenu.matches(':popover-open') ? typeMenu.hidePopover() : openTypeMenu());
    typeTrigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openTypeMenu(event.key === 'ArrowUp'); }
    });
    typeMenu.addEventListener('toggle', () => typeTrigger.setAttribute('aria-expanded', String(typeMenu.matches(':popover-open'))));
    typeMenu.addEventListener('keydown', event => {
      const options = [...typeMenu.querySelectorAll('[data-chat-type-option]')];
      const index = options.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options[next].focus();
      }
      if (event.key === 'Escape' || event.key === 'Tab') { typeMenu.hidePopover(); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); typeTrigger.focus(); } }
    });
    typeMenu.addEventListener('click', event => {
      const option = event.target.closest('[data-chat-type-option]');
      if (!option) return;
      const kind = option.dataset.chatTypeOption;
      applyChatType(kind); typeMenu.hidePopover(); typeTrigger.focus();
      if (!isListOnPhone() && selectedRow?.dataset.chatKind !== kind) {
        const matching = chatRows.filter(row => row.dataset.chatKind === kind);
        const saved = recall(lastChatKey(kind));
        const next = matching.find(row => row.getAttribute('href') === saved) || matching[0];
        if (next) location.href = next.getAttribute('href');
      }
    });
    addEventListener('resize', () => { if (typeMenu.matches(':popover-open')) positionTypeMenu(); });
  }
  const timeline = shell.querySelector('[data-chat-timeline]');
  const scrollToLatest = () => { timeline.scrollTo({ top: timeline.scrollHeight, behavior: 'instant' }); };
  scrollToLatest();
  document.fonts.ready.then(scrollToLatest);
  timeline.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', scrollToLatest, { once: true });
  });
  const roomPreview = shell.querySelector('.room-peek');
  const previewToggle = roomPreview?.querySelector('[data-room-preview-toggle]');
  if (previewToggle) {
    const previewKey = 'studyroom-ui:room-preview-collapsed';
    function foldPreview(collapsed) {
      roomPreview.dataset.collapsed = String(collapsed);
      previewToggle.setAttribute('aria-expanded', String(!collapsed));
      const action = collapsed ? 'Expand room preview' : 'Collapse room preview';
      previewToggle.setAttribute('aria-label', action); previewToggle.title = action;
      previewToggle.querySelector('[data-room-preview-toggle-label]').textContent = collapsed ? 'Show preview' : 'Hide preview';
    }
    foldPreview(recall(previewKey) === '1');
    previewToggle.addEventListener('click', () => {
      const wasAtBottom = timeline.scrollTop + timeline.clientHeight >= timeline.scrollHeight - 3;
      const collapsed = roomPreview.dataset.collapsed !== 'true';
      foldPreview(collapsed); remember(previewKey, collapsed ? '1' : '0');
      if (wasAtBottom) scrollToLatest();
    });
  }

  const composer = main.querySelector('.chat-composer');
  const input = composer?.querySelector('input');
  if (input) {
    const read = (key, fallback) => {
      try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    };
    const write = (key, value) => {
      try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
    };
    const page = document.documentElement.dataset.uiPage + '.html';
    const thread = main.querySelector('[data-room-chat-menu]')?.dataset.roomChatMenu
      || selectedRow?.getAttribute('href') || page;
    const stateKey = id => 'connecta-thread:' + id;
    const storedState = id => read(stateKey(id), {});
    const state = storedState(thread);
    state.sent ??= [];
    state.removed ??= [];
    state.reactions ??= {};
    const save = () => write(stateKey(thread), state);
    const pinKey = 'connecta-room-pins:' + thread;
    const pins = new Set(read(pinKey, []));
    const entries = new Map();

    const paths = {
      reaction: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M9 9h.01M15 9h.01"/>',
      reply: '<path d="m10 7-5 5 5 5M5 12h9a5 5 0 0 1 5 5v2"/>',
      more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      pin: '<path d="M16 9V4l1-1H7l1 1v5l-3 3v2h14v-2l-3-3M12 14v8"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
    };
    const icon = name => '<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
    const button = (label, css, symbol) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = css;
      if (symbol) {
        el.innerHTML = icon(symbol);
        el.setAttribute('aria-label', label);
        el.title = label;
      } else {
        el.textContent = label;
      }
      return el;
    };

    const announce = document.createElement('p');
    announce.className = 'sr-only';
    announce.role = 'status';
    composer.before(announce);
    const replyBar = document.createElement('div');
    replyBar.className = 'chat-reply-bar';
    replyBar.hidden = true;
    const replyText = document.createElement('span');
    const cancelReply = button('Cancel reply', 'chat-icon-button', 'close');
    replyBar.append(replyText, cancelReply);
    composer.before(replyBar);
    let replying;
    const clearReply = () => { replying = null; replyBar.hidden = true; };
    cancelReply.addEventListener('click', () => { clearReply(); input.focus(); });

    let pinnedToggle = main.querySelector('[data-pinned-toggle]');
    let pinnedPopover = main.querySelector('#pinned-messages');
    if (!pinnedToggle) {
      pinnedToggle = button('Pinned messages', 'chat-icon-button', 'pin');
      pinnedToggle.dataset.pinnedToggle = '';
      main.querySelector('.conversation-actions').append(pinnedToggle);
      pinnedPopover = document.createElement('section');
      pinnedPopover.className = 'pinned-messages-popover';
      pinnedPopover.id = 'pinned-messages';
      pinnedPopover.popover = 'auto';
      pinnedPopover.setAttribute('role', 'dialog');
      pinnedPopover.setAttribute('aria-labelledby', 'pinned-messages-title');
      const header = document.createElement('header');
      const title = document.createElement('h2');
      title.id = 'pinned-messages-title';
      title.textContent = 'Pinned messages';
      const close = button('Close pinned messages', 'chat-icon-button', 'close');
      close.dataset.pinnedClose = '';
      header.append(title, close);
      pinnedPopover.append(header);
      main.append(pinnedPopover);
    }
    pinnedToggle.setAttribute('aria-controls', pinnedPopover.id);
    pinnedToggle.setAttribute('aria-expanded', 'false');
    pinnedToggle.setAttribute('aria-label', 'Pinned messages');
    const pinList = document.createElement('div');
    pinList.className = 'pinned-message-list';
    const emptyPins = pinnedPopover.querySelector('.pinned-messages-empty') || document.createElement('p');
    emptyPins.className = 'pinned-messages-empty';
    emptyPins.textContent = 'No pinned messages yet.';
    pinnedPopover.append(pinList, emptyPins);
    const defaultPin = pinnedPopover.querySelector('a.pinned-message-item');

    function position(panel, anchor, above = false) {
      const rect = anchor.getBoundingClientRect();
      panel.style.left = Math.max(10, Math.min(rect.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 10)) + 'px';
      const top = above && rect.top > panel.offsetHeight + 10 ? rect.top - panel.offsetHeight - 6 : rect.bottom + 6;
      panel.style.top = Math.max(10, Math.min(top, innerHeight - panel.offsetHeight - 10)) + 'px';
    }
    const closePins = () => {
      pinnedPopover.hidePopover();
      pinnedToggle.focus();
    };
    pinnedToggle.addEventListener('click', () => {
      if (pinnedPopover.matches(':popover-open')) closePins();
      else { pinnedPopover.showPopover(); position(pinnedPopover, pinnedToggle); }
    });
    pinnedPopover.querySelector('[data-pinned-close]').addEventListener('click', closePins);
    pinnedPopover.addEventListener('toggle', () => {
      pinnedToggle.setAttribute('aria-expanded', String(pinnedPopover.matches(':popover-open')));
    });
    function jumpTo(entry) {
      entry.message.tabIndex = -1;
      entry.message.focus({ preventScroll: true });
      entry.message.scrollIntoView({ block: 'center' });
    }
    function renderPins() {
      pinList.replaceChildren();
      for (const id of pins) {
        const entry = entries.get(id);
        if (!entry || entry.message.hidden) continue;
        const row = document.createElement('div');
        row.className = 'pinned-message-row';
        const jump = button('', 'pinned-message-item');
        const detail = document.createElement('span');
        const author = document.createElement('small');
        author.textContent = entry.author;
        const content = document.createElement('strong');
        content.textContent = entry.text;
        detail.append(author, content);
        jump.append(detail);
        jump.addEventListener('click', () => { closePins(); jumpTo(entry); });
        const unpin = button('Unpin', 'pinned-unpin');
        unpin.setAttribute('aria-label', 'Unpin message from ' + entry.author);
        unpin.addEventListener('click', () => {
          changePin(entry, false);
          pinnedPopover.querySelector('[data-pinned-close]').focus();
        });
        row.append(jump, unpin);
        pinList.append(row);
      }
      emptyPins.hidden = Boolean(defaultPin || pinList.children.length);
      if (pinnedPopover.matches(':popover-open')) position(pinnedPopover, pinnedToggle);
    }
    function changePin(entry, pinned) {
      if (pinned) pins.add(entry.id);
      else pins.delete(entry.id);
      write(pinKey, [...pins]);
      announce.textContent = pinned ? 'Message pinned.' : 'Message unpinned.';
      renderPins();
    }

    const popup = document.createElement('div');
    popup.className = 'message-action-popover';
    popup.popover = 'auto';
    popup.setAttribute('role', 'group');
    main.append(popup);
    let popupAnchor;
    function openActions(anchor, label, children) {
      if (popup.matches(':popover-open') && popupAnchor === anchor && popup.getAttribute('aria-label') === label) {
        popup.hidePopover();
        return;
      }
      if (popupAnchor && popupAnchor !== anchor) popupAnchor.setAttribute('aria-expanded', 'false');
      popupAnchor = anchor;
      popup.setAttribute('aria-label', label);
      popup.replaceChildren(...children);
      if (!popup.matches(':popover-open')) popup.showPopover({ source: anchor });
      anchor.setAttribute('aria-expanded', 'true');
      position(popup, anchor, true);
      popup.querySelector('button')?.focus();
    }
    popup.addEventListener('toggle', () => {
      if (!popup.matches(':popover-open')) popupAnchor?.setAttribute('aria-expanded', 'false');
    });
    function dismissActions(restoreFocus = true) {
      popup.hidePopover();
      if (restoreFocus) popupAnchor?.focus();
    }
    addEventListener('resize', () => {
      if (popup.matches(':popover-open')) position(popup, popupAnchor, true);
      if (pinnedPopover.matches(':popover-open')) position(pinnedPopover, pinnedToggle);
    });
    timeline.addEventListener('scroll', () => {
      if (popup.matches(':popover-open')) dismissActions(false);
    });

    const quoteOf = entry => ({ id: entry.id, author: entry.author, text: entry.text });
    const nextMessage = (text, extra) => ({
      uid: crypto.randomUUID(),
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...extra,
    });
    const addToCurrent = record => {
      state.sent.push(record);
      save();
      renderSent(record);
      scrollToLatest();
    };
    function forward(entry, anchor) {
      const destinations = new Map();
      for (const row of chatRows) {
        const url = row.getAttribute('href');
        const name = row.querySelector('.conversation-name')?.textContent.trim();
        if (url && name && /^[-\w]+\.html$/.test(url)) destinations.set(url, name);
      }
      const choices = [...destinations].map(([destination, name]) => {
        const target = button(name, 'message-action-choice');
        target.addEventListener('click', () => {
          const record = nextMessage(entry.text, { forwarded: entry.author, images: entry.images });
          if (destination === thread) addToCurrent(record);
          else {
            const targetState = storedState(destination);
            targetState.sent ??= [];
            targetState.sent.push(record);
            write(stateKey(destination), targetState);
          }
          dismissActions();
          announce.textContent = 'Message forwarded to ' + name + '.';
        });
        return target;
      });
      const heading = document.createElement('strong');
      heading.textContent = 'Forward to';
      openActions(anchor, 'Forward to a conversation', [heading, ...choices]);
    }

    function mountMessage(message, record) {
      const bubble = message.querySelector('.message-bubble');
      if (!bubble) return;
      const author = message.querySelector('.message-author')?.textContent.trim() || 'You';
      const text = record?.text || bubble.textContent.replace(/\s+/g, ' ').trim()
        || bubble.querySelector('img')?.alt || 'Image';
      const time = message.querySelector('time')?.textContent.trim() || '';
      // Historic pins identify captured messages by their visible author, time and text.
      const id = JSON.stringify([author, record?.uid || time, text]);
      const images = [...bubble.querySelectorAll('img')].flatMap(img => {
        const src = img.getAttribute('src');
        return src?.startsWith('assets/') ? [{ src, alt: img.alt }] : [];
      });
      const entry = { id, author, text, message, images };
      entries.set(id, entry);
      if (state.removed.includes(id)) {
        message.hidden = true;
        return;
      }
      const body = document.createElement('div');
      body.className = 'message-body-line';
      bubble.before(body);
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', 'Message actions');
      const react = button('React to message', 'message-action', 'reaction');
      const reply = button('Reply to message', 'message-action', 'reply');
      const more = button('More message actions', 'message-action', 'more');
      for (const toggle of [react, more]) toggle.setAttribute('aria-expanded', 'false');
      actions.append(react, reply, more);
      body.append(bubble, actions);
      const reaction = button('', 'message-reaction');
      body.after(reaction);
      function renderReaction() {
        const current = state.reactions[id];
        reaction.textContent = current || '';
        reaction.hidden = !current;
        reaction.setAttribute('aria-label', 'Remove your reaction ' + (current || ''));
      }
      renderReaction();
      const setReaction = value => {
        if (value === state.reactions[id]) delete state.reactions[id];
        else state.reactions[id] = value;
        save();
        renderReaction();
      };
      reaction.addEventListener('click', () => {
        setReaction(state.reactions[id]);
        react.focus();
      });
      react.addEventListener('click', () => {
        const emoji = [['❤️', 'Heart'], ['👍', 'Thumbs up'], ['😂', 'Laugh'], ['😮', 'Wow'], ['😢', 'Sad'], ['🎉', 'Celebrate']];
        openActions(react, 'Pick a reaction', emoji.map(([symbol, name]) => {
          const choice = button(symbol, 'message-action-emoji');
          choice.setAttribute('aria-label', name);
          choice.setAttribute('aria-pressed', String(symbol === state.reactions[id]));
          choice.addEventListener('click', () => { setReaction(symbol); dismissActions(); });
          return choice;
        }));
      });
      reply.addEventListener('click', () => {
        replying = quoteOf(entry);
        replyText.textContent = 'Replying to ' + entry.author + ' · ' + entry.text;
        replyBar.hidden = false;
        input.focus();
      });
      more.addEventListener('click', () => {
        const pin = button(pins.has(id) ? 'Unpin message' : 'Pin message', 'message-action-choice');
        pin.addEventListener('click', () => { changePin(entry, !pins.has(id)); dismissActions(); });
        const send = button('Forward message', 'message-action-choice');
        send.addEventListener('click', () => forward(entry, more));
        const remove = button('Delete for me', 'message-action-choice is-danger');
        remove.addEventListener('click', () => {
          if (pins.has(id)) changePin(entry, false);
          state.removed.push(id);
          delete state.reactions[id];
          save();
          message.hidden = true;
          if (replying?.id === id) clearReply();
          dismissActions(false);
          input.focus();
          announce.textContent = 'Message deleted for you.';
        });
        openActions(more, 'Message options', [pin, send, remove]);
      });
    }

    function renderSent(record) {
      const message = document.createElement('article');
      message.className = 'chat-message is-mine';
      message.dataset.chatMessage = '';
      const content = document.createElement('div');
      content.className = 'message-content';
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      if (record.reply) {
        const quote = document.createElement('blockquote');
        quote.className = 'message-reply-quote';
        quote.textContent = record.reply.author + ' · ' + record.reply.text;
        bubble.append(quote);
      }
      if (record.forwarded) {
        const metadata = document.createElement('small');
        metadata.className = 'message-forwarded-from';
        metadata.textContent = 'Forwarded from ' + record.forwarded;
        bubble.append(metadata);
      }
      const body = document.createElement('p');
      body.textContent = record.text;
      bubble.append(body);
      for (const item of record.images || []) {
        if (!item.src.startsWith('assets/')) continue;
        const image = document.createElement('img');
        image.className = 'message-forwarded-image';
        image.src = item.src;
        image.alt = item.alt;
        bubble.append(image);
      }
      const time = document.createElement('time');
      time.className = 'message-time';
      time.textContent = record.time;
      content.append(bubble, time);
      message.append(content);
      timeline.append(message);
      mountMessage(message, record);
    }

    timeline.querySelectorAll('[data-chat-message]').forEach(message => mountMessage(message));
    state.sent.forEach(renderSent);
    renderPins();
    scrollToLatest();
    if (location.hash === '#pinned-messages') {
      pinnedPopover.showPopover();
      position(pinnedPopover, pinnedToggle);
    }
    composer.addEventListener('submit', event => {
      event.preventDefault();
      event.stopPropagation();
      const text = input.value.trim();
      if (!text) return;
      addToCurrent(nextMessage(text, { reply: replying }));
      input.value = '';
      clearReply();
      input.focus();
    });
  }
  function memberState() {
    const open = main.dataset.members === 'visible' || main.dataset.members === 'auto' && innerWidth >= 1200;
    membersButton.setAttribute('aria-expanded', String(open));
    membersButton.setAttribute('aria-label', open ? 'Hide members' : 'Show members');
  }
  if (membersButton) {
    memberState();
    addEventListener('resize', memberState);
  }
  search.addEventListener('input', filterChats);
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-chat-members')) {
      main.dataset.members = button.getAttribute('aria-expanded') === 'true' ? 'hidden' : 'visible';
      memberState();
    }
    if (button.hasAttribute('data-chat-members-close')) { main.dataset.members = 'hidden'; memberState(); membersButton.focus(); }
    if (button.hasAttribute('data-chat-find')) {
      const bar = main.querySelector('.chat-find'); bar.hidden = !bar.hidden;
      if (!bar.hidden) bar.querySelector('input').focus();
    }
    if (button.hasAttribute('data-chat-find-close')) {
      const bar = main.querySelector('.chat-find'); bar.hidden = true; bar.querySelector('input').value = '';
      main.querySelectorAll('.is-search-match').forEach(el => el.classList.remove('is-search-match'));
      main.querySelector('[data-chat-find]').focus();
    }
    if (button.hasAttribute('data-chat-reaction')) button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    if (button.hasAttribute('data-chat-preview')) {
      const toast = document.createElement('div'); toast.className = 'ui-preview-toast'; toast.role = 'status'; toast.textContent = 'UI preview'; document.body.append(toast); setTimeout(() => toast.remove(), 1500);
    }
  });
  main.querySelector('[data-chat-find-input]').addEventListener('input', event => {
    const query = event.target.value.toLocaleLowerCase().trim();
    let matches = 0;
    main.querySelectorAll('[data-chat-message]').forEach(message => {
      const match = !message.hidden && !!query && message.textContent.toLocaleLowerCase().includes(query);
      message.classList.toggle('is-search-match', match); matches += Number(match);
    });
    main.querySelector('[data-chat-find-status]').textContent = query ? `${matches} ${matches === 1 ? 'message' : 'messages'}` : '';
    main.querySelector('.is-search-match')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && main.dataset.members === 'visible') {
      main.dataset.members = 'hidden'; memberState(); membersButton.focus();
    }
  });
})();
