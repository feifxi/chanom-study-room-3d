// Local UI previews for the redesigned Friends directory.
(() => {
  const search = document.querySelector('[data-friends-search]');
  if (search) {
    const rows = [...document.querySelectorAll('[data-friend-row]')];
    search.addEventListener('input', () => {
      const value = search.value.toLocaleLowerCase().trim();
      rows.forEach(row => row.hidden = !row.dataset.friendSearch.includes(value));
      document.querySelector('.friends-empty').hidden = rows.some(row => !row.hidden);
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-page-preview]')) return;
    const toast = document.createElement('div'); toast.className = 'ui-preview-toast'; toast.role = 'status'; toast.textContent = 'UI preview';
    document.body.append(toast); setTimeout(() => toast.remove(), 1500);
  });
})();
