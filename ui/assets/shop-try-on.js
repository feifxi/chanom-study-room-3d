(() => {
  const sidebar = document.querySelector('.shop-sidebar');
  const avatar = sidebar.querySelector('.shop-avatar');
  const browseButton = sidebar.querySelector('.shop-preview-action');
  const featuredButton = document.querySelector('[data-shop-featured-try]');
  const duckling = {
    id: 'pet-duck',
    category: 'Pet',
    name: featuredButton.closest('.shop-promo').querySelector('h2').textContent.trim(),
    price: `${featuredButton.previousElementSibling.textContent.trim()} coins`,
  };
  const storageKey = 'connecta-shop-try-on';

  const categories = {
    Outfit: ['strawberry-dress', 'matcha-hoodie', 'starry-pajamas', 'school-uniform'],
    Accessory: ['bunny-ears', 'flower-crown', 'round-glasses', 'cat-ears'],
    Pet: ['pet-cat', 'pet-duck', 'pet-bunny'],
    'Photo frame': ['frame-sakura', 'frame-polaroid'],
  };
  const categoryByItem = new Map(
    Object.entries(categories).flatMap(([category, ids]) => ids.map(id => [id, category])),
  );

  const cards = [...document.querySelectorAll('.shop-product-card')].flatMap(button => {
    const picture = button.querySelector('.shop-product-art img');
    const [name, cost] = button.querySelector('.shop-product-info').children;
    const id = picture.getAttribute('src').split('/').pop().replace('.webp', '');
    const category = categoryByItem.get(id);
    if (!category) return [];

    const price = cost.textContent.trim() + (cost.querySelector('.lucide-coins') ? ' coins' : '');
    const item = { id, category, name: name.textContent.trim(), price };
    button.setAttribute('aria-label', `Try on ${item.name}, ${price}`);
    return [{ button, item }];
  });

  const selected = new Map();
  // Category tabs are separate HTML pages. Keep the same preview while the user browses them.
  let restored = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    for (const item of saved || []) {
      const category = categoryByItem.get(item?.id);
      if (category && typeof item.name === 'string' && typeof item.price === 'string') {
        selected.set(category, { ...item, category });
      }
    }
    restored = saved !== null;
  } catch {}

  if (document.documentElement.dataset.uiPage === 'shop-try-on' && !restored) {
    selected.set(duckling.category, duckling);
  }

  const visuals = document.createElement('div');
  visuals.className = 'shop-try-visuals';
  visuals.setAttribute('aria-hidden', 'true');
  avatar.append(visuals);

  const preview = document.createElement('section');
  preview.className = 'shop-try-panel';
  preview.setAttribute('aria-labelledby', 'shop-try-title');
  preview.innerHTML = '<h2 id="shop-try-title">Trying on</h2><ul class="shop-try-list"></ul>';
  browseButton.after(preview);
  const list = preview.querySelector('ul');

  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  preview.after(status);

  function render() {
    const items = [...selected.values()];
    preview.hidden = items.length === 0;
    browseButton.textContent = items.length ? 'Try another item' : 'Pick something to try on';
    visuals.replaceChildren();
    list.replaceChildren();

    for (const item of items) {
      const image = document.createElement('img');
      image.src = `assets/project-images/shop/${item.id}.webp`;
      image.alt = '';
      visuals.append(image);

      const description = document.createElement('span');
      description.className = 'shop-try-item';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const detail = document.createElement('small');
      detail.textContent = `${item.category} · ${item.price}`;
      description.append(name, detail);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'shop-try-remove';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${item.name}`);
      remove.addEventListener('click', () => {
        updatePreview(item, false);
        (list.querySelector('button') || browseButton).focus();
      });

      const row = document.createElement('li');
      row.append(image.cloneNode(), description, remove);
      list.append(row);
    }

    for (const { button, item } of cards) {
      button.setAttribute('aria-pressed', String(selected.get(item.category)?.id === item.id));
    }
  }

  function updatePreview(item, enabled) {
    if (enabled) selected.set(item.category, item);
    else selected.delete(item.category);
    status.textContent = enabled ? `Trying on ${item.name}.` : `Removed ${item.name} from preview.`;
    try { sessionStorage.setItem(storageKey, JSON.stringify([...selected.values()])); } catch {}
    render();
  }

  for (const { button, item } of cards) {
    button.addEventListener('click', () => updatePreview(item, selected.get(item.category)?.id !== item.id));
  }
  featuredButton.addEventListener('click', () => updatePreview(duckling, true));
  browseButton.addEventListener('click', () => cards[0]?.button.focus());
  render();
})();
