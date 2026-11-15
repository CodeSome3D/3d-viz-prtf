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
  // Primary filter by industry / task. A work can have several ("industries" array in works.js).
  // "Personal" works are shown in their own section below the main grid.
  const INDUSTRIES = ['Industrial machinery', 'Consumer products', 'Exploded views & internals', 'Architecture', 'Personal'];
  const PERSONAL = 'Personal';

  // Interface texts come from js/i18n.js (EN | PL); without it, keys fall back to English-ish defaults
  const I18N = window.I18N || { t: (k) => k, label: (p, v) => v, lang: 'en' };
  const t = (key, vars) => I18N.t(key, vars);

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
        if (Array.isArray(parsed)) {
          const defaultFiles = mapFilesByName(defaultWorks);
          parsed.forEach(item => resolveSavedPaths(item, defaultFiles));
        }
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
              if (isProject(item) && isProject(def)) addMissingProjectItems(merged[merged.length - 1], def);
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
    selectedIndustry: 'all',
    selectedCategory: 'all',
    selectedDcc: 'all',
    selectedRenderer: 'all',
    searchQuery: '',
    sortBy: 'default',
    layout: 'grid',
    currentLightboxIndex: -1,
    lightboxList: [],      // what the lightbox steps through (gallery list or one project's items)
    lightboxProject: null, // { project, galleryList, galleryIndex } while stepping through a project in the lightbox
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

  // Helper: industries of a work (project items inherit the project's)
  function getIndustries(item) {
    if (!item || !Array.isArray(item.industries)) return [];
    return item.industries.filter(Boolean);
  }

  function isPersonal(item) {
    return getIndustries(item).includes(PERSONAL);
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
    personalSection: document.getElementById('personal'),
    personalGrid: document.getElementById('personalGrid'),
    indFilterList: document.getElementById('indFilterList'),
    btnMoreFilters: document.getElementById('btnMoreFilters'),
    btnMoreFiltersLabel: document.getElementById('btnMoreFiltersLabel'),
    secondaryFilters: document.getElementById('secondaryFilters'),
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
    lightboxSeeProject: document.getElementById('lightboxSeeProject'),
    lightboxBackToAll: document.getElementById('lightboxBackToAll'),
    lightboxContext: document.getElementById('lightboxContext'),
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
    initPhoneFilters();
    bindLightboxEvents();
    bindAuthEvents();
    precacheRemainingWorks();
    syncProjectFromHash();
    openOwnerFromUrl();
  }

  // Hidden owner entry that works without a keyboard (phones): open the site with ?owner or #owner.
  // Shows the same password dialog; the marker is removed from the address afterwards.
  function openOwnerFromUrl() {
    let url;
    try { url = new URL(location.href); } catch (e) { return; }
    const viaQuery = url.searchParams.has('owner');
    const viaHash = url.hash === '#owner';
    if (!viaQuery && !viaHash) return;
    url.searchParams.delete('owner');
    if (viaHash) url.hash = '';
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    if (!document.body.classList.contains('is-admin')) openAuthModal();
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
    // Industries / tasks (primary row)
    if (elements.indFilterList) {
      elements.indFilterList.innerHTML = `
        <button type="button" class="chip${state.selectedIndustry === 'all' ? ' active' : ''}" data-ind="all">${escapeHtml(t('filters.all'))}</button>
        ${INDUSTRIES.map(ind => `<button type="button" class="chip${state.selectedIndustry === ind ? ' active' : ''}" data-ind="${escapeHtml(ind)}">${escapeHtml(I18N.label('industry', ind))}</button>`).join('')}
      `;
    }

    // Categories: Archviz, Concept Art, Hard Surface, Product, etc.
    const categories = getAvailableCategories();
    if (elements.catFilterList) {
      elements.catFilterList.innerHTML = `
        <button type="button" class="chip${state.selectedCategory === 'all' ? ' active' : ''}" data-cat="all">${escapeHtml(t('filters.all'))}</button>
        ${categories.map(cat => `<button type="button" class="chip${state.selectedCategory === cat ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(I18N.label('category', cat))}</button>`).join('')}
        ${state.works.some(isProject) ? `<button type="button" class="chip chip-project${state.selectedCategory === PROJECTS_FILTER ? ' active' : ''}" data-cat="${PROJECTS_FILTER}">${escapeHtml(t('filters.projects'))}</button>` : ''}
      `;
    }

    // Fixed allowed DCCs: 3ds Max, Blender, Cinema 4D, Autodesk Fusion, ZBrush
    elements.dccFilterList.innerHTML = `
      <button type="button" class="chip${state.selectedDcc === 'all' ? ' active' : ''}" data-dcc="all">${escapeHtml(t('filters.all'))}</button>
      ${ALLOWED_DCCS.map(dcc => `<button type="button" class="chip${state.selectedDcc === dcc ? ' active' : ''}" data-dcc="${escapeHtml(dcc)}">${escapeHtml(dcc)}</button>`).join('')}
    `;

    // Fixed allowed Renderers: Corona, Cycles, Redshift
    elements.rndFilterList.innerHTML = `
      <button type="button" class="chip${state.selectedRenderer === 'all' ? ' active' : ''}" data-rnd="all">${escapeHtml(t('filters.all'))}</button>
      ${ALLOWED_RENDERERS.map(rnd => `<button type="button" class="chip${state.selectedRenderer === rnd ? ' active' : ''}" data-rnd="${escapeHtml(rnd)}">${escapeHtml(rnd)}</button>`).join('')}
    `;
  }

  // --- FILTERING, SEARCH & SORTING ---
  function applyFilters() {
    const query = state.searchQuery.trim().toLowerCase();

    // A project matches when the project itself or any of its items matches (items can have their own tools / models)
    const matches = (item, owner) => {
      const itemDccs = getDccList(item);

      // Industry filter (a work can belong to several industries)
      if (state.selectedIndustry !== 'all' && !getIndustries(item).includes(state.selectedIndustry)) {
        return false;
      }

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
        const indMatch = getIndustries(item).some(i => i.toLowerCase().includes(query));
        if (!titleMatch && !dccMatch && !rndMatch && !catMatch && !descMatch && !indMatch) {
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
  // Main grid: client / product work. Personal grid (own section below): works with the "Personal" industry.
  // Both grids share one displayList (main first), so lightbox arrows walk through all shown works.
  function renderGallery() {
    let main, personal;
    if (state.openProject) {
      main = getProjectEntries(state.openProject);
      personal = [];
    } else {
      main = state.filteredWorks.filter(w => !isPersonal(w));
      personal = state.filteredWorks.filter(isPersonal);
    }
    state.displayList = [...main, ...personal];

    elements.galleryGrid.innerHTML = main.map((item, index) => cardHtml(item, index)).join('');
    if (elements.personalGrid) {
      elements.personalGrid.innerHTML = personal.map((item, i) => cardHtml(item, main.length + i)).join('');
    }
    if (elements.personalSection) elements.personalSection.hidden = personal.length === 0;
    elements.galleryGrid.hidden = main.length === 0 && personal.length > 0;
    // Only Personal works match: the empty main area should not leave a gap above the Personal section
    elements.galleryGrid.closest('.gallery-container').classList.toggle('is-main-empty', elements.galleryGrid.hidden);
    elements.emptyState.style.display = state.displayList.length === 0 ? 'flex' : 'none';
  }

  function cardHtml(item, index) {
    {
      const dccs = getDccList(item);
      const rnd = item.renderer || 'Corona';
      const name = item.name || 'Untitled Render';
      const year = item.year || '';
      const category = item.category ? I18N.label('category', item.category) : 'Render';
      const project = isProject(item);
      const cover = getCover(item);
      const video = isVideo(cover);
      const fallback = cover.file && !video ? cover.file : getYouTubeThumb(cover);
      // Studio theme: inside an open project the first image is shown large on desktop (see css/studio.css),
      // so on wide screens it loads the full image instead of the 800px thumbnail.
      const feature = Boolean(state.openProject) && index === 0;

      // Badges rendered strictly under the thumbnail in art-details
      const dccBadgesHtml = dccs.map(d => `<span class="badge-dcc" data-dcc="${escapeHtml(d)}">${escapeHtml(d)}</span>`).join('');
      const rndBadgeHtml = `<span class="badge-rnd" data-rnd="${escapeHtml(rnd)}">${escapeHtml(rnd)}</span>`;

      return `
        <article class="art-card${project ? ' is-project' : ''}${feature ? ' is-feature' : ''}" data-index="${index}">
          <div class="art-media-wrap">
            ${feature && cover.file && !video ? `<picture><source media="(min-width: 1025px)" srcset="${escapeHtml(cover.file)}">` : ''}
            <img 
              class="art-img" 
              src="${escapeHtml(getCardImage(item))}" 
              alt="${escapeHtml(getAltText(item))}" 
              ${index < 2 ? 'fetchpriority="high"' : (index >= 4 ? 'loading="lazy"' : '')}
              decoding="async"
              onload="this.closest('.art-media-wrap').classList.add('has-loaded')"
              onerror="if (this.dataset.full !== '1') { this.dataset.full = '1'; this.src = '${escapeHtml(fallback)}'; }"
            >${feature && cover.file && !video ? '</picture>' : ''}
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
              <h3 class="art-title">${cardLinkHtml(item, name, project, video, index)}</h3>
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
    }
  }

  function updateStatusLine() {
    if (elements.resultsCount) {
      elements.resultsCount.textContent = state.filteredWorks.length === state.works.length
        ? t('works.count', { n: state.works.length })
        : t('works.countOf', { n: state.filteredWorks.length, total: state.works.length });
    }

    const hasFilters = state.selectedIndustry !== 'all' ||
      state.selectedCategory !== 'all' ||
      state.selectedDcc !== 'all' ||
      state.selectedRenderer !== 'all' ||
      state.searchQuery.trim() !== '' ||
      state.sortBy !== 'default';

    // "Software & renderer" toggle shows how many of its filters are on
    const secondaryCount = [state.selectedCategory, state.selectedDcc, state.selectedRenderer].filter(v => v !== 'all').length;
    if (elements.btnMoreFiltersLabel) {
      elements.btnMoreFiltersLabel.textContent = secondaryCount ? t('filters.moreCount', { n: secondaryCount }) : t('filters.more');
    }
    if (elements.btnMoreFilters) elements.btnMoreFilters.classList.toggle('has-active', secondaryCount > 0);

    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }
    if (elements.searchClear) {
      elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
    }

    updatePhoneFilters();
  }

  function resetAllFilters() {
    state.selectedIndustry = 'all';
    state.selectedCategory = 'all';
    state.selectedDcc = 'all';
    state.selectedRenderer = 'all';
    state.searchQuery = '';
    state.sortBy = 'default';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'default';

    // Update chips active states
    if (elements.indFilterList) {
      elements.indFilterList.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.ind === 'all');
      });
    }
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

  // --- PHONE FILTERS (bottom sheet) ---
  // On small screens the search box and the chip rows move into a bottom sheet opened by the "Filters" button.
  // The same elements (and their listeners) are reused, so the filter state stays in one place.
  const phoneQuery = window.matchMedia('(max-width: 640px)');
  const sheet = {};

  function isAllChip(chip) {
    return Object.values(chip.dataset).includes('all');
  }

  function initPhoneFilters() {
    sheet.root = document.getElementById('filterSheet');
    sheet.button = document.getElementById('btnFilters');
    if (!sheet.root || !sheet.button) return;
    sheet.panel = sheet.root.querySelector('.filter-sheet-panel');
    sheet.body = document.getElementById('filterSheetBody');
    sheet.label = document.getElementById('btnFiltersLabel');
    sheet.apply = document.getElementById('filterSheetApply');
    sheet.active = document.getElementById('activeFilters');
    sheet.moved = [document.querySelector('.controls-panel .search-wrapper'), document.querySelector('.filter-row-primary'), document.querySelector('.filter-row-unified')]
      .filter(Boolean)
      .map(el => {
        const marker = document.createComment('phone filters');
        el.before(marker);
        return { el, marker };
      });
    sheet.items = [];

    sheet.button.addEventListener('click', openFilterSheet);
    sheet.root.addEventListener('click', (e) => {
      if (e.target.closest('[data-sheet-close]')) closeFilterSheet();
    });
    document.getElementById('filterSheetReset').addEventListener('click', resetAllFilters);
    // Esc / back gesture: let the sheet slide out first, then close the dialog
    sheet.root.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeFilterSheet();
    });
    sheet.active.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-remove]');
      if (chip && sheet.items[chip.dataset.remove]) sheet.items[chip.dataset.remove].remove();
    });

    phoneQuery.addEventListener('change', placePhoneFilters);
    placePhoneFilters();
    updatePhoneFilters();
  }

  function placePhoneFilters() {
    if (phoneQuery.matches) {
      sheet.moved.forEach(({ el }) => sheet.body.appendChild(el));
    } else {
      closeFilterSheet(false);
      sheet.moved.forEach(({ el, marker }) => marker.after(el));
    }
  }

  // The sheet is a modal <dialog>: the browser makes the page inert and keeps focus inside it
  function openFilterSheet() {
    clearTimeout(sheet.closeTimer);
    if (!sheet.root.open) sheet.root.showModal();
    sheet.button.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      sheet.root.classList.add('is-open');
      sheet.root.querySelector('.filter-sheet-close').focus();
    });
  }

  function closeFilterSheet(returnFocus = true) {
    if (!sheet.root || !sheet.root.open) return;
    sheet.root.classList.remove('is-open');
    sheet.button.setAttribute('aria-expanded', 'false');
    // Wait for the slide-out (0.28s in style.css) unless motion is reduced
    clearTimeout(sheet.closeTimer);
    sheet.closeTimer = setTimeout(() => {
      sheet.root.close();
      if (returnFocus) sheet.button.focus();
    }, prefersReducedMotion() ? 0 : 280);
  }

  // Filters button count, "Show N works" and the removable chips under the toolbar
  function updatePhoneFilters() {
    if (!sheet.root) return;
    sheet.items = [];
    document.querySelectorAll('.filter-row-primary .filter-subgroup, .filter-row-unified .filter-subgroup').forEach(group => {
      const chip = group.querySelector('.chip.active');
      if (!chip || isAllChip(chip)) return;
      const allChip = [...group.querySelectorAll('.chip')].find(isAllChip);
      sheet.items.push({ label: chip.textContent.trim(), remove: () => allChip && allChip.click() });
    });
    const query = state.searchQuery.trim();
    if (query) {
      sheet.items.push({
        label: `"${query}"`,
        remove: () => {
          state.searchQuery = '';
          elements.searchInput.value = '';
          applyFilters();
        }
      });
    }

    const count = sheet.items.length;
    sheet.label.textContent = count ? t('filters.count', { n: count }) : t('filters');
    sheet.button.classList.toggle('has-active', count > 0);
    const shown = state.filteredWorks.length;
    sheet.apply.textContent = t('filters.show', { n: shown });
    sheet.active.hidden = count === 0;
    sheet.active.innerHTML = sheet.items.map((it, i) =>
      `<button type="button" class="active-filter-chip" data-remove="${i}" aria-label="${escapeHtml(t('filters.remove', { label: it.label }))}">${escapeHtml(it.label)}<span aria-hidden="true">&#x2715;</span></button>`
    ).join('');
  }

  // --- LIGHTBOX CONTROLLER ---
  // The lightbox walks through its own list: the shown gallery, or (project mode) one project's images and videos.
  // Project mode: "See the whole project" on a project cover; Next after the last item continues with the next work,
  // Previous before the first item returns to the project's cover, "Back to all works" returns to the cover at once.
  function openLightbox(index, list = state.displayList) {
    if (index < 0 || index >= list.length) return;

    state.lightboxList = list;
    state.currentLightboxIndex = index;
    resetZoom();

    updateLightboxContent(list[index]);

    if (!elements.lightboxDialog.open) elements.lightboxDialog.showModal();
  }

  function closeLightbox() {
    stopLightboxVideo();
    elements.lightboxDialog.close();
  }

  function enterLightboxProject() {
    const project = state.lightboxList[state.currentLightboxIndex];
    if (!isProject(project) || state.lightboxProject) return;
    state.lightboxProject = { project, galleryList: state.lightboxList, galleryIndex: state.currentLightboxIndex };
    openLightbox(0, getProjectEntries(project));
    if (elements.lightboxNext) elements.lightboxNext.focus();
  }

  // offset 0: back to the project's cover; +1: the work after the project
  function exitLightboxProject(offset = 0, focusBack = true) {
    const mode = state.lightboxProject;
    if (!mode) return;
    state.lightboxProject = null;
    const total = mode.galleryList.length;
    openLightbox((mode.galleryIndex + offset + total) % total, mode.galleryList);
    if (focusBack && offset === 0 && elements.lightboxSeeProject && !elements.lightboxSeeProject.hidden) {
      elements.lightboxSeeProject.focus();
    }
  }

  function updateLightboxContent(item) {
    // A project in the main gallery shows its cover (first image or video); the info below is the project's
    const media = isProject(item) ? getProjectEntries(item)[0] : item;
    const videoId = getYouTubeId(media.youtube);
    const wrapper = elements.lightboxImg.closest('.lightbox-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
    if (videoId && elements.lightboxVideo) {
      elements.lightboxImg.closest('.lightbox-stage').style.setProperty('--lb-ratio', 16 / 9);
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
    elements.lightboxCounter.textContent = `${state.currentLightboxIndex + 1} / ${state.lightboxList.length}`;
    elements.lightboxTitle.textContent = (item.name || 'Untitled Render') + (isProject(item) ? t('lightbox.projectSuffix', { n: item.items.length }) : '');

    // Project cover in the gallery sequence: offer the whole project; inside a project: the way back
    const inProject = Boolean(state.lightboxProject);
    if (elements.lightboxSeeProject) {
      elements.lightboxSeeProject.hidden = inProject || !isProject(item);
      if (isProject(item)) elements.lightboxSeeProject.textContent = t('lightbox.seeProject', { n: item.items.length });
    }
    if (elements.lightboxBackToAll) {
      elements.lightboxBackToAll.hidden = !inProject;
      elements.lightboxBackToAll.textContent = t('lightbox.backToAll');
    }
    if (elements.lightboxContext) {
      elements.lightboxContext.hidden = !inProject;
      if (inProject) elements.lightboxContext.textContent = t('lightbox.inProject', { name: state.lightboxProject.project.name || '' });
    }

    // DCC Badges (Multiple supported)
    const dccs = getDccList(item);
    elements.lightboxDcc.innerHTML = dccs.map(d =>
      `<span class="badge-dcc" data-dcc="${escapeHtml(d)}">${escapeHtml(d)}</span>`
    ).join('');

    // Renderer Badge
    const rnd = item.renderer || 'Corona';
    elements.lightboxRenderer.textContent = rnd;
    elements.lightboxRenderer.setAttribute('data-rnd', rnd);

    elements.lightboxCategory.textContent = item.category ? I18N.label('category', item.category) : '-';
    elements.lightboxYear.textContent = item.year || '-';
    elements.lightboxDesc.textContent = item.description || t('lightbox.noDesc');
  }

  function navigateLightbox(direction) {
    const list = state.lightboxList;
    const total = list.length;
    let newIndex = state.currentLightboxIndex + direction;

    if (state.lightboxProject) {
      // Leaving the project at either end continues the gallery sequence
      if (newIndex >= total) return exitLightboxProject(1, false);
      if (newIndex < 0) return exitLightboxProject(0, false);
      return openLightbox(newIndex, list);
    }

    if (total <= 1) return;
    if (newIndex < 0) newIndex = total - 1;
    if (newIndex >= total) newIndex = 0;

    openLightbox(newIndex, list);
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

    // Hotkey: Ctrl+Alt+E toggles admin mode (capture phase, so nothing on the page can swallow it).
    // e.code = the physical E key: on Polish layouts Ctrl+Alt is AltGr and e.key becomes 'ę'.
    // Not inside text fields, where AltGr+E is needed to type 'ę'.
    window.addEventListener('keydown', (e) => {
      const key = (e.key || '').toLowerCase();
      const isE = e.code === 'KeyE' || key === 'e' || key === 'ę';
      if (!(e.ctrlKey && e.altKey && isE)) return;
      const target = e.target;
      const typing = target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
      if (typing && key === 'ę') return;
      e.preventDefault();
      toggleAdminMode();
    }, true);

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

    // Industry chip list clicks
    if (elements.indFilterList) {
      elements.indFilterList.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        elements.indFilterList.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.selectedIndustry = chip.dataset.ind;
        applyFilters();
      });
    }

    // "Software & renderer": shows / hides the secondary filter row (always shown in the phone sheet)
    if (elements.btnMoreFilters && elements.secondaryFilters) {
      elements.btnMoreFilters.addEventListener('click', () => {
        const open = !elements.secondaryFilters.classList.contains('is-open');
        elements.secondaryFilters.classList.toggle('is-open', open);
        elements.btnMoreFilters.setAttribute('aria-expanded', String(open));
      });
    }

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
    const grids = [elements.galleryGrid, elements.personalGrid].filter(Boolean);
    const setLayout = (layout) => {
      grids.forEach(grid => { grid.classList.toggle('layout-masonry', layout === 'masonry'); grid.classList.toggle('layout-grid', layout !== 'masonry'); });
    };

    elements.btnLayoutMasonry.addEventListener('click', () => {
      elements.btnLayoutMasonry.classList.add('active');
      elements.btnLayoutGrid.classList.remove('active');
      setLayout('masonry');
    });

    elements.btnLayoutGrid.addEventListener('click', () => {
      elements.btnLayoutGrid.classList.add('active');
      elements.btnLayoutMasonry.classList.remove('active');
      setLayout('grid');
    });

    grids.forEach(grid => {
      // Card clicks (Open Lightbox)
      // (Enter / Space on the card's <button> or <a> also arrive here as clicks)
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.art-card');
        if (!card) return;
        // Ctrl / Cmd / Shift click on a project link: let the browser open it in a new tab
        if (e.target.closest('a.card-link') && (e.ctrlKey || e.metaKey || e.shiftKey)) return;
        e.preventDefault();
        const index = parseInt(card.dataset.index, 10);
        openCard(index);
      });
    });

    // Project sub-gallery: back button, browser back/forward, Esc
    if (elements.projectBack) {
      elements.projectBack.addEventListener('click', () => closeProject(true, true));
    }
    window.addEventListener('hashchange', () => {
      if (location.hash === '#owner') return openOwnerFromUrl();
      syncProjectFromHash();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.openProject && !document.querySelector('dialog[open]')) {
        closeProject(true, true);
      }
    });

    // Email links: the mail app still opens (mailto), and the address is also copied to the clipboard,
    // with a small chip at the bottom, for visitors without a mail program
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="mailto:"]');
      if (!link) return;
      const email = decodeURIComponent(link.getAttribute('href').slice(7).split('?')[0]);
      // Copy failed (blocked clipboard): the chip still shows the address, so it can be copied by hand
      copyText(email).then(done => showCopyChip(t(done ? 'contact.copied' : 'contact.copyManual', { email })));
    });

    // Header links: underline only the section in view (Work, About, Contact); none over the hero or Services
    const navLinks = [...document.querySelectorAll('.nav-actions a.nav-anchor')];
    const spySections = ['work', 'services', 'about', 'contact'].map(id => document.getElementById(id)).filter(Boolean);
    if (navLinks.length && spySections.length) {
      let spyFrame = 0;
      const updateNavSpy = () => {
        spyFrame = 0;
        const line = window.innerHeight * 0.35;
        let current = '';
        spySections.forEach(sec => { if (sec.getBoundingClientRect().top <= line) current = sec.id; });
        const atBottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;
        if (atBottom && window.scrollY > 0) current = 'contact';
        navLinks.forEach(a => {
          const active = a.getAttribute('href') === `#${current}`;
          a.classList.toggle('is-active', active);
          if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      };
      const requestSpy = () => { if (!spyFrame) spyFrame = requestAnimationFrame(updateNavSpy); };
      window.addEventListener('scroll', requestSpy, { passive: true });
      window.addEventListener('resize', requestSpy);
      updateNavSpy();
    }

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
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      });
    }
  }

  function bindLightboxEvents() {
    // Navigation
    elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));
    elements.lightboxClose.addEventListener('click', closeLightbox);
    document.querySelectorAll('[data-lightbox-close]').forEach(btn => btn.addEventListener('click', closeLightbox));

    // Phones: the stage takes the image's proportions (see --lb-ratio in style.css)
    elements.lightboxImg.addEventListener('load', () => {
      const img = elements.lightboxImg;
      if (img.naturalWidth && img.naturalHeight) {
        img.closest('.lightbox-stage').style.setProperty('--lb-ratio', img.naturalWidth / img.naturalHeight);
      }
    });

    // Stop video playback however the dialog gets closed (Esc, light dismiss, close button)
    elements.lightboxDialog.addEventListener('close', () => {
      stopLightboxVideo();
      state.lightboxProject = null;
    });
    if (elements.lightboxSeeProject) elements.lightboxSeeProject.addEventListener('click', enterLightboxProject);
    if (elements.lightboxBackToAll) elements.lightboxBackToAll.addEventListener('click', () => exitLightboxProject(0));

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
      const currentItem = state.lightboxList[state.currentLightboxIndex];
      closeLightbox();
      if (window.PORTFOLIO_EDITOR && window.PORTFOLIO_EDITOR.openWithItem) {
        window.PORTFOLIO_EDITOR.openWithItem(currentItem._project || currentItem, currentItem._itemIndex);
      }
    });
  }

  // EN | PL switch (js/i18n.js): rebuild everything this file renders as text
  document.addEventListener('langchange', () => {
    buildFilterChips();
    applyFilters();
    if (state.openProject) showProjectHeader(state.openProject);
    if (elements.lightboxDialog && elements.lightboxDialog.open && state.lightboxList[state.currentLightboxIndex]) {
      updateLightboxContent(state.lightboxList[state.currentLightboxIndex]);
    }
  });

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
      state.selectedIndustry = 'all';
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
    INDUSTRIES: INDUSTRIES,
    slugify: slugify,
    getWorkKey: getWorkKey,
    fillItemTexts: fillItemTexts,
    getCardImage: getCardImage,
    normalizePath: normalizePath,
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

  // Editor input and old saved copies can hold Windows-style or doubled paths ("images/images\\a\\b.jpg")
  function normalizePath(path) {
    if (!path || /^https?:/i.test(path)) return path;
    let p = String(path).trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.\//, '');
    while (p.startsWith('images/images/')) p = p.slice('images/'.length);
    return p;
  }

  function fileName(path) {
    return String(path || '').split('/').pop().toLowerCase();
  }

  // works.js image paths by file name (file names are unique: thumbnails are keyed by them too)
  function mapFilesByName(works) {
    const map = new Map();
    works.forEach(w => (isProject(w) ? w.items : [w]).forEach(it => {
      if (it && it.file) map.set(fileName(it.file), it.file);
    }));
    return map;
  }

  // A saved copy keeps its order and texts, but its images always take their path from works.js when it has them
  function resolveSavedPaths(item, defaultFiles) {
    if (!item || typeof item !== 'object') return;
    (Array.isArray(item.items) ? item.items : [item]).forEach(it => {
      if (!it || !it.file) return;
      const file = normalizePath(it.file);
      it.file = defaultFiles.get(fileName(file)) || file;
    });
  }

  // Images/videos added to a project in works.js after the browser saved its copy
  function addMissingProjectItems(project, def) {
    const have = new Set(project.items.map(getWorkKey));
    def.items.forEach(it => {
      if (!have.has(getWorkKey(it))) project.items.push({ ...it });
    });
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
    return `<span class="project-badge">${PROJECT_ICON} ${escapeHtml(t('badge.project', { n: item.items.length }))}</span>`;
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
    const info = [project.category ? I18N.label('category', project.category) : '', project.year, t('project.items', { n: project.items.length })].filter(Boolean)
      .map(text => `<span class="project-info-text">${escapeHtml(text)}</span>`).join('');
    elements.projectInfo.innerHTML = `<span class="project-badge is-inline">${PROJECT_ICON} ${escapeHtml(t('project.badge'))}</span>${info}${getBadgesHtml(project)}`;
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
    // Remember where the gallery was, so closing the project returns exactly there
    if (!state.openProject) state.galleryScrollY = window.scrollY;
    state.openProject = project;
    document.body.classList.add('is-project-view');
    showProjectHeader(project);
    renderGallery();
    if (updateHash && location.hash !== `#project=${project.project}`) {
      history.pushState(null, '', `#project=${encodeURIComponent(project.project)}`);
    }
    // No animated scrolling: jump once, only if the project title is not already in view under the sticky bars
    if (elements.projectHeader) {
      const offset = stickyOffset();
      const rect = elements.projectHeader.getBoundingClientRect();
      if (rect.top < offset || rect.top > window.innerHeight * 0.6) {
        jumpTo(rect.top + window.scrollY - offset);
      }
    }
    // Keyboard / screen reader users continue inside the project, not at the top of the page
    if (elements.projectTitle) elements.projectTitle.focus({ preventScroll: true });
  }

  // restoreFocus: put focus back on the project's card (Back button, Esc, browser Back);
  // not when a header link (#about, #contact ...) closed the project, so the page can jump there
  function closeProject(updateHash = true, restoreFocus = false) {
    if (!state.openProject) return;
    const closed = state.openProject;
    state.openProject = null;
    document.body.classList.remove('is-project-view');
    if (elements.projectHeader) elements.projectHeader.hidden = true;
    renderGallery();
    if (updateHash && location.hash.startsWith('#project=')) {
      history.pushState(null, '', location.pathname + location.search);
    }
    // Back to exactly where the gallery was (no animation), unless a header link is taking the page elsewhere
    if (restoreFocus || !location.hash) {
      if (typeof state.galleryScrollY === 'number') jumpTo(state.galleryScrollY);
    }
    if (restoreFocus) {
      const index = state.displayList.indexOf(closed);
      const link = index >= 0 ? document.querySelector(`.art-card[data-index="${index}"] .card-link`) : null;
      if (link) link.focus({ preventScroll: true });
    }
  }

  // Instant scroll that ignores the page-wide "scroll-behavior: smooth" (kept for header links only)
  function jumpTo(top) {
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: 'instant' });
  }

  // Height of what stays stuck at the top (header on wider screens, the toolbar) plus a small gap
  function stickyOffset() {
    let offset = 12;
    document.querySelectorAll('.site-header, .controls-panel').forEach(el => {
      if (getComputedStyle(el).position === 'sticky') offset += el.getBoundingClientRect().height;
    });
    return offset;
  }

  // Clipboard: async API (https / localhost), with the older copy command as a fallback
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const done = document.execCommand('copy');
      area.remove();
      return done;
    } catch (e) {
      return false;
    }
  }

  let copyChipTimer = 0;
  function showCopyChip(message) {
    const chip = document.getElementById('copyChip');
    if (!chip) return;
    chip.textContent = message;
    chip.classList.add('is-visible');
    clearTimeout(copyChipTimer);
    copyChipTimer = setTimeout(() => chip.classList.remove('is-visible'), 3500);
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
  }

  // The card's interactive element: a link for projects (shareable #project=slug), a button otherwise.
  // Its ::after covers the whole card (css/studio.css), so the image is clickable too.
  function cardLinkHtml(item, name, project, video, index) {
    const extra = project ? t('card.project', { n: item.items.length }) : (video ? t('card.video') : '');
    const label = `${escapeHtml(name)}<span class="visually-hidden">${escapeHtml(extra)}</span>`;
    if (project && !state.openProject) {
      return `<a class="card-link" href="#project=${encodeURIComponent(item.project)}" data-index="${index}">${label}</a>`;
    }
    return `<button type="button" class="card-link" data-index="${index}">${label}</button>`;
  }

  function syncProjectFromHash() {
    const match = location.hash.match(/^#project=(.+)$/);
    const slug = match ? decodeURIComponent(match[1]) : '';
    const project = slug ? state.works.find(w => isProject(w) && w.project === slug) : null;
    if (project && project !== state.openProject) {
      openProject(project, false);
    } else if (!project && state.openProject) {
      closeProject(false, !location.hash);
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

