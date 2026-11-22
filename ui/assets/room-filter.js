// Discover "Open rooms" Filters pop-up: multi-select categories + one language. Filters cards locally.
(() => {
  const root = document.querySelector('[data-room-filter]');
  if (!root) return;
  const button = root.querySelector('.room-filter-button');
  const pop = root.querySelector('.room-filter-pop');
  const section = root.closest('section') || document;
  const cards = [...section.querySelectorAll('.room-card[data-room-tags]')];
  const tagButtons = [...pop.querySelectorAll('[data-room-tag]')];
  const langButtons = [...pop.querySelectorAll('[data-room-lang-option]')];
  const empty = section.querySelector('[data-room-filter-empty]');
  const label = b => b.textContent.trim();
  const state = () => ({
    tags: tagButtons.filter(b => b.getAttribute('aria-pressed') === 'true'),
    lang: langButtons.find(b => b.getAttribute('aria-checked') === 'true'),
  });
  const matches = (card, { tags, lang }) => {
    const cardTags = card.dataset.roomTags.split(' ');
    const tagOk = !tags.length || tags.some(b => cardTags.includes(b.dataset.roomTag));
    const langOk = !lang || !lang.dataset.roomLangOption || card.dataset.roomLang === lang.dataset.roomLangOption;
    return tagOk && langOk;
  };
  const render = () => {
    const s = state();
    let shown = 0;
    cards.forEach(card => { card.hidden = !matches(card, s); if (!card.hidden) shown++; });
    const active = [...s.tags, ...(s.lang && s.lang.dataset.roomLangOption ? [s.lang] : [])];
    const badge = root.querySelector('[data-room-filter-badge]');
    badge.textContent = active.length; badge.hidden = !active.length;
    root.querySelector('[data-room-filter-pills]').innerHTML = active.map((b, i) =>
      `<button type="button" class="room-filter-pill" data-room-filter-remove="${i}" aria-label="Remove ${label(b)} filter">${label(b)}<span aria-hidden="true">×</span></button>`).join('');
    root._active = active;
    root.querySelector('[data-room-filter-count]').textContent = `${shown} of ${cards.length} rooms`;
    pop.querySelector('[data-room-filter-apply-count]').textContent = shown;
    if (empty) empty.hidden = shown > 0;
  };
  const open = () => { pop.hidden = false; button.setAttribute('aria-expanded', 'true'); (tagButtons[0] || pop).focus(); };
  const close = (refocus = true) => { if (pop.hidden) return; pop.hidden = true; button.setAttribute('aria-expanded', 'false'); if (refocus) button.focus(); };
  const clear = () => { tagButtons.forEach(b => b.setAttribute('aria-pressed', 'false')); langButtons.forEach((b, i) => b.setAttribute('aria-checked', String(i === 0))); render(); };

  button.addEventListener('click', () => (pop.hidden ? open() : close()));
  pop.addEventListener('click', event => {
    const tag = event.target.closest('[data-room-tag]');
    if (tag) { tag.setAttribute('aria-pressed', String(tag.getAttribute('aria-pressed') !== 'true')); render(); return; }
    const lang = event.target.closest('[data-room-lang-option]');
    if (lang) { langButtons.forEach(b => b.setAttribute('aria-checked', String(b === lang))); render(); return; }
    if (event.target.closest('[data-room-filter-clear]')) { clear(); return; }
    if (event.target.closest('[data-room-filter-close]')) close();
  });
  root.addEventListener('click', event => {
    const pill = event.target.closest('[data-room-filter-remove]');
    if (!pill) return;
    const b = root._active[Number(pill.dataset.roomFilterRemove)];
    if (b.hasAttribute('data-room-tag')) b.setAttribute('aria-pressed', 'false');
    else langButtons.forEach((x, i) => x.setAttribute('aria-checked', String(i === 0)));
    render();
  });
  empty?.addEventListener('click', event => { if (event.target.closest('[data-room-filter-clear]')) clear(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('click', event => { if (!pop.hidden && !root.contains(event.target)) close(false); });
  render();
})();
