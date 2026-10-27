/* KOMMA — Pieces in Motion. Optional intro; home-scroll remains independent. */
(() => {
  'use strict';

  const root = document.documentElement;
  const storageKey = 'komma.pieces-in-motion.seen.v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const preview = new URLSearchParams(location.search).get('intro') === 'preview';
  let seen = false;
  try { seen = sessionStorage.getItem(storageKey) === '1'; } catch { /* Storage is optional. */ }
  if (reduced.matches || (seen && !preview)) {
    root.dataset.introState = reduced.matches ? 'reduced' : 'seen';
    return;
  }

  let overlay;
  let brand;
  let timeline;
  let finished = false;
  let started = false;
  let inertNodes = [];
  let originalBrandStyle;
  const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

  function preventScroll(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); finish('skipped'); }
    else if (scrollKeys.has(event.key)) preventScroll(event);
  }

  function finish(reason = 'complete') {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    timeline?.kill();
    window.removeEventListener('wheel', preventScroll, true);
    window.removeEventListener('touchmove', preventScroll, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', onPageHide);
    reduced.removeEventListener('change', onReducedMotion);
    inertNodes.forEach(({ node, inert }) => { node.inert = inert; });
    if (brand && started) {
      window.gsap?.set(brand, { clearProps: 'all' });
      if (originalBrandStyle === null) brand.removeAttribute('style');
      else brand.setAttribute('style', originalBrandStyle);
    }
    const moveFocus = overlay?.contains(document.activeElement) && document.activeElement !== overlay;
    if (document.activeElement === overlay) overlay.blur();
    if (overlay) overlay.hidden = true;
    root.classList.remove('intro-pending', 'intro-ready');
    root.dataset.introState = reason;
    if (moveFocus) document.querySelector('.site-nav a')?.focus({ preventScroll: true });
  }
  function onResize() { finish('resized'); }
  function onPageHide() { finish('complete'); }
  function onReducedMotion(event) { if (event.matches) finish('reduced'); }

  // Arm before the first paint; a failed dependency can never keep Inicio covered.
  root.classList.add('intro-pending');
  root.dataset.introState = 'pending';
  const watchdog = setTimeout(() => finish('fallback'), 6000);
  window.addEventListener('wheel', preventScroll, { capture: true, passive: false });
  window.addEventListener('touchmove', preventScroll, { capture: true, passive: false });
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('pagehide', onPageHide, { once: true });
  reduced.addEventListener('change', onReducedMotion);

  async function init() {
    if (finished) return;
    try {
      overlay = document.querySelector('#home-intro');
      brand = document.querySelector('.site-brand');
      if (!overlay || !brand || !window.gsap) { finish('fallback'); return; }
      inertNodes = [...document.querySelectorAll('body > header, body > main, body > .site-brand')]
        .map(node => ({ node, inert: node.inert }));
      inertNodes.forEach(({ node }) => { node.inert = true; });
      overlay.focus({ preventScroll: true });
      if (!preview) { try { sessionStorage.setItem(storageKey, '1'); } catch { /* Never block navigation. */ } }

      // A brief bounded font/image check prevents metric changes and cold-image flashes.
      const firstImages = [...document.querySelectorAll('.scene-art[data-scene="0"] img')];
      await Promise.race([
        Promise.all([document.fonts.ready, ...firstImages.map(image => image.decode().catch(() => {}))]),
        new Promise(resolve => setTimeout(resolve, 700)),
      ]);
      if (finished) return;

      const brandFont = getComputedStyle(brand);
      if (!document.fonts.check(`${brandFont.fontWeight} ${brandFont.fontSize} ${brandFont.fontFamily}`)) {
        finish('fallback');
        return;
      }

      originalBrandStyle = brand.getAttribute('style');
      const destination = brand.getBoundingClientRect();
      const finalColor = getComputedStyle(brand).color;
      const width = innerWidth;
      const height = innerHeight;
      const scale = Math.min(width * 0.72, 1000) / destination.width;
      const shiftX = width / 2 - (destination.left + destination.width / 2);
      const shiftY = height / 2 - (destination.top + destination.height / 2);
      const logoHeight = destination.height * scale;
      const initialTransform = `translate(-50%, 0) translate(${shiftX}px, ${shiftY}px) scale(${scale})`;
      const gsap = window.gsap;
      const panels = [...overlay.querySelectorAll('.home-intro__panel')];
      const byline = overlay.querySelector('.home-intro__byline');

      started = true;
      root.classList.add('intro-ready');
      root.dataset.introState = 'playing';
      gsap.set(brand, { transform: initialTransform, transformOrigin: '50% 50%', zIndex: 101, color: '#000000', opacity: 1, clipPath: 'inset(0 50% 0 50%)' });
      gsap.set(byline, { xPercent: -50, y: logoHeight / 2 + (width < 768 ? 16 : 24) - 8 - 20 - (width >= 768 ? 20 : 0) });
      const reveal = { inset: 50 };
      function revealDoors() {
        // Set both sides from one value; CSS may serialize inset() to shorthand.
        brand.style.clipPath = `inset(0 ${reveal.inset}% 0 ${reveal.inset}%)`;
      }
      window.addEventListener('resize', onResize, { once: true });
      timeline = gsap.timeline({ onComplete: () => finish('complete') });
      // Reveal the stationary wordmark symmetrically from its centre outward.
      timeline.to(reveal, { inset: 0, duration: 1.5, ease: 'power2.inOut', onUpdate: revealDoors }, 0)
        .to(byline, { opacity: 1, duration: 0.32, ease: 'power2.out' }, 1.15)
        // Approved final transition: only its start is shifted by exactly 1s.
        .to(byline, { opacity: 0, duration: 0.28, ease: 'power2.out' }, 2.4)
        .to(brand, { transform: 'translate(-50%, 0) scale(1)', duration: 0.86, ease: 'power3.inOut' }, 2.4)
        .to(panels, { xPercent: index => index % 2 ? 101 : -101, yPercent: index => index < 2 ? -12 : 12, duration: 0.65, stagger: 0.025, ease: 'power3.inOut' }, 3.12)
        .to(brand, { color: finalColor, duration: 0.45, ease: 'power2.out' }, 3.25);
    } catch {
      finish('fallback');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
