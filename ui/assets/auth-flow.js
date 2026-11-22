// The HTML playground models navigation and character choices with tab-local state.
(() => {
  const read = key => {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
  };
  const write = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const clear = key => {
    try { sessionStorage.removeItem(key); } catch {}
  };
  const draftKey = 'connecta-signup-draft';
  const profileKey = 'connecta-demo-profile';
  const guestKey = 'connecta-guest-name';
  const guestLookKey = 'connecta-guest-look';
  const home = 'home-dashboard.html';
  const signup = document.querySelector('[data-auth-signup]');
  const login = document.querySelector('[data-auth-login]');
  const character = document.querySelector('[data-auth-character]');

  login?.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    location.assign(home);
  });

  if (signup) {
    const draft = read(draftKey);
    const nameInput = signup.elements.name;
    nameInput.value = draft?.name || '';
    const birthday = signup.elements.birthday;
    const providers = [...document.querySelectorAll('[data-auth-signup-provider]')];
    const options = document.querySelector('[data-auth-signup-options]');
    const divider = document.querySelector('[data-auth-signup-divider]');
    const selection = document.querySelector('[data-auth-signup-selected]');
    const providerName = selection.querySelector('[data-auth-provider-name]');
    const credentials = signup.querySelector('[data-auth-email-credentials]');
    const password = signup.querySelector('#signup-password');
    const confirmation = signup.querySelector('#signup-password-confirmation');
    const passwordError = signup.querySelector('#password-match-error');
    let provider = '';

    function validatePasswordMatch() {
      const mismatch = !confirmation.disabled && confirmation.value !== '' && confirmation.value !== password.value;
      confirmation.setCustomValidity(mismatch ? 'Passwords must match.' : '');
      if (mismatch) confirmation.setAttribute('aria-invalid', 'true');
      else confirmation.removeAttribute('aria-invalid');
      passwordError.hidden = !mismatch;
    }

    function setProvider(method) {
      provider = method;
      const usingProvider = Boolean(provider);
      options.hidden = usingProvider;
      divider.hidden = usingProvider;
      selection.hidden = !usingProvider;
      providerName.textContent = provider;
      credentials.hidden = usingProvider;
      for (const input of credentials.querySelectorAll('input')) input.disabled = usingProvider;
      if (usingProvider) {
        password.value = '';
        confirmation.value = '';
      }
      validatePasswordMatch();
    }

    for (const button of providers) {
      button.addEventListener('click', () => {
        setProvider(button.dataset.authSignupProvider);
        nameInput.focus();
      });
    }
    selection.querySelector('[data-auth-signup-reset]').addEventListener('click', () => {
      setProvider('');
      providers[0].focus();
    });
    if (providers.some(button => button.dataset.authSignupProvider === draft?.provider)) {
      setProvider(draft.provider);
    }
    password.addEventListener('input', validatePasswordMatch);
    confirmation.addEventListener('input', validatePasswordMatch);

    const cutoff = new Date();
    const cutoffMonth = cutoff.getMonth();
    cutoff.setFullYear(cutoff.getFullYear() - 13);
    if (cutoff.getMonth() !== cutoffMonth) cutoff.setDate(0);
    const month = String(cutoff.getMonth() + 1).padStart(2, '0');
    const day = String(cutoff.getDate()).padStart(2, '0');
    birthday.max = [cutoff.getFullYear(), month, day].join('-');
    birthday.addEventListener('input', () => {
      birthday.setCustomValidity(birthday.value > birthday.max ? 'You must be 13 or older to join Connecta.' : '');
    });
    signup.addEventListener('submit', event => {
      event.preventDefault();
      event.stopPropagation();
      validatePasswordMatch();
      if (!signup.reportValidity()) return;
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.value = '';
        nameInput.reportValidity();
        return;
      }
      write(draftKey, { name, provider });
      location.assign('login-character.html');
    });
  }

  function renderCharacterLook(section) {
    const hair = ['#f59ac0', '#a58be8', '#8fdcc0', '#f7b267', '#fff1a8', '#c8e3ff', '#46527f', '#34313f'];
    const outfits = ['#ff6fa8', '#7c5cff', '#2f80ed', '#12a37f', '#ef8a3c', '#e84855'];
    const swatches = (name, colors, selected) => colors.map((color, i) =>
      '<button type="button" aria-label="' + name + ' ' + color + '" aria-pressed="' + (i === selected) +
      '" style="--swatch: ' + color + '"></button>'
    ).join('');
    const items = [
      ['None', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/></svg>'],
      ['Ribbon', '<span data-look-art="ribbon" aria-hidden="true"></span>'],
      ['Cat ears', '<img src="assets/project-images/shop/cat-ears.webp" alt="">'],
      ['Glasses', '<img src="assets/project-images/shop/round-glasses.webp" alt="">'],
      ['Headphones', '<span data-look-art="headphones" aria-hidden="true"></span>'],
      ['Ahoge', '<span data-look-art="ahoge" aria-hidden="true"></span>'],
      ['Twin-tails', '<span data-look-art="twin-tails" aria-hidden="true"></span>'],
    ];
    const tiles = items.map(([name, art]) =>
      '<button type="button" aria-pressed="' + (name === 'Cat ears') + '">' + art + '<span>' + name + '</span></button>'
    ).join('');
    section.insertAdjacentHTML('beforeend', [
      '<div class="auth-look-layout">',
      '  <div class="auth-character-preview">',
      '    <img class="character-cutout" src="assets/feifei-avatar.png" alt="Feifei character preview">',
      '    <button type="button" class="auth-character-shuffle" data-auth-shuffle aria-label="Shuffle look">',
      '      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '        <rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6M6 18h.01M10 14h.01M15 6h.01M18 9h.01"/>',
      '      </svg>',
      '    </button>',
      '  </div>',
      '  <div class="auth-character-options">',
      '    <fieldset><legend>Hair</legend><div class="auth-swatches auth-swatches-hair">' + swatches('Hair', hair, 4) + '</div></fieldset>',
      '    <fieldset><legend>Outfit</legend><div class="auth-swatches auth-swatches-outfit">' + swatches('Outfit', outfits, 0) + '</div></fieldset>',
      '  </div>',
      '  <fieldset class="auth-character-accessories"><legend>Accessories</legend><div class="auth-accessories">' + tiles + '</div></fieldset>',
      '</div>',
    ].join('\n'));
  }

  if (character) {
    renderCharacterLook(character.querySelector('.auth-character-look'));
    const guestDestinations = { guest: 'discover-guest.html', invited: 'walk-guest.html' };
    const guestDestination = guestDestinations[character.dataset.authCharacter];
    const guest = Boolean(guestDestination);
    const name = character.querySelector('#name');
    const handle = character.querySelector('#handle');
    const draft = guest ? null : read(draftKey);
    name.value = guest ? read(guestKey) || '' : draft?.name || '';
    if (handle) {
      const suggestion = name.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (suggestion.length >= 3) handle.value = suggestion;
      handle.addEventListener('input', () => { handle.value = handle.value.toLowerCase(); });
    }

    const groups = [
      ['Hair', character.querySelector('.auth-swatches-hair')],
      ['Outfit', character.querySelector('.auth-swatches-outfit')],
      ['Accessory', character.querySelector('.auth-accessories')],
    ];
    const label = button => button.getAttribute('aria-label') || button.textContent.trim();
    const select = (group, choice) => {
      group.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button === choice));
      });
    };
    const guestLook = guest ? read(guestLookKey) : null;
    if (Array.isArray(guestLook)) {
      for (const [kind, group] of groups) {
        const choice = [...group.querySelectorAll('button')].find(button => guestLook.includes(kind + ':' + label(button)));
        if (choice) select(group, choice);
      }
    }
    const preview = character.querySelector('.auth-character-preview');
    const accessory = document.createElement('span');
    accessory.className = 'auth-selected-item';
    preview.append(accessory);
    const updatePreview = () => {
      const choice = groups[2][1].querySelector('[aria-pressed="true"]');
      accessory.replaceChildren();
      if (label(choice) !== 'None') {
        accessory.append(choice.firstElementChild.cloneNode(true));
        accessory.setAttribute('role', 'img');
        accessory.setAttribute('aria-label', 'Selected accessory: ' + label(choice));
      } else {
        accessory.removeAttribute('role');
        accessory.removeAttribute('aria-label');
      }
    };
    for (const [, group] of groups) {
      group.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (button) { select(group, button); updatePreview(); }
      });
    }
    character.querySelector('[data-auth-shuffle]').addEventListener('click', () => {
      for (const [, group] of groups) {
        const choices = [...group.querySelectorAll('button:not([aria-pressed="true"])')];
        select(group, choices[Math.floor(Math.random() * choices.length)]);
      }
      updatePreview();
    });
    updatePreview();

    character.addEventListener('submit', event => {
      event.preventDefault();
      const look = groups.map(([kind, group]) =>
        kind + ':' + label(group.querySelector('[aria-pressed="true"]'))
      );
      if (guestDestination) {
        write(guestKey, name.value.trim() || 'Guest');
        write(guestLookKey, look);
        location.assign(guestDestination);
        return;
      }
      const displayName = name.value.trim();
      if (!displayName) { name.value = ''; name.reportValidity(); return; }
      write(profileKey, { name: displayName, handle: handle.value });
      write('connecta-character-look', look);
      clear(draftKey);
      location.assign(home);
    });
  }

  const guestProfile = document.querySelector('[data-auth-guest-profile]');
  if (guestProfile) {
    const savedName = read(guestKey);
    const name = typeof savedName === 'string' && savedName.trim() ? savedName.trim() : 'Guest';
    guestProfile.querySelector('[data-guest-name]').textContent = name;
    guestProfile.querySelector('[data-guest-status]').hidden = name === 'Guest';
    for (const avatar of document.querySelectorAll('[data-guest-initial]')) {
      avatar.textContent = Array.from(name)[0].toLocaleUpperCase();
    }
    guestProfile.querySelector('[data-auth-guest-signout]').addEventListener('click', () => {
      clear(guestKey);
      clear(guestLookKey);
    });
  }

  document.querySelector('[data-auth-signout]')?.addEventListener('click', () => {
    clear(draftKey);
    clear(profileKey);
    clear(guestKey);
    clear(guestLookKey);
    clear('connecta-character-look');
  });
  if (document.documentElement.dataset.uiPage === 'home-dashboard') {
    const profile = read(profileKey);
    const greeting = document.querySelector('main h1');
    if (profile?.name && greeting) greeting.textContent = greeting.textContent.replace(/feifei/g, profile.name);
  }
})();

