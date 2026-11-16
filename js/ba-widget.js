/**
 * BEFORE / AFTER TURNTABLE (Contact section)
 * ----------------------------------------------------
 * The video packs both states AND their transparency into every frame (2 x 2 tiles, 560 x 480 each):
 *   top-left: "before" colour (premultiplied)   top-right: "before" alpha (grey)
 *   bottom-left: "after" colour (premultiplied) bottom-right: "after" alpha (grey)
 * A small WebGL shader rebuilds the transparent image and applies the split, so it works in every browser
 * (plain H.264 / AV1, no alpha-video support needed) and both states always stay in sync.
 * The split follows the mouse while hovering, can be dragged on touch screens and moved with the arrow keys.
 * The video is fetched only when the section comes near the screen, and pauses when off-screen or the tab is hidden.
 * With "reduce motion" the still poster is shown instead (the split still works).
 * Without WebGL a single transparent still of the final render is shown.
 */
(function () {
  'use strict';

  const widget = document.querySelector('.ba-widget');
  if (!widget) return;

  const stage = widget.querySelector('.ba-stage');
  const canvas = widget.querySelector('canvas');
  const DEFAULT_SPLIT = 0.5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let split = DEFAULT_SPLIT;   // 0..1, share of the width showing "before"
  let source = null;           // poster image or video, whichever is ready
  let video = null;
  let visible = false;

  // ---- WebGL setup ----
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) {
    // No WebGL: show a transparent still of the final render instead of the interactive widget
    const img = new Image();
    img.src = widget.dataset.still;
    img.alt = '';
    img.className = 'ba-still';
    canvas.replaceWith(img);
    stage.classList.add('is-static');
    return;
  }

  const VERT = `
    attribute vec2 p;
    varying vec2 uv;
    void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
  const FRAG = `
    precision mediump float;
    uniform sampler2D tex;
    uniform float split;
    varying vec2 uv;
    void main() {
      float row = uv.x < split ? 0.0 : 0.5;              // before: top row, after: bottom row
      vec2 c = vec2(uv.x * 0.5, row + uv.y * 0.5);        // colour tile
      vec2 a = vec2(0.5 + uv.x * 0.5, row + uv.y * 0.5);  // alpha tile
      float alpha = clamp((texture2D(tex, a).r - 0.015) / 0.97, 0.0, 1.0);  // tiny encoder noise -> fully clear
      vec3 rgb = min(texture2D(tex, c).rgb, vec3(alpha));                    // premultiplied colour never exceeds alpha
      gl_FragColor = vec4(rgb, alpha);
    }`;
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const splitLoc = gl.getUniformLocation(prog, 'split');
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.clearColor(0, 0, 0, 0);

  // Backing store = CSS size x device pixel ratio (sharp on high-density screens)
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  // ---- Drawing ----
  function draw() {
    if (!source) return;
    resize();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    } catch (e) {
      return;
    }
    gl.uniform1f(splitLoc, split);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function setSplit(value) {
    split = Math.min(1, Math.max(0, value));
    stage.style.setProperty('--split', `${(split * 100).toFixed(2)}%`);
    stage.classList.toggle('is-before-hidden', split < 0.12);
    stage.classList.toggle('is-after-hidden', split > 0.88);
    stage.setAttribute('aria-valuenow', String(Math.round(split * 100)));
    draw();
  }

  // ---- Poster first (instant, small), video when near the screen ----
  const poster = new Image();
  poster.decoding = 'async';
  poster.onload = () => { if (!video || video.readyState < 2) { source = poster; draw(); } };
  poster.src = widget.dataset.poster;

  function loop() {
    draw();
    if (video && !video.paused) {
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(loop);
      else requestAnimationFrame(loop);
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
      entries.forEach(e => { if (e.isIntersecting) loadVideo(); });
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
  window.addEventListener('resize', draw);

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
