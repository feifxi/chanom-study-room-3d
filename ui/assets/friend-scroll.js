// Native horizontal scrolling supports touch; buttons move one friend at a time.
(() => {
  document.querySelectorAll('.home-friends-band').forEach(band => {
    const strip = band.querySelector('.home-friends-strip');
    const previous = band.querySelector('[data-friends-previous]');
    const next = band.querySelector('[data-friends-next]');
    if (!strip || !previous || !next) return;
    const update = () => {
      const end = Math.max(0, strip.scrollWidth - strip.clientWidth);
      const start = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
      previous.disabled = strip.scrollLeft <= start + 1;
      next.disabled = strip.scrollLeft >= end - 1;
    };
    const move = direction => {
      const card = strip.firstElementChild;
      if (!card) return;
      const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(strip).columnGap || 0);
      strip.scrollBy({ left: direction * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    strip.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(strip);
    new MutationObserver(update).observe(strip, { childList: true });
    document.fonts.ready.then(update);
    update();
  });
})();
