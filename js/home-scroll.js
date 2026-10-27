/* Motion source: the supplied local Sección Inicio Scroll.html.
 * Geometry, copy and colours: saved Figma audit; no live Figma dependency.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const experience = document.querySelector('.home-experience');
  const arts = [...document.querySelectorAll('.art-stack > .scene-art')];
  const copies = [...document.querySelectorAll('.copy-stack > .scene-copy')];
  const sceneCount = arts.length;
  const status = document.querySelector('#scene-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 767px)');
  const readiness = new Map();
  let desired = 0;
  let active = -1;
  let lastRendered = 0;
  let controller;
  let timeline;
  let staticContainer;
  let generation = 0;
  let sizeFrame;
  let touchY = null;
  const wrapScene = value => ((value % sceneCount) + sceneCount) % sceneCount;
  // Native offsets are an internal circular buffer, not a bookmarkable position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function activateImage(image) {
    // srcset before src prevents an unnecessary second request.
    if (image.dataset.srcset) {
      image.srcset = image.dataset.srcset;
      delete image.dataset.srcset;
    }
    if (image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }
  }

  function loadScene(index) {
    index = wrapScene(index);
    if (readiness.has(index)) return readiness.get(index).promise;
    const record = { ready: false };
    const images = [...arts[index].querySelectorAll('img')];
    record.promise = Promise.all(images.map(async image => {
      image.loading = 'eager';
      activateImage(image);
      try {
        await image.decode();
      } catch {
        // If decode races responsive selection, wait for the image's final load.
        if (!image.complete) await new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }
    })).then(() => {
      record.ready = images.every(image => image.complete && image.naturalWidth > 0);
      if (record.ready && root.dataset.scrollMode === 'animated') render(desired);
      return record.ready;
    });
    readiness.set(index, record);
    return record.promise;
  }

  function setActive(index) {
    if (active === index) return;
    active = index;
    root.dataset.scene = String(index);
    copies.forEach((copy, i) => {
      copy.setAttribute('aria-hidden', String(i !== index));
      copy.inert = i !== index;
    });
    status.textContent = copies[index].querySelector('h2').textContent;
  }

  function transformScene(index, movement, opacity) {
    const art = arts[index];
    const copy = copies[index];
    art.style.opacity = String(opacity);
    art.style.visibility = opacity > 0 ? 'visible' : 'hidden';
    copy.style.opacity = String(opacity);
    copy.style.visibility = opacity > 0 ? 'visible' : 'hidden';
    // Reference constants are screen pixels; reduce displacement on narrow screens.
    const amplitude = mobile.matches ? 0.45 : 1;
    art.querySelectorAll('.quadrant').forEach((tile, k) => {
      const x = movement * (k % 2 ? 85 : -85) * amplitude;
      const y = movement * (k < 2 ? -75 : 75) * amplitude;
      tile.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 - 0.04 * Math.abs(movement)})`;
    });
    copy.style.transform = `translate3d(${-16 * movement * amplitude}px,${110 * movement * amplitude}px,0)`;
  }

  function render(value) {
    desired = wrapScene(value);
    const current = Math.floor(desired);
    const next = wrapScene(current + 1);
    const blend = desired - current;
    loadScene(current);
    if (blend > 0) loadScene(next);
    // Keep the last decoded composition on screen on a cold/slow fast scroll.
    if (!readiness.get(current)?.ready || (blend > 0 && !readiness.get(next)?.ready)) return;
    lastRendered = desired;
    root.dataset.loopPhase = desired.toFixed(6);
    arts.forEach((_, i) => {
      // At 5 -> 0 the first DOM node must be above the sixth, too.
      arts[i].style.zIndex = i === next && blend > 0 ? '2' : i === current ? '1' : '0';
      if (i === current) transformScene(i, blend, 1);
      else if (i === next && blend > 0) transformScene(i, blend - 1, blend);
      else transformScene(i, 0, 0);
    });
    // Crossfade the text separately; the common 60% overlay never doubles.
    copies[current].style.opacity = String(1 - blend);
    setActive(wrapScene(Math.round(desired)));
    if (blend > 0.6) loadScene(current + 2);
  }

  function fitTitles(container = document) {
    container.querySelectorAll('.title-fit').forEach(span => {
      span.style.setProperty('--title-fit', '1');
      const heading = span.parentElement;
      const available = heading.clientWidth - (mobile.matches ? 24 : 48);
      // Preserve specified font size; fit only when a word cannot fit the viewport.
      const factor = Math.min(1, available / Math.max(span.scrollWidth, span.getBoundingClientRect().width));
      span.style.setProperty('--title-fit', String(factor));
    });
  }

  function setup() {
    generation += 1;
    const token = generation;
    timeline?.kill();
    controller?.kill();
    timeline = null;
    controller = null;
    if (staticContainer) {
      // Reuse the original nodes in both modes, including after preference changes.
      arts.forEach(art => document.querySelector('.art-stack').append(art));
      copies.forEach(copy => document.querySelector('.copy-stack').append(copy));
      staticContainer.remove();
      staticContainer = null;
    }
    active = -1;

    if (reduced.matches || !window.gsap || !window.ScrollTrigger) {
      root.dataset.scrollMode = 'static';
      staticContainer = document.createElement('div');
      staticContainer.className = 'static-scenes';
      arts.forEach((art, i) => {
        const section = document.createElement('section');
        section.className = 'static-scene';
        section.setAttribute('aria-label', copies[i].querySelector('h2').textContent);
        const imageCopy = art;
        imageCopy.removeAttribute('style');
        imageCopy.querySelectorAll('.quadrant').forEach(tile => tile.removeAttribute('style'));
        imageCopy.querySelectorAll('img').forEach(image => {
          image.loading = i ? 'lazy' : 'eager';
          activateImage(image);
        });
        const color = copies[i].style.getPropertyValue('--scene-color');
        const textCopy = copies[i];
        textCopy.removeAttribute('style');
        textCopy.style.setProperty('--scene-color', color);
        textCopy.removeAttribute('aria-hidden');
        textCopy.inert = false;
        const overlay = document.createElement('div');
        overlay.className = 'home-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        section.append(imageCopy, overlay, textCopy);
        staticContainer.append(section);
      });
      document.querySelector('.home-stage').append(staticContainer);
      fitTitles(staticContainer);
      return;
    }

    root.dataset.scrollMode = 'animated';
    window.gsap.registerPlugin(window.ScrollTrigger);
    const playhead = { value: lastRendered };
    let target = lastRendered;
    let step = 1;
    let lastScroll = 0;
    let repositioning = false;
    let refreshing = true;
    let recentres = 0;
    // A single reused tween provides the same 0.22s scrub as before.
    const scrubTo = window.gsap.quickTo(playhead, 'value', {
      duration: 0.22,
      ease: 'none',
      onUpdate: () => { if (token === generation) render(playhead.value); },
    });
    timeline = scrubTo.tween;

    function placeScroll(self, position) {
      repositioning = true;
      lastScroll = position;
      self.scroll(position);
      // Consume the synthetic scroll while its delta is deliberately ignored.
      window.ScrollTrigger.update();
      repositioning = false;
    }

    controller = window.ScrollTrigger.create({
      id: 'home-scenes',
      trigger: experience,
      start: 'top top',
      end: 'bottom bottom',
      onRefreshInit: () => { refreshing = true; },
      onRefresh(self) {
        step = Math.max(1, (self.end - self.start) / (sceneCount * 3));
        root.dataset.loopStep = String(step);
        // Start in the middle band, so the very first gesture may go up.
        // The same placement preserves phase across a resize/font refresh.
        placeScroll(self, self.start + (sceneCount + wrapScene(target)) * step);
        refreshing = false;
      },
      onUpdate(self) {
        if (repositioning || refreshing || token !== generation) return;
        const position = self.scroll();
        const delta = (position - lastScroll) / step;
        lastScroll = position;
        if (Math.abs(delta) > 1e-7) {
          target += delta;
          scrubTo(target);
        }

        const unit = (position - self.start) / step;
        if (unit < sceneCount / 2 || unit > sceneCount * 2.5) {
          // The sticky stage looks identical one full cycle away. The logical
          // playhead does NOT receive that scroll delta, so it never scrubs
          // backwards through six unwanted scenes at this internal teleport.
          const shift = unit < sceneCount / 2 ? sceneCount : -sceneCount;
          placeScroll(self, position + shift * step);
          // Keep numbers bounded as well as document height and object count.
          const cycles = Math.floor(target / sceneCount) * sceneCount;
          if (cycles) {
            target -= cycles;
            playhead.value -= cycles;
            scrubTo(target, playhead.value);
          }
          recentres += 1;
          root.dataset.loopRecentres = String(recentres);
        }
      },
    });
    root.dataset.loopRecentres = '0';
    loadScene(0);
    fitTitles();
    render(playhead.value);
    // After the first screen is ready, prepare only its adjacent scene at idle.
    loadScene(0).then(() => {
      if (token !== generation || navigator.connection?.saveData) return;
      const prepare = () => {
        if (token === generation) loadScene(Math.floor(lastRendered) + 1);
      };
      if ('requestIdleCallback' in window) requestIdleCallback(prepare, { timeout: 2000 });
      else setTimeout(prepare, 500);
    });
  }

  // Start just the adjacent scene on scroll intent, not all six at page load.
  function prepareNext(direction = 1) {
    if (root.dataset.scrollMode === 'animated') loadScene(Math.floor(lastRendered) + direction);
  }
  window.addEventListener('wheel', event => prepareNext(event.deltaY < 0 ? -1 : 1), { passive: true });
  window.addEventListener('touchstart', event => {
    touchY = event.touches[0]?.clientY ?? null;
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    const y = event.touches[0]?.clientY;
    if (touchY !== null && y !== undefined) prepareNext(y > touchY ? -1 : 1);
    touchY = y ?? null;
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) prepareNext();
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) prepareNext(-1);
  });
  reduced.addEventListener('change', setup);
  mobile.addEventListener('change', () => { fitTitles(); render(lastRendered); });
  window.addEventListener('resize', () => {
    cancelAnimationFrame(sizeFrame);
    sizeFrame = requestAnimationFrame(() => fitTitles());
  }, { passive: true });
  setup();
  document.fonts.ready.then(() => {
    fitTitles();
    if (window.ScrollTrigger && !reduced.matches) window.ScrollTrigger.refresh();
  });
})();
