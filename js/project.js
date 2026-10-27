(() => {
  'use strict';

  const title = document.querySelector('.project-title');
  const word = title?.querySelector('span');

  if (word) {
    // Measure the actual font: the complete word follows the header's width,
    // retaining its proportions instead of stretching it horizontally.
    function fitTitle() {
      word.style.fontSize = '100px';
      const naturalWidth = word.getBoundingClientRect().width;
      word.style.fontSize = `${100 * title.getBoundingClientRect().width / naturalWidth}px`;
    }
    new ResizeObserver(fitTitle).observe(document.querySelector('.site-header'));
    document.fonts.ready.then(fitTitle);
    fitTitle();
  }

  const brand = document.querySelector('.site-brand');
  const footerRule = document.querySelector('.footer-top-rule');
  let docked = false;
  let dockFrame = 0;

  function updateBrandDock() {
    dockFrame = 0;
    if (!brand || !footerRule) return;

    // Measure the normal fixed position first. Once the divider crosses that
    // line, the same link follows the Footer at the divider's lower edge.
    if (docked) {
      brand.style.removeProperty('top');
      brand.style.removeProperty('bottom');
      docked = false;
    }
    const floatingTop = brand.getBoundingClientRect().top;
    const dividerBottom = footerRule.getBoundingClientRect().bottom;
    if (dividerBottom < floatingTop) {
      brand.style.bottom = 'auto';
      brand.style.top = `${dividerBottom}px`;
      docked = true;
    }
  }

  function scheduleBrandDock() {
    if (!dockFrame) dockFrame = requestAnimationFrame(updateBrandDock);
  }

  window.addEventListener('scroll', scheduleBrandDock, {passive:true});
  window.addEventListener('resize', scheduleBrandDock, {passive:true});
  updateBrandDock();
})();
