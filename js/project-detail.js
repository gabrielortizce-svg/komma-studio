(() => {
  'use strict';

  const title = document.querySelector('.detail-title');
  const titleWord = title?.querySelector('span');
  if (titleWord) {
    function fitTitle() {
      titleWord.style.setProperty('--detail-title-fit', '1');
      const ratio = Math.min(1, title.clientWidth / titleWord.getBoundingClientRect().width);
      titleWord.style.setProperty('--detail-title-fit', String(ratio));
    }
    new ResizeObserver(fitTitle).observe(title);
    document.fonts.ready.then(fitTitle);
    fitTitle();
  }

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animatedImages = [...document.querySelectorAll('.detail-animation-image[data-animation-src]')];
  const animationImageObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const image = entry.target;
      if (!reducedMotion.matches) image.src = image.dataset.animationSrc;
      animationImageObserver.unobserve(image);
    }
  }, { rootMargin: '1000px 0px' });

  function updateAnimatedImages() {
    for (const image of animatedImages) {
      if (reducedMotion.matches) {
        animationImageObserver.unobserve(image);
        if (image.dataset.posterSrc) image.src = image.dataset.posterSrc;
      } else if (image.getAttribute('src') === image.dataset.posterSrc) {
        animationImageObserver.observe(image);
      }
    }
  }
  updateAnimatedImages();

  const visible = new WeakSet();
  const videos = [...document.querySelectorAll('.detail-media video')];

  function applyPoster(video) {
    if (video.dataset.poster) {
      video.poster = video.dataset.poster;
      delete video.dataset.poster;
    }
  }

  function useAnimatedFallback(video) {
    if (!video.isConnected || video.dataset.fallbackLoading) return;
    applyPoster(video);
    video.dataset.fallbackLoading = 'true';
    const image = new Image(video.width, video.height);
    image.alt = video.getAttribute('aria-label') || '';
    image.decoding = 'async';
    image.addEventListener('load', () => video.replaceWith(image), { once: true });
    image.src = video.dataset.fallbackSrc;
  }

  function updatePlayback(video) {
    if (!video.isConnected) return;
    video.controls = reducedMotion.matches;
    if (reducedMotion.matches) {
      video.autoplay = false;
      video.pause();
    } else if (visible.has(video) && video.currentSrc) {
      video.play().catch(() => { video.controls = true; });
    } else {
      video.pause();
    }
  }

  const playbackObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
      updatePlayback(entry.target);
    }
  });

  const loadObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const video = entry.target;
      applyPoster(video);
      if (video.dataset.videoSrc) {
        video.src = video.dataset.videoSrc;
        delete video.dataset.videoSrc;
        video.preload = 'auto';
        video.load();
      }
      loadObserver.unobserve(video);
    }
  }, { rootMargin: '1000px 0px' });

  for (const video of videos) {
    video.muted = true;
    video.addEventListener('error', () => useAnimatedFallback(video), { once: true });
    video.addEventListener('canplay', () => updatePlayback(video));
    if (!video.canPlayType('video/webm; codecs="vp9"')) {
      // Keep this fallback deferred too; it is intentionally a lossless animation.
      const fallbackObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          useAnimatedFallback(video);
          fallbackObserver.disconnect();
        }
      }, { rootMargin: '1000px 0px' });
      fallbackObserver.observe(video);
      continue;
    }
    playbackObserver.observe(video);
    if (video.dataset.videoSrc) loadObserver.observe(video);
    updatePlayback(video);
  }

  reducedMotion.addEventListener('change', () => {
    updateAnimatedImages();
    videos.forEach(updatePlayback);
  });
})();
