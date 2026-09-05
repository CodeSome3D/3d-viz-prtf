/**
 * 3D CGI ARTIST PORTFOLIO — CORE APPLICATION
 * ----------------------------------------------------
 * Handles gallery rendering, real-time filtering, search,
 * sorting, responsive layout switching, and full lightbox interaction.
 */

(function () {
  'use strict';

  // Allowed Filter Values requested by artist
  const ALLOWED_DCCS = ['3ds Max', 'Blender', 'Cinema 4D', 'Autodesk Fusion'];
  const ALLOWED_RENDERERS = ['Corona', 'Cycles', 'Redshift'];

  // State Management
  const state = {
    works: Array.isArray(window.PORTFOLIO_WORKS) ? [...window.PORTFOLIO_WORKS] : [],
    filteredWorks: [],
    selectedDcc: 'all',
    selectedRenderer: 'all',
    searchQuery: '',
    sortBy: 'default',
    layout: 'masonry',
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

  // DOM Elements
  const elements = {
    galleryGrid: document.getElementById('galleryGrid'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    sortSelect: document.getElementById('sortSelect'),
    dccFilterList: document.getElementById('dccFilterList'),
    rndFilterList: document.getElementById('rndFilterList'),
    btnLayoutMasonry: document.getElementById('btnLayoutMasonry'),
    btnLayoutGrid: document.getElementById('btnLayoutGrid'),

    // Lightbox Elements
    lightboxDialog: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxImgContainer: document.getElementById('lightboxImgContainer'),
    lightboxPrev: document.getElementById('lightboxPrev'),
    lightboxNext: document.getElementById('lightboxNext'),
    lightboxClose: document.getElementById('lightboxClose'),
    lightboxCounter: document.getElementById('lightboxCounter'),
    lightboxTitle: document.getElementById('lightboxTitle'),
    lightboxDcc: document.getElementById('lightboxDcc'),
    lightboxRenderer: document.getElementById('lightboxRenderer'),
    lightboxCategory: document.getElementById('lightboxCategory'),
    lightboxYear: document.getElementById('lightboxYear'),
    lightboxDimensions: document.getElementById('lightboxDimensions'),
    lightboxFilename: document.getElementById('lightboxFilename'),
    lightboxDesc: document.getElementById('lightboxDesc'),
    lightboxEditBtn: document.getElementById('lightboxEditBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevelText: document.getElementById('zoomLevelText'),

    // Admin & Toast
    btnToggleAdmin: document.getElementById('btnToggleAdmin'),
    toastContainer: document.getElementById('toastContainer'),

    // Header Stats
    statTotalWorks: document.getElementById('statTotalWorks'),
    statDccCount: document.getElementById('statDccCount'),
    statRndCount: document.getElementById('statRndCount')
  };

  // --- INITIALIZATION ---
  function init() {
    initAdminMode();
    updateHeaderStats();
    buildFilterChips();
    applyFilters();
    bindEvents();
    bindLightboxEvents();
  }

  // --- ADMIN MODE TOGGLE ---
  function initAdminMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAdminParam = urlParams.has('edit') || urlParams.has('admin');
    const isStoredAdmin = localStorage.getItem('portfolio_editor_mode') === 'true';

    if (hasAdminParam || isStoredAdmin) {
      document.body.classList.add('is-admin');
      localStorage.setItem('portfolio_editor_mode', 'true');
    }
  }

  function toggleAdminMode() {
    const isCurrentlyAdmin = document.body.classList.contains('is-admin');
    const nextState = !isCurrentlyAdmin;
    document.body.classList.toggle('is-admin', nextState);
    localStorage.setItem('portfolio_editor_mode', nextState ? 'true' : 'false');

    window.PORTFOLIO_APP.showToast(
      nextState ? 'Owner Mode Enabled (Edit controls visible)' : 'Owner Mode Hidden'
    );
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
    // Fixed allowed DCCs: 3ds Max, Blender, Cinema 4D, Autodesk Fusion
    elements.dccFilterList.innerHTML = `
      <button type="button" class="chip active" data-dcc="all">All Tools</button>
      ${ALLOWED_DCCS.map(dcc => `<button type="button" class="chip" data-dcc="${escapeHtml(dcc)}">${escapeHtml(dcc)}</button>`).join('')}
    `;

    // Fixed allowed Renderers: Corona, Cycles, Redshift
    elements.rndFilterList.innerHTML = `
      <button type="button" class="chip active" data-rnd="all">All Engines</button>
      ${ALLOWED_RENDERERS.map(rnd => `<button type="button" class="chip" data-rnd="${escapeHtml(rnd)}">${escapeHtml(rnd)}</button>`).join('')}
    `;
  }

  // --- FILTERING, SEARCH & SORTING ---
  function applyFilters() {
    const query = state.searchQuery.trim().toLowerCase();

    state.filteredWorks = state.works.filter(item => {
      const itemDccs = getDccList(item);

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
    });

    // Sort
    if (state.sortBy === 'name-asc') {
      state.filteredWorks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (state.sortBy === 'name-desc') {
      state.filteredWorks.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (state.sortBy === 'year-desc') {
      state.filteredWorks.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
    }

    renderGallery();
    updateStatusLine();
  }

  // --- RENDER GALLERY ---
  function renderGallery() {
    if (state.filteredWorks.length === 0) {
      elements.galleryGrid.innerHTML = '';
      elements.emptyState.style.display = 'flex';
      return;
    }

    elements.emptyState.style.display = 'none';

    const cardsHtml = state.filteredWorks.map((item, index) => {
      const dccs = getDccList(item);
      const rnd = item.renderer || 'Corona';
      const name = item.name || 'Untitled Render';
      const year = item.year || '';
      const category = item.category || 'Render';

      // Badges rendered strictly under the thumbnail in art-details
      const dccBadgesHtml = dccs.map(d => `<span class="badge-dcc" data-dcc="${escapeHtml(d)}">${escapeHtml(d)}</span>`).join('');
      const rndBadgeHtml = `<span class="badge-rnd" data-rnd="${escapeHtml(rnd)}">${escapeHtml(rnd)}</span>`;

      return `
        <article class="art-card" data-index="${index}" tabindex="0" role="button" aria-label="${escapeHtml(name)}">
          <div class="art-media-wrap">
            <img 
              class="art-img" 
              src="${escapeHtml(item.file)}" 
              alt="${escapeHtml(name)}" 
              loading="lazy"
              decoding="async"
            >
            <div class="card-hover-overlay">
              <span class="quick-view-badge">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Inspect Artwork
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

    const hasFilters = state.selectedDcc !== 'all' ||
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
    state.selectedDcc = 'all';
    state.selectedRenderer = 'all';
    state.searchQuery = '';
    state.sortBy = 'default';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'default';

    // Update chips active states
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
    if (index < 0 || index >= state.filteredWorks.length) return;

    state.currentLightboxIndex = index;
    resetZoom();

    const item = state.filteredWorks[index];
    updateLightboxContent(item);

    elements.lightboxDialog.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    elements.lightboxDialog.close();
    document.body.style.overflow = '';
  }

  function updateLightboxContent(item) {
    elements.lightboxImg.src = item.file;
    elements.lightboxImg.alt = item.name || 'Render';
    elements.lightboxCounter.textContent = `${state.currentLightboxIndex + 1} / ${state.filteredWorks.length}`;
    elements.lightboxTitle.textContent = item.name || 'Untitled Render';

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
    elements.lightboxFilename.textContent = item.file.split('/').pop();
    elements.lightboxDesc.textContent = item.description || 'No description provided.';

    // Measure dimensions once loaded
    elements.lightboxDimensions.textContent = 'Analyzing...';
    const tempImg = new Image();
    tempImg.onload = function () {
      elements.lightboxDimensions.textContent = `${this.naturalWidth} × ${this.naturalHeight} px`;
    };
    tempImg.src = item.file;
  }

  function navigateLightbox(direction) {
    const total = state.filteredWorks.length;
    if (total <= 1) return;

    let newIndex = state.currentLightboxIndex + direction;
    if (newIndex < 0) newIndex = total - 1;
    if (newIndex >= total) newIndex = 0;

    openLightbox(newIndex);
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

    // Hotkey: Alt+E toggles admin mode
    window.addEventListener('keydown', (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'e') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e')) {
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
      openLightbox(index);
    });

    // Card keyboard trigger (Enter/Space)
    elements.galleryGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.art-card');
        if (card) {
          e.preventDefault();
          const index = parseInt(card.dataset.index, 10);
          openLightbox(index);
        }
      }
    });
  }

  function bindLightboxEvents() {
    // Navigation
    elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));
    elements.lightboxClose.addEventListener('click', closeLightbox);

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
      const currentItem = state.filteredWorks[state.currentLightboxIndex];
      closeLightbox();
      if (window.PORTFOLIO_EDITOR && window.PORTFOLIO_EDITOR.openWithItem) {
        window.PORTFOLIO_EDITOR.openWithItem(currentItem);
      }
    });
  }

  // --- PUBLIC INTERFACE FOR EDITOR SYNC ---
  window.PORTFOLIO_APP = {
    refreshData: function (newWorks) {
      state.works = [...newWorks];
      window.PORTFOLIO_WORKS = state.works;
      updateHeaderStats();
      buildFilterChips();
      applyFilters();
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
