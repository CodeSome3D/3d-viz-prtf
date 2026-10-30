/**
 * 3D CGI ARTIST PORTFOLIO — CORE APPLICATION
 * ----------------------------------------------------
 * Handles gallery rendering, real-time filtering, search,
 * sorting, responsive layout switching, and full lightbox interaction.
 */

(function () {
  'use strict';

  // Allowed Filter Values requested by artist
  const ALLOWED_CATEGORIES = ['Archviz', 'Concept Art', 'Hard Surface', 'Product'];
  const ALLOWED_DCCS = ['3ds Max', 'Blender', 'Cinema 4D', 'Autodesk Fusion', 'ZBrush'];
  const ALLOWED_RENDERERS = ['Corona', 'Cycles', 'Redshift'];

  // Helper to load initial works from localStorage or fallback to default data file
  function loadInitialWorks() {
    const defaultWorks = Array.isArray(window.PORTFOLIO_WORKS) ? [...window.PORTFOLIO_WORKS] : [];
    if (!defaultWorks.length) return [];
    // Untouched copy of works.js, so the editor can look up an artwork's own texts after it moved into a project
    window.PORTFOLIO_ORIGINAL_WORKS = JSON.parse(JSON.stringify(defaultWorks));
    try {
      const saved = localStorage.getItem('portfolio_saved_works');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultByKey = new Map(defaultWorks.filter(w => getWorkKey(w)).map(w => [getWorkKey(w), w]));

          const savedKeys = new Set();
          const merged = [];

          // 1. Preserve user custom ordering from localStorage for valid files / videos
          for (const item of parsed) {
            const key = getWorkKey(item);
            if (key && defaultByKey.has(key) && !savedKeys.has(key)) {
              const def = defaultByKey.get(key);
              merged.push({ ...def, ...item, id: String(merged.length + 1).padStart(3, '0') });
              savedKeys.add(key);
            } else if (key && isProject(item) && !savedKeys.has(key)) {
              // Project made in the browser editor (not exported to works.js yet): keep it
              merged.push({ ...item, id: String(merged.length + 1).padStart(3, '0') });
              savedKeys.add(key);
            } else {
              continue;
            }
            // Images/videos inside a project are not re-added as separate works
            if (isProject(item)) {
              // Texts only: tools / models changed on the project since then must not be pinned on the items
              fillItemTexts(merged[merged.length - 1], defaultWorks, ['name', 'description', 'year']);
              item.items.forEach(it => savedKeys.add(getWorkKey(it)));
            }
          }

          // 2. Append any newly added defaultWorks items that were not yet in localStorage
          for (const item of defaultWorks) {
            const key = getWorkKey(item);
            if (key && !savedKeys.has(key)) {
              merged.push({ ...item, id: String(merged.length + 1).padStart(3, '0') });
              savedKeys.add(key);
            }
          }

          try {
            localStorage.setItem('portfolio_saved_works', JSON.stringify(merged));
          } catch (e) {}
          window.PORTFOLIO_WORKS = merged;
          return merged;
        }
      }
    } catch (e) {
      console.warn('Could not read saved works from localStorage', e);
    }
    return defaultWorks;
  }

  // State Management
  const state = {
    works: loadInitialWorks(),
    filteredWorks: [],
    displayList: [],      // cards currently shown: filtered works, or the open project's materials
    openProject: null,    // project whose sub-gallery is open
    selectedCategory: 'all',
    selectedDcc: 'all',
    selectedRenderer: 'all',
    searchQuery: '',
    sortBy: 'default',
    layout: 'grid',
    currentLightboxIndex: -1,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  };

  // Helper: Normalize DCC list from item (supports string or array)
  function getDccList(item) {
    if (!item) return [];
    if (Array.isArray(item.dcc)) {
      return item.dcc.filter(Boolean);
    }
    if (typeof item.dcc === 'string' && item.dcc.trim()) {
      return [item.dcc.trim()];
    }
    return [];
  }

  // Helper: Get list of available categories
  function getAvailableCategories() {
    const cats = new Set(ALLOWED_CATEGORIES);
    if (Array.isArray(state.works)) {
      state.works.forEach(w => {
        if (w.category && typeof w.category === 'string' && w.category.trim()) {
          cats.add(w.category.trim());
        }
      });
    }
    return Array.from(cats);
  }

  // DOM Elements
  const elements = {
    galleryGrid: document.getElementById('galleryGrid'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    sortSelect: document.getElementById('sortSelect'),
    catFilterList: document.getElementById('catFilterList'),
    dccFilterList: document.getElementById('dccFilterList'),
    rndFilterList: document.getElementById('rndFilterList'),
    btnLayoutMasonry: document.getElementById('btnLayoutMasonry'),
    btnLayoutGrid: document.getElementById('btnLayoutGrid'),
    btnBackToTop: document.getElementById('btnBackToTop'),
    projectHeader: document.getElementById('projectHeader'),
    projectBack: document.getElementById('projectBack'),
    projectTitle: document.getElementById('projectTitle'),
    projectInfo: document.getElementById('projectInfo'),
    projectDesc: document.getElementById('projectDesc'),

    // Lightbox Elements
    lightboxDialog: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxImgContainer: document.getElementById('lightboxImgContainer'),
    lightboxVideoWrap: document.getElementById('lightboxVideoWrap'),
    lightboxVideo: document.getElementById('lightboxVideo'),
    stageControls: document.querySelector('.lightbox-stage .stage-controls'),
    lightboxPrev: document.getElementById('lightboxPrev'),
    lightboxNext: document.getElementById('lightboxNext'),
    lightboxClose: document.getElementById('lightboxClose'),
    lightboxCounter: document.getElementById('lightboxCounter'),
    lightboxTitle: document.getElementById('lightboxTitle'),
    lightboxDcc: document.getElementById('lightboxDcc'),
    lightboxRenderer: document.getElementById('lightboxRenderer'),
    lightboxCategory: document.getElementById('lightboxCategory'),
    lightboxYear: document.getElementById('lightboxYear'),
    lightboxDesc: document.getElementById('lightboxDesc'),
    lightboxEditBtn: document.getElementById('lightboxEditBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevelText: document.getElementById('zoomLevelText'),

    // Admin & Auth Elements
    btnToggleAdmin: document.getElementById('btnToggleAdmin'),
    authModal: document.getElementById('authModal'),
    authClose: document.getElementById('authClose'),
    authCancelBtn: document.getElementById('authCancelBtn'),
    authForm: document.getElementById('authForm'),
    authPasswordInput: document.getElementById('authPasswordInput'),
    authErrorMsg: document.getElementById('authErrorMsg'),
    toastContainer: document.getElementById('toastContainer'),

    // Header Stats
    statTotalWorks: document.getElementById('statTotalWorks'),
    statDccCount: document.getElementById('statDccCount'),
    statRndCount: document.getElementById('statRndCount')
  };

  // --- CRYPTOGRAPHIC OWNER AUTHENTICATION ---
  // One-way SHA-256 hash of the owner password (never stored as plain text)
  const OWNER_PWD_HASH = 'f734183f474b7b6b6efc67fe359dfa2c806b07062b14735f980647b1cb897f94';

  function sha256Pure(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let i, j, result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = [];
    let k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
      }
    }

    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);

    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (hash[i] >> (8 * j)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  async function computeSha256(str) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('crypto.subtle failed, using pure JS SHA-256 fallback', e);
      }
    }
    return sha256Pure(str);
  }

  // Preload all remaining portfolio images into browser cache so scrolling is instant with zero blank squares
  function precacheRemainingWorks() {
    if (!Array.isArray(state.works)) return;
    const preload = () => {
      // Only small WebP thumbnails are precached; full renders load when opened in the lightbox
      state.works.forEach((item, i) => {
        if (i >= 4) {
          const img = new Image();
          img.src = getCardImage(item);
        }
      });
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 1500 });
    } else {
      setTimeout(preload, 600);
    }
  }

  // --- INITIALIZATION ---
  function init() {
    initAdminMode();
    updateHeaderStats();
    buildFilterChips();
    applyFilters();
    bindEvents();
    bindLightboxEvents();
    bindAuthEvents();
    precacheRemainingWorks();
    syncProjectFromHash();
  }

  // --- ADMIN & AUTH MODE ---
  function initAdminMode() {
    const isSessionAuth = sessionStorage.getItem('portfolio_owner_authenticated') === 'true';
    if (isSessionAuth) {
      document.body.classList.add('is-admin');
    }
  }

  function openAuthModal() {
    if (!elements.authModal) return;
    elements.authPasswordInput.value = '';
    elements.authErrorMsg.style.display = 'none';
    elements.authModal.showModal();
    setTimeout(() => elements.authPasswordInput.focus(), 80);
  }

  function closeAuthModal() {
    if (elements.authModal && elements.authModal.open) {
      elements.authModal.close();
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const inputVal = elements.authPasswordInput.value.trim();
    if (!inputVal) return;

    const inputHash = await computeSha256(inputVal);

    if (inputHash === OWNER_PWD_HASH) {
      document.body.classList.add('is-admin');
      sessionStorage.setItem('portfolio_owner_authenticated', 'true');
      closeAuthModal();
      window.PORTFOLIO_APP.showToast('Owner unlocked! "Edit Gallery" is now available.');
    } else {
      elements.authErrorMsg.textContent = 'Incorrect password. Access denied.';
      elements.authErrorMsg.style.display = 'block';
      elements.authPasswordInput.select();
    }
  }

  function toggleAdminMode() {
    const isCurrentlyAdmin = document.body.classList.contains('is-admin');
    if (isCurrentlyAdmin) {
      document.body.classList.remove('is-admin');
      sessionStorage.removeItem('portfolio_owner_authenticated');
      localStorage.removeItem('portfolio_editor_mode');
      window.PORTFOLIO_APP.showToast('Owner mode locked');
    } else {
      openAuthModal();
    }
  }

  function bindAuthEvents() {
    if (elements.authForm) {
      elements.authForm.addEventListener('submit', handleAuthSubmit);
    }
    if (elements.authClose) {
      elements.authClose.addEventListener('click', closeAuthModal);
    }
    if (elements.authCancelBtn) {
      elements.authCancelBtn.addEventListener('click', closeAuthModal);
    }
    if (elements.authModal) {
      elements.authModal.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
          closeAuthModal();
        }
      });
    }
  }

  // --- STATS & COUNTERS ---
  function updateHeaderStats() {
    if (elements.statTotalWorks) {
      elements.statTotalWorks.textContent = state.works.length;
    }
    if (elements.statDccCount) {
      const dccs = new Set();
      state.works.forEach(w => getDccList(w).forEach(d => dccs.add(d)));
      elements.statDccCount.textContent = dccs.size || ALLOWED_DCCS.length;
    }
    if (elements.statRndCount) {
      const rnds = new Set(state.works.map(w => w.renderer).filter(Boolean));
      elements.statRndCount.textContent = rnds.size || ALLOWED_RENDERERS.length;
    }
  }

  // --- FILTER CHIPS BUILDER ---
  function buildFilterChips() {
    // Categories: Archviz, Concept Art, Hard Surface, Product, etc.
    const categories = getAvailableCategories();
    if (elements.catFilterList) {
      elements.catFilterList.innerHTML = `
        <button type="button" class="chip active" data-cat="all">All</button>
        ${categories.map(cat => `<button type="button" class="chip" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('')}
        ${state.works.some(isProject) ? `<button type="button" class="chip chip-project" data-cat="${PROJECTS_FILTER}">Projects</button>` : ''}
      `;
    }

    // Fixed allowed DCCs: 3ds Max, Blender, Cinema 4D, Autodesk Fusion, ZBrush
    elements.dccFilterList.innerHTML = `
      <button type="button" class="chip active" data-dcc="all">All</button>
      ${ALLOWED_DCCS.map(dcc => `<button type="button" class="chip" data-dcc="${escapeHtml(dcc)}">${escapeHtml(dcc)}</button>`).join('')}
    `;

    // Fixed allowed Renderers: Corona, Cycles, Redshift
    elements.rndFilterList.innerHTML = `
      <button type="button" class="chip active" data-rnd="all">All</button>
      ${ALLOWED_RENDERERS.map(rnd => `<button type="button" class="chip" data-rnd="${escapeHtml(rnd)}">${escapeHtml(rnd)}</button>`).join('')}
    `;
  }

  // --- FILTERING, SEARCH & SORTING ---
  function applyFilters() {
    const query = state.searchQuery.trim().toLowerCase();

    // A project matches when the project itself or any of its items matches (items can have their own tools / models)
    const matches = (item, owner) => {
      const itemDccs = getDccList(item);

      // Category filter
      if (state.selectedCategory === PROJECTS_FILTER) {
        if (!isProject(owner)) return false;
      } else if (state.selectedCategory !== 'all') {
        if ((item.category || '').toLowerCase() !== state.selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // DCC filter (matches any of the item's DCC tools)
      if (state.selectedDcc !== 'all') {
        const targetDcc = state.selectedDcc.toLowerCase();
        const hasDcc = itemDccs.some(d => d.toLowerCase() === targetDcc);
        if (!hasDcc) return false;
      }

      // Renderer filter
      if (state.selectedRenderer !== 'all') {
        if ((item.renderer || '').toLowerCase() !== state.selectedRenderer.toLowerCase()) {
          return false;
        }
      }

      // Search query (matches title, dcc, renderer, category, description)
      if (query) {
        const titleMatch = (item.name || '').toLowerCase().includes(query);
        const dccMatch = itemDccs.some(d => d.toLowerCase().includes(query));
        const rndMatch = (item.renderer || '').toLowerCase().includes(query);
        const catMatch = (item.category || '').toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        if (!titleMatch && !dccMatch && !rndMatch && !catMatch && !descMatch) {
          return false;
        }
      }
      return true;
    };
    state.filteredWorks = state.works.filter(item =>
      matches(item, item) || (isProject(item) && getProjectEntries(item).some(entry => matches(entry, item))));

    // Sort
    if (state.sortBy === 'name-asc') {
      state.filteredWorks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (state.sortBy === 'name-desc') {
      state.filteredWorks.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (state.sortBy === 'category') {
      state.filteredWorks.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
    } else if (state.sortBy === 'year-desc') {
      state.filteredWorks.sort((a, b) => ((parseInt(b.year) || 0) - (parseInt(a.year) || 0)) || (a.name || '').localeCompare(b.name || ''));
    } else if (state.sortBy === 'year-asc') {
      state.filteredWorks.sort((a, b) => ((parseInt(a.year) || 0) - (parseInt(b.year) || 0)) || (a.name || '').localeCompare(b.name || ''));
    }

    renderGallery();
    updateStatusLine();
  }

  // --- RENDER GALLERY ---
  function renderGallery() {
    state.displayList = state.openProject ? getProjectEntries(state.openProject) : state.filteredWorks;
    if (state.displayList.length === 0) {
      elements.galleryGrid.innerHTML = '';
      elements.emptyState.style.display = 'flex';
      return;
    }

    elements.emptyState.style.display = 'none';

    const cardsHtml = state.displayList.map((item, index) => {
      const dccs = getDccList(item);
      const rnd = item.renderer || 'Corona';
      const name = item.name || 'Untitled Render';
      const year = item.year || '';
      const category = item.category || 'Render';
      const project = isProject(item);
      const cover = getCover(item);
      const video = isVideo(cover);
      const fallback = cover.file && !video ? cover.file : getYouTubeThumb(cover);

      // Badges rendered strictly under the thumbnail in art-details
      const dccBadgesHtml = dccs.map(d => `<span class="badge-dcc" data-dcc="${escapeHtml(d)}">${escapeHtml(d)}</span>`).join('');
      const rndBadgeHtml = `<span class="badge-rnd" data-rnd="${escapeHtml(rnd)}">${escapeHtml(rnd)}</span>`;

      return `
        <article class="art-card${project ? ' is-project' : ''}" data-index="${index}" tabindex="0" role="button" aria-label="${escapeHtml(project ? `Project: ${name}` : name)}">
          <div class="art-media-wrap">
            <img 
              class="art-img" 
              src="${escapeHtml(getCardImage(item))}" 
              alt="${escapeHtml(getAltText(item))}" 
              ${index < 2 ? 'fetchpriority="high"' : (index >= 4 ? 'loading="lazy"' : '')}
              decoding="async"
              onload="this.parentElement.classList.add('has-loaded')"
              onerror="if (this.dataset.full !== '1') { this.dataset.full = '1'; this.src = '${escapeHtml(fallback)}'; }"
            >
            ${video ? VIDEO_PLAY_ICON : ''}
            ${project ? projectBadgeHtml(item) : ''}
            <div class="card-hover-overlay">
              <span class="quick-view-badge">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                ${project ? 'Open Project' : (video ? 'Play Video' : 'Inspect Artwork')}
              </span>
            </div>
          </div>
          <div class="art-details">
            <div class="art-header">
              <h3 class="art-title">${escapeHtml(name)}</h3>
              ${year ? `<span class="art-year">${escapeHtml(year)}</span>` : ''}
            </div>
            <div class="art-meta-row">
              <span class="art-category">${escapeHtml(category)}</span>
              <div class="art-badges-inline">
                ${dccBadgesHtml}
                ${rndBadgeHtml}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    elements.galleryGrid.innerHTML = cardsHtml;
  }

  function updateStatusLine() {
    if (elements.resultsCount) {
      elements.resultsCount.textContent = state.filteredWorks.length === state.works.length
        ? `${state.works.length} works`
        : `${state.filteredWorks.length} / ${state.works.length} works`;
    }

    const hasFilters = state.selectedCategory !== 'all' ||
      state.selectedDcc !== 'all' ||
      state.selectedRenderer !== 'all' ||
      state.searchQuery.trim() !== '' ||
      state.sortBy !== 'default';

    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }
    if (elements.searchClear) {
      elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
    }
  }

  function resetAllFilters() {
    state.selectedCategory = 'all';
    state.selectedDcc = 'all';
    state.selectedRenderer = 'all';
    state.searchQuery = '';
    state.sortBy = 'default';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'default';

    // Update chips active states
    if (elements.catFilterList) {
      elements.catFilterList.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.cat === 'all');
      });
    }
    elements.dccFilterList.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.dcc === 'all');
    });
    elements.rndFilterList.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.rnd === 'all');
    });

    applyFilters();
  }

  // --- LIGHTBOX CONTROLLER ---
  function openLightbox(index) {
    if (index < 0 || index >= state.displayList.length) return;

    state.currentLightboxIndex = index;
    resetZoom();

    const item = state.displayList[index];
    updateLightboxContent(item);

    elements.lightboxDialog.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    stopLightboxVideo();
    elements.lightboxDialog.close();
    document.body.style.overflow = '';
  }

  function updateLightboxContent(item) {
    // A project in the main gallery shows its cover (first image or video); the info below is the project's
    const media = isProject(item) ? getProjectEntries(item)[0] : item;
    const videoId = getYouTubeId(media.youtube);
    if (videoId && elements.lightboxVideo) {
      // YouTube artwork: show the embedded player instead of the zoomable image
      elements.lightboxImgContainer.hidden = true;
      if (elements.stageControls) elements.stageControls.hidden = true;
      elements.lightboxVideoWrap.hidden = false;
      setLightboxVideoSrc(`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`, media.name || 'YouTube video');
      elements.lightboxImg.removeAttribute('src');
    } else {
      stopLightboxVideo();
      elements.lightboxImgContainer.hidden = false;
      if (elements.stageControls) elements.stageControls.hidden = false;
      elements.lightboxImg.src = media.file;
    }
    elements.lightboxImg.alt = getAltText(media);
    elements.lightboxCounter.textContent = `${state.currentLightboxIndex + 1} / ${state.displayList.length}`;
    elements.lightboxTitle.textContent = (item.name || 'Untitled Render') + (isProject(item) ? ` (Project · ${item.items.length})` : '');

    // DCC Badges (Multiple supported)
    const dccs = getDccList(item);
    elements.lightboxDcc.innerHTML = dccs.map(d =>
      `<span class="badge-dcc" data-dcc="${escapeHtml(d)}">${escapeHtml(d)}</span>`
    ).join('');

    // Renderer Badge
    const rnd = item.renderer || 'Corona';
    elements.lightboxRenderer.textContent = rnd;
    elements.lightboxRenderer.setAttribute('data-rnd', rnd);

    elements.lightboxCategory.textContent = item.category || 'Artwork';
    elements.lightboxYear.textContent = item.year || '—';
    elements.lightboxDesc.textContent = item.description || 'No description provided.';
  }

  function navigateLightbox(direction) {
    const total = state.displayList.length;
    if (total <= 1) return;

    let newIndex = state.currentLightboxIndex + direction;
    if (newIndex < 0) newIndex = total - 1;
    if (newIndex >= total) newIndex = 0;

    openLightbox(newIndex);
  }

  function stopLightboxVideo() {
    if (!elements.lightboxVideo) return;
    if (elements.lightboxVideo.hasAttribute('src')) setLightboxVideoSrc('', 'YouTube video');
    elements.lightboxVideoWrap.hidden = true;
  }

  // Swap in a fresh iframe instead of changing src: changing an attached iframe's src adds
  // browser history entries, which would hijack the Back button (e.g. leaving a project)
  function setLightboxVideoSrc(src, title) {
    const frame = elements.lightboxVideo.cloneNode(false);
    if (src) frame.src = src; else frame.removeAttribute('src');
    frame.title = title;
    elements.lightboxVideo.replaceWith(frame);
    elements.lightboxVideo = frame;
  }

  // --- ZOOM & PAN LOGIC ---
  function applyTransform() {
    elements.lightboxImg.style.transform = `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${state.zoomLevel})`;
    elements.zoomLevelText.textContent = `${Math.round(state.zoomLevel * 100)}%`;
  }

  function zoomIn() {
    state.zoomLevel = Math.min(3, +(state.zoomLevel + 0.25).toFixed(2));
    applyTransform();
  }

  function zoomOut() {
    state.zoomLevel = Math.max(0.5, +(state.zoomLevel - 0.25).toFixed(2));
    if (state.zoomLevel <= 1) {
      state.panOffset = { x: 0, y: 0 };
    }
    applyTransform();
  }

  function resetZoom() {
    state.zoomLevel = 1;
    state.panOffset = { x: 0, y: 0 };
    applyTransform();
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    // Admin toggle button in footer
    if (elements.btnToggleAdmin) {
      elements.btnToggleAdmin.addEventListener('click', toggleAdminMode);
    }

    // Hotkey: Ctrl+Alt+E toggles admin mode
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleAdminMode();
      }
    });

    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      applyFilters();
    });

    elements.searchClear.addEventListener('click', () => {
      state.searchQuery = '';
      elements.searchInput.value = '';
      applyFilters();
      elements.searchInput.focus();
    });

    // Sort select
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFilters();
    });

    // Reset filters
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Category chip list clicks
    if (elements.catFilterList) {
      elements.catFilterList.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        elements.catFilterList.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.selectedCategory = chip.dataset.cat;
        applyFilters();
      });
    }

    // DCC chip list clicks
    elements.dccFilterList.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      elements.dccFilterList.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedDcc = chip.dataset.dcc;
      applyFilters();
    });

    // Renderer chip list clicks
    elements.rndFilterList.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      elements.rndFilterList.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedRenderer = chip.dataset.rnd;
      applyFilters();
    });

    // Layout toggles
    elements.btnLayoutMasonry.addEventListener('click', () => {
      elements.btnLayoutMasonry.classList.add('active');
      elements.btnLayoutGrid.classList.remove('active');
      elements.galleryGrid.className = 'gallery-grid layout-masonry';
    });

    elements.btnLayoutGrid.addEventListener('click', () => {
      elements.btnLayoutGrid.classList.add('active');
      elements.btnLayoutMasonry.classList.remove('active');
      elements.galleryGrid.className = 'gallery-grid layout-grid';
    });

    // Card clicks (Open Lightbox)
    elements.galleryGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.art-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      openCard(index);
    });

    // Card keyboard trigger (Enter/Space)
    elements.galleryGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.art-card');
        if (card) {
          e.preventDefault();
          const index = parseInt(card.dataset.index, 10);
          openCard(index);
        }
      }
    });

    // Project sub-gallery: back button, browser back/forward, Esc
    if (elements.projectBack) {
      elements.projectBack.addEventListener('click', () => closeProject());
    }
    window.addEventListener('hashchange', syncProjectFromHash);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.openProject && !document.querySelector('dialog[open]')) {
        closeProject();
      }
    });

    // Floating Back to Top Button
    if (elements.btnBackToTop) {
      const handleScroll = () => {
        if (window.scrollY > 160) {
          elements.btnBackToTop.classList.add('is-visible');
        } else {
          elements.btnBackToTop.classList.remove('is-visible');
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();

      elements.btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function bindLightboxEvents() {
    // Navigation
    elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));
    elements.lightboxClose.addEventListener('click', closeLightbox);

    // Stop video playback however the dialog gets closed (Esc, light dismiss, close button)
    elements.lightboxDialog.addEventListener('close', stopLightboxVideo);

    // Light dismiss: click outside the wrapper to close
    elements.lightboxDialog.addEventListener('click', (e) => {
      if (e.target === elements.lightboxDialog) {
        closeLightbox();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!elements.lightboxDialog.open) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    });

    // Zoom buttons
    elements.zoomInBtn.addEventListener('click', zoomIn);
    elements.zoomOutBtn.addEventListener('click', zoomOut);
    elements.zoomResetBtn.addEventListener('click', resetZoom);

    // Mouse wheel zoom inside stage
    elements.lightboxImgContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }, { passive: false });

    // Drag to pan when zoomed
    elements.lightboxImgContainer.addEventListener('mousedown', (e) => {
      if (state.zoomLevel <= 1) return;
      state.isDragging = true;
      elements.lightboxImgContainer.classList.add('dragging');
      state.dragStart = { x: e.clientX - state.panOffset.x, y: e.clientY - state.panOffset.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDragging) return;
      state.panOffset = {
        x: e.clientX - state.dragStart.x,
        y: e.clientY - state.dragStart.y
      };
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        elements.lightboxImgContainer.classList.remove('dragging');
      }
    });

    // Lightbox Edit Shortcut
    elements.lightboxEditBtn.addEventListener('click', () => {
      const currentItem = state.displayList[state.currentLightboxIndex];
      closeLightbox();
      if (window.PORTFOLIO_EDITOR && window.PORTFOLIO_EDITOR.openWithItem) {
        window.PORTFOLIO_EDITOR.openWithItem(currentItem._project || currentItem, currentItem._itemIndex);
      }
    });
  }

  // --- PUBLIC INTERFACE FOR EDITOR SYNC ---
  window.PORTFOLIO_APP = {
    refreshData: function (newWorks) {
      state.works = [...newWorks];
      window.PORTFOLIO_WORKS = state.works;
      try {
        localStorage.setItem('portfolio_saved_works', JSON.stringify(state.works));
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }
      updateHeaderStats();
      buildFilterChips();
      state.selectedCategory = 'all';
      if (state.openProject) {
        const project = state.openProject;
        if (state.works.includes(project) && isProject(project)) {
          showProjectHeader(project);
        } else {
          closeProject();
        }
      }
      applyFilters();
    },
    getYouTubeId: getYouTubeId,
    isProject: isProject,
    slugify: slugify,
    getWorkKey: getWorkKey,
    fillItemTexts: fillItemTexts,
    getCardImage: getCardImage,
    resetToDefaults: function () {
      localStorage.removeItem('portfolio_saved_works');
      window.location.reload();
    },
    showToast: function (message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        <span>${escapeHtml(message)}</span>
      `;
      elements.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  };

  // SEO helpers: thumbnails live in thumbs/<image-name>.webp (generated by tools/seo_build.py).
  // If a thumbnail is missing (e.g. a newly added image), the card falls back to the full file.
  function getThumbPath(file) {
    if (!file) return '';
    const name = file.split('/').pop().replace(/\.[^.]+$/, '');
    return `thumbs/${name}.webp`;
  }

  function getAltText(item) {
    const tools = getDccList(item).join(' & ');
    const rnd = item.renderer || '';
    const tech = [tools, rnd].filter(Boolean).join(', ');
    const base = `${item.name || 'Untitled render'} - ${item.category || '3D'} ${isVideo(item) ? 'video' : 'render'}`;
    return tech ? `${base} made in ${tech}` : base;
  }

  // --- YOUTUBE ARTWORKS ---
  // A work becomes a video when it has a "youtube" field (video ID or any YouTube link).
  // "file" is optional for videos: if set, that image is the card poster, otherwise YouTube's thumbnail is used.
  const VIDEO_PLAY_ICON = '<span class="video-play-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>';

  function getYouTubeId(value) {
    if (!value) return '';
    const str = String(value).trim();
    if (/^[\w-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live|v)\/)([\w-]{11})/);
    return match ? match[1] : '';
  }

  function isVideo(item) {
    return !!(item && getYouTubeId(item.youtube));
  }

  function getYouTubeThumb(item) {
    const id = getYouTubeId(item && item.youtube);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  }

  function getCardImage(item) {
    const cover = getCover(item);
    if (cover && cover.file) return getThumbPath(cover.file);
    return getYouTubeThumb(cover);
  }

  // Identity of a work for saved-edit merging: project slug, image file, or YouTube video
  function getWorkKey(item) {
    if (!item) return '';
    if (isProject(item)) return `project:${item.project}`;
    if (item.file) return item.file;
    const id = getYouTubeId(item.youtube);
    return id ? `youtube:${id}` : '';
  }

  // --- PROJECTS ---
  // A project is one gallery card that groups 2+ images/videos:
  //   { "name": "...", "project": "url-slug", "items": [ { "file": "images/a.jpg" }, { "youtube": "https://youtu.be/...", "name": "Optional title" } ], ...same metadata as a work }
  // The first item is the cover. Clicking the card opens the project's sub-gallery (shareable as #project=url-slug).
  const PROJECTS_FILTER = '__projects';
  const PROJECT_ICON = '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 012 2v12"/></svg>';

  function isProject(item) {
    return !!(item && item.project && Array.isArray(item.items) && item.items.length > 0);
  }

  function getCover(item) {
    return isProject(item) ? item.items[0] : item;
  }

  // Project items that were separate artworks keep that artwork's own info (title, description, year, category, tools / models),
  // only where it differs from the project's, so items never repeat the project's info
  function fillItemTexts(project, works, onlyFields) {
    if (!isProject(project)) return project;
    // Info a project item can have on its own (everything else always comes from the project)
    const PROJECT_ITEM_FIELDS = ['name', 'description', 'year', 'category', 'dcc', 'renderer'];
    const byKey = new Map();
    (works || []).forEach(w => {
      const key = w !== project && !isProject(w) ? getWorkKey(w) : '';
      if (key) byKey.set(key, w);
    });
    project.items.forEach(it => {
      const src = byKey.get(getWorkKey(it));
      if (!src) return;
      (onlyFields || PROJECT_ITEM_FIELDS).forEach(field => {
        const value = src[field];
        const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
        if (it[field] !== undefined || empty || JSON.stringify(value) === JSON.stringify(project[field])) return;
        it[field] = Array.isArray(value) ? [...value] : value;
      });
    });
    return project;
  }

  function slugify(str) {
    return String(str || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  }

  function projectBadgeHtml(item) {
    return `<span class="project-badge">${PROJECT_ICON} Project &middot; ${item.items.length}</span>`;
  }

  // Each project material becomes a card that carries the project's metadata
  function getProjectEntries(project) {
    const { items, project: slug, ...meta } = project;
    // Each item may override the project's info (title, description, year, category, tools / models)
    return items.map((it, i) => ({
      ...meta,
      ...it,
      file: it.file || '',
      youtube: it.youtube || '',
      name: it.name || project.name,
      description: it.description || project.description,
      year: it.year || project.year,
      _project: project,
      _itemIndex: i
    }));
  }

  // Tool badges for a work (DCC tools + render engine)
  function getBadgesHtml(item) {
    const dccs = getDccList(item).map(d => `<span class="badge-dcc" data-dcc="${escapeHtml(d)}">${escapeHtml(d)}</span>`).join('');
    const rnd = item.renderer ? `<span class="badge-rnd" data-rnd="${escapeHtml(item.renderer)}">${escapeHtml(item.renderer)}</span>` : '';
    return dccs + rnd;
  }
  function showProjectHeader(project) {
    if (!elements.projectHeader) return;
    elements.projectTitle.textContent = project.name || 'Untitled Project';
    const info = [project.category, project.year, `${project.items.length} items`].filter(Boolean)
      .map(t => `<span class="project-info-text">${escapeHtml(t)}</span>`).join('');
    elements.projectInfo.innerHTML = `<span class="project-badge is-inline">${PROJECT_ICON} Project</span>${info}${getBadgesHtml(project)}`;
    elements.projectDesc.textContent = project.description || '';
    elements.projectHeader.hidden = false;
  }

  function openCard(index) {
    const item = state.displayList[index];
    if (!state.openProject && isProject(item)) {
      openProject(item);
    } else {
      openLightbox(index);
    }
  }

  function openProject(project, updateHash = true) {
    state.openProject = project;
    document.body.classList.add('is-project-view');
    showProjectHeader(project);
    renderGallery();
    if (updateHash && location.hash !== `#project=${project.project}`) {
      history.pushState(null, '', `#project=${encodeURIComponent(project.project)}`);
    }
    const top = elements.projectHeader ? elements.projectHeader.getBoundingClientRect().top + window.scrollY - 90 : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function closeProject(updateHash = true) {
    if (!state.openProject) return;
    state.openProject = null;
    document.body.classList.remove('is-project-view');
    if (elements.projectHeader) elements.projectHeader.hidden = true;
    renderGallery();
    if (updateHash && location.hash.startsWith('#project=')) {
      history.pushState(null, '', location.pathname + location.search);
    }
  }

  function syncProjectFromHash() {
    const match = location.hash.match(/^#project=(.+)$/);
    const slug = match ? decodeURIComponent(match[1]) : '';
    const project = slug ? state.works.find(w => isProject(w) && w.project === slug) : null;
    if (project && project !== state.openProject) {
      openProject(project, false);
    } else if (!project && state.openProject) {
      closeProject(false);
    }
  }

  // Helper utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();

