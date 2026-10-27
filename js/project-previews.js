/* Load animated thumbnail previews only after desktop hover or keyboard focus. */
(() => {
  'use strict';

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  document.querySelectorAll('.project-card--animated-preview').forEach(card => {
    const link = card.querySelector('.project-card__link');
    const art = card.querySelector('.project-card__art');
    const video = card.querySelector('.project-card__preview-video');
    if (!link || !art || !video) return;

    let requested = false;
    let sourceChosen = false;
    let resetTimer = 0;

    function chooseSource() {
      if (sourceChosen) return;
      const webm = video.dataset.previewWebm;
      const mp4 = video.dataset.previewMp4;
      const canWebm = video.canPlayType('video/webm; codecs="vp9"');
      const canMp4 = video.canPlayType('video/mp4; codecs="avc1.42E01E"');
      const source = canWebm ? webm : canMp4 ? mp4 : webm || mp4;
      if (!source) return;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = 'none';
      video.src = source;
      sourceChosen = true;
    }

    function resetWhenHidden() {
      if (requested || !video.paused || video.readyState === 0) return;
      try { video.currentTime = 0; } catch { /* The next load/play begins at zero. */ }
    }

    function beginPreview() {
      if (requested || reducedMotion.matches) return;
      requested = true;
      clearTimeout(resetTimer);
      chooseSource();
      if (!video.src) return;
      if (video.readyState > 0) {
        try { video.currentTime = 0; } catch { /* Wait for metadata. */ }
      } else {
        video.load();
      }
      const playback = video.play();
      playback?.then(() => {
        if (requested && !video.paused) art.classList.add('preview-playing');
      }).catch(() => {
        requested = false;
        video.pause();
        art.classList.remove('preview-playing');
      });
    }

    function endPreview() {
      if (!requested && video.paused) return;
      requested = false;
      video.pause();
      art.classList.remove('preview-playing');
      clearTimeout(resetTimer);
      resetTimer = window.setTimeout(resetWhenHidden, 320);
    }

    video.addEventListener('playing', () => {
      if (requested && !reducedMotion.matches) art.classList.add('preview-playing');
      else endPreview();
    });
    video.addEventListener('transitionend', event => {
      if (event.propertyName === 'opacity') resetWhenHidden();
    });
    link.addEventListener('pointerenter', beginPreview);
    link.addEventListener('pointerleave', endPreview);
    link.addEventListener('pointercancel', endPreview);
    link.addEventListener('focusin', event => {
      if (event.target.matches(':focus-visible')) beginPreview();
    });
    link.addEventListener('focusout', event => {
      if (!link.contains(event.relatedTarget)) endPreview();
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) endPreview();
    });
  });
})();
