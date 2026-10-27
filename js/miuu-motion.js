/* Miuu Stream only: dynamic Header clearance and one-time info reveal. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canObserve = 'IntersectionObserver' in window;
  let info;
  let header;
  let observer;
  let headerResizeObserver;
  let measureFrame = 0;
  let failOpenTimer = 0;
  let revealTimer = 0;
  let scrollFallback;
  let armed = false;
  let started = false;

  function updateStickyOffset() {
    measureFrame = 0;
    if (!header) return;
    const headerBottom = header.getBoundingClientRect().bottom;
    root.style.setProperty('--miuu-sticky-top', `${headerBottom + 30}px`);
  }

  function scheduleStickyOffset() {
    if (!measureFrame) measureFrame = requestAnimationFrame(updateStickyOffset);
  }

  function revealAll() {
    clearTimeout(failOpenTimer);
    clearTimeout(revealTimer);
    observer?.disconnect();
    observer = undefined;
    if (scrollFallback) window.removeEventListener('scroll', scrollFallback);
    scrollFallback = undefined;
    root.classList.remove('miuu-info-motion-armed');
    armed = false;
  }

  function startSequence(items) {
    if (started || !armed) return;
    started = true;
    observer?.disconnect();
    observer = undefined;
    if (scrollFallback) window.removeEventListener('scroll', scrollFallback);
    scrollFallback = undefined;
    items.forEach((item, index) => {
      item.style.setProperty('--miuu-reveal-delay', `${index * 100}ms`);
      window.setTimeout(() => {
        if (armed) item.classList.add('miuu-info-revealed');
      }, index * 100);
    });
    // Last divider completes at 1080ms; then remove the temporary motion state.
    revealTimer = window.setTimeout(revealAll, 1200);
    clearTimeout(failOpenTimer);
  }

  function initialize() {
    try {
      header = document.querySelector('.site-header');
      info = document.querySelector('.project-detail--miuu .detail-info');
      if (!header || !info) return;

      updateStickyOffset();
      if ('ResizeObserver' in window) {
        headerResizeObserver = new ResizeObserver(scheduleStickyOffset);
        headerResizeObserver.observe(header);
      }
      window.addEventListener('resize', scheduleStickyOffset, { passive: true });
      document.fonts?.ready.then(scheduleStickyOffset);

      if (reduceMotion.matches || !canObserve || !armed) return;
      const items = [...info.querySelectorAll('.detail-info__block, .detail-facts > div')];
      if (!items.length) { revealAll(); return; }

      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) startSequence(items);
      }, { threshold: 0.08 });
      observer.observe(info);
      // Native scroll is only a safety net for a missed observer notification.
      scrollFallback = () => {
        const bounds = info.getBoundingClientRect();
        if (bounds.top < innerHeight && bounds.bottom > 0) startSequence(items);
      };
      window.addEventListener('scroll', scrollFallback, { passive: true });
      scrollFallback();
    } catch {
      revealAll();
    }
  }

  if (!reduceMotion.matches && canObserve) {
    root.classList.add('miuu-info-motion-armed');
    armed = true;
    // If initialization or intersection delivery fails, ordinary content wins.
    failOpenTimer = window.setTimeout(revealAll, 10000);
  }

  reduceMotion.addEventListener('change', event => {
    if (event.matches) revealAll();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) revealAll();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
