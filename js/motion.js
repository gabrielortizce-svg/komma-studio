/* Shared, optional entry effects. Navigation remains native between documents. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  let observer;
  let entryTimer;
  let main;

  function finishEntry() {
    root.classList.remove('motion-page-enter');
    clearTimeout(entryTimer);
    main?.removeEventListener('animationend', onEntryEnd);
  }

  function showEverything() {
    finishEntry();
    observer?.disconnect();
    root.classList.remove('motion-enabled');
  }

  function onEntryEnd(event) {
    if (event.target === main && event.animationName === 'komma-page-fade') finishEntry();
  }

  // Arm before body parsing to avoid a flash of visible cards. If setup fails,
  // the watchdog restores the normal CSS layout instead of leaving it hidden.
  const watchdog = setTimeout(showEverything, 1800);
  root.classList.add('motion-enabled', 'motion-page-enter');

  function reveal(target, immediate = false) {
    if (target.classList.contains('motion-revealed')) return;
    if (target.classList.contains('project-card')) {
      const rowTop = target.offsetTop;
      const row = [...target.parentElement.children].filter(card => Math.abs(card.offsetTop - rowTop) < 1);
      const delay = immediate ? 0 : Math.max(0, row.indexOf(target)) * 100;
      target.style.setProperty('--motion-delay', `${Math.min(delay, 200)}ms`);
    }
    target.classList.add('motion-revealed');
    observer?.unobserve(target);
  }

  function init() {
    try {
      main = document.querySelector('main');
      main?.addEventListener('animationend', onEntryEnd);
      entryTimer = setTimeout(finishEntry, 500);

      const targets = [...document.querySelectorAll('.project-grid > .project-card, .footer-top-rule')];
      if (targets.length) {
        observer = new IntersectionObserver(entries => {
          try {
            for (const entry of entries) {
              if (entry.isIntersecting) reveal(entry.target);
            }
          } catch {
            showEverything();
          }
        }, { threshold: 0.08 });
        targets.forEach(target => observer.observe(target));
        document.addEventListener('focusin', event => {
          const card = event.target.closest('.project-card');
          if (card) reveal(card, true);
        });
      }
      reducedMotion.addEventListener('change', event => {
        if (event.matches) showEverything();
      });
      // A cached document already entered once; never hide it again on Back.
      window.addEventListener('pageshow', event => {
        if (event.persisted) showEverything();
      });
      clearTimeout(watchdog);
    } catch {
      showEverything();
      clearTimeout(watchdog);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
