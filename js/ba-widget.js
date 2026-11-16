/**
 * BEFORE / AFTER TURNTABLE (Contact section)
 * ----------------------------------------------------
 * One looping video holds both states stacked: "before" (clay playblast) on top, "after" (final render) below.
 * Each frame is drawn into a canvas: left of the split comes from the top half, right of it from the bottom half,
 * so the two states can never drift apart.
 * The split follows the mouse while hovering, can be dragged on touch screens and moved with the arrow keys.
 * The video is fetched only when the section comes near the screen, and pauses when off-screen or the tab is hidden.
 * With "reduce motion" the still poster is shown instead (the split still works).
 */
(function () {
  'use strict';

  const widget = document.querySelector('.ba-widget');
  if (!widget) return;

  const stage = widget.querySelector('.ba-stage');
  const canvas = widget.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;   // one state: 560 x 480 (the video is 560 x 960)
  const H = canvas.height;
  const DEFAULT_SPLIT = 0.5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let split = DEFAULT_SPLIT;   // 0..1, share of the width showing "before"
  let source = null;           // poster image or video, whichever is ready
  let video = null;
  let visible = false;
  let frameRequest = 0;

  // ---- Drawing ----
  function draw() {
    if (!source) return;
    const x = Math.round(W * split);
    if (x > 0) ctx.drawImage(source, 0, 0, x, H, 0, 0, x, H);            // before (top half)
    if (x < W) ctx.drawImage(source, x, H, W - x, H, x, 0, W - x, H);    // after (bottom half)
  }

  function setSplit(value) {
    split = Math.min(1, Math.max(0, value));
    stage.style.setProperty('--split', `${(split * 100).toFixed(2)}%`);
    stage.classList.toggle('is-before-hidden', split < 0.12);
    stage.classList.toggle('is-after-hidden', split > 0.88);
    const pct = Math.round(split * 100);
    stage.setAttribute('aria-valuenow', String(pct));
    draw();
  }

  // ---- Poster first (instant, tiny), video when near the screen ----
  const poster = new Image();
  poster.decoding = 'async';
  poster.onload = () => { if (!video || video.readyState < 2) { source = poster; draw(); } };
  poster.src = widget.dataset.poster;

  function loop() {
    draw();
    if (video && !video.paused) {
      frameRequest = 'requestVideoFrameCallback' in video ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
    }
  }

  function loadVideo() {
    if (video || reducedMotion.matches) return;
    video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    [['webm', 'video/webm; codecs="av01.0.05M.08"'], ['mp4', 'video/mp4']].forEach(([key, type]) => {
      const url = widget.dataset[key];
      if (!url) return;
      const s = document.createElement('source');
      s.src = url;
      s.type = type;
      video.appendChild(s);
    });
    video.addEventListener('playing', () => { source = video; loop(); });
    video.addEventListener('loadeddata', () => { source = video; draw(); });
    updatePlayback();
  }

  function updatePlayback() {
    if (!video) return;
    if (visible && !document.hidden && !reducedMotion.matches) {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      video.pause();
    }
  }

  if ('IntersectionObserver' in window) {
    // Start fetching a little before the section scrolls into view
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.target === widget && e.isIntersecting) loadVideo();
      });
    }, { rootMargin: '400px 0px' }).observe(widget);
    new IntersectionObserver(entries => {
      entries.forEach(e => { visible = e.isIntersecting; updatePlayback(); });
    }).observe(widget);
  } else {
    visible = true;
    loadVideo();
  }
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { if (video) video.pause(); source = poster; draw(); }
    else { loadVideo(); updatePlayback(); }
  });

  // ---- Interaction: hover (mouse), drag (touch / pen), arrow keys ----
  function fromEvent(e) {
    const r = stage.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  }
  let dragging = false;
  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || dragging) setSplit(fromEvent(e));
  });
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    dragging = true;
    setSplit(fromEvent(e));
  });
  ['pointerup', 'pointercancel'].forEach(t => stage.addEventListener(t, () => { dragging = false; }));
  // Mouse leaves: back to the middle
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setSplit(DEFAULT_SPLIT); });

  stage.addEventListener('keydown', e => {
    const step = e.shiftKey ? 0.2 : 0.05;
    let next = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = split - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = split + step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    if (next === null) return;
    e.preventDefault();
    setSplit(next);
  });

  setSplit(DEFAULT_SPLIT);
})();
