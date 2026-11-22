// Edit profile preview. The character capture stays fixed while the selected items update alongside it.
(() => {
  const tray = document.querySelector('[data-character-selection]');
  if (!tray) return;
  const choices = [...document.querySelectorAll('[data-account-choice]')];
  const status = document.querySelector('[data-character-status]');
  const key = 'connecta-character-look';
  const label = button => button.getAttribute('aria-label') || button.textContent.trim();
  const id = button => `${button.dataset.accountChoice}:${label(button)}`;
  const isSelected = button => button.getAttribute('aria-pressed') === 'true';
  const current = () => choices.filter(isSelected).map(id);
  let saved = current();
  try {
    const stored = JSON.parse(sessionStorage.getItem(key));
    if (Array.isArray(stored)) saved = stored;
  } catch {}

  function renderPreview() {
    tray.replaceChildren();
    for (const option of choices.filter(isSelected)) {
      const art = option.querySelector('.account-look-art');
      if (!art && !option.matches('.account-swatch')) continue;
      const tile = art?.cloneNode() || document.createElement('span');
      tile.classList.add('account-look-sample');
      if (!art) tile.style.background = option.style.background;
      tile.setAttribute('role', 'img');
      tile.removeAttribute('aria-hidden');
      tile.setAttribute('aria-label', label(option));
      tray.append(tile);
    }
  }

  function restore() {
    for (const button of choices) button.setAttribute('aria-pressed', String(saved.includes(id(button))));
    renderPreview();
  }

  function select(button) {
    const group = button.closest('[role="group"]');
    if (button.dataset.accountChoice === 'Owned') button.setAttribute('aria-pressed', String(!isSelected(button)));
    else group.querySelectorAll('[data-account-choice]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  }

  for (const choice of choices) choice.addEventListener('click', () => {
    select(choice);
    status.textContent = '';
    renderPreview();
  });
  document.querySelector('[data-character-shuffle]').addEventListener('click', () => {
    for (const group of ['Hair', 'Outfit', 'Accessory']) {
      const options = choices.filter(button => button.dataset.accountChoice === group && !isSelected(button));
      select(options[Math.floor(Math.random() * options.length)]);
    }
    status.textContent = 'Look shuffled.';
    renderPreview();
  });
  document.querySelector('[data-character-reset]').addEventListener('click', () => {
    restore();
    status.textContent = 'Restored your saved look.';
  });
  document.querySelector('[data-character-save]').addEventListener('click', event => {
    event.stopPropagation();
    saved = current();
    try { sessionStorage.setItem(key, JSON.stringify(saved)); status.textContent = 'Look saved for this tab.'; }
    catch { status.textContent = 'Look saved for this preview.'; }
  });
  restore();
})();
