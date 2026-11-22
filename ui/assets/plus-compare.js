// Monthly / Yearly price toggle for the Plus page experiments. UI preview only, nothing is charged.
(() => {
  const buttons = [...document.querySelectorAll('[data-billing]')];
  if (!buttons.length) return;
  let period = 'monthly';
  try { if (localStorage.getItem('connecta-plus-billing') === 'yearly') period = 'yearly'; } catch {}
  const apply = () => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.billing === period)));
    document.querySelectorAll('[data-bill]').forEach(el => { el.hidden = el.dataset.bill !== period; });
    document.querySelectorAll('[data-href-monthly]').forEach(a => { a.href = a.dataset[period === 'monthly' ? 'hrefMonthly' : 'hrefYearly']; });
    try { localStorage.setItem('connecta-plus-billing', period); } catch {}
  };
  buttons.forEach(b => b.addEventListener('click', () => { period = b.dataset.billing; apply(); }));
  apply();
})();
