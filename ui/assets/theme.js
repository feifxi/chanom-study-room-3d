// Runs before paint so Thai tea and the selected light/dark mode apply across pages.
(() => {
  let theme = 'light';
  const palette = 'thaitea';
  try {
    theme = localStorage.getItem('studyroom-ui:theme') || theme;
  } catch { /* File previews can still work when browser storage is blocked. */ }
  const dark = theme === 'dark' || theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.palette = palette;
})();
