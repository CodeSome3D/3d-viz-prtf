/**
 * 3D CGI ARTIST PORTFOLIO — IN-BROWSER METADATA EDITOR & EXPORTER
 * ----------------------------------------------------
 * Allows on-the-fly editing of Name, DCC (multi-select), Renderer,
 * Category, Year, and Description from clean dropdowns.
 *
 * Saves immediately to localStorage so edits survive page refreshes,
 * and allows direct GitHub Commit & Push to GitHub Pages!
 */

(function () {
  'use strict';

  // Modal & Tab Elements
  const editorDialog = document.getElementById('editorModal');
  const editorClose = document.getElementById('editorClose');
  const btnOpenEditor = document.getElementById('btnOpenEditor');
  const btnEditGallery = document.getElementById('btnEditGallery');
  const btnControlsEditGallery = document.getElementById('btnControlsEditGallery');
  const btnReorderAddNew = document.getElementById('btnReorderAddNew');
  const btnBackToReorder = document.getElementById('btnBackToReorder');
  const editorModalTitleText = document.getElementById('editorModalTitleText');
  const tabEditExisting = document.getElementById('tabEditExisting');
  const tabAddNew = document.getElementById('tabAddNew');
  const tabReorder = document.getElementById('tabReorder');
  const panelEditExisting = document.getElementById('panelEditExisting');
  const panelAddNew = document.getElementById('panelAddNew');
  const panelReorder = document.getElementById('panelReorder');

  // Edit Existing Form Elements
  const selectWorkItem = document.getElementById('selectWorkItem');
  const editCurrentPosBadge = document.getElementById('editCurrentPosBadge');
  const btnMoveTop = document.getElementById('btnMoveTop');
  const btnMoveUp = document.getElementById('btnMoveUp');
  const btnMoveDown = document.getElementById('btnMoveDown');
  const btnMoveBottom = document.getElementById('btnMoveBottom');
  const selectJumpPosition = document.getElementById('selectJumpPosition');
  const editFieldTitle = document.getElementById('editFieldTitle');
  const dccCheckboxGroup = document.getElementById('dccCheckboxGroup');
  const editFieldRnd = document.getElementById('editFieldRnd');
  const editFieldCategory = document.getElementById('editFieldCategory');
  const editFieldYear = document.getElementById('editFieldYear');
  const editFieldDesc = document.getElementById('editFieldDesc');
  const editFieldYoutube = document.getElementById('editFieldYoutube');
  const editFieldYoutubeWrap = document.getElementById('editFieldYoutubeWrap');
  const editFieldItems = document.getElementById('editFieldItems');
  const previewImg = document.getElementById('editorPreviewImg');
  const previewTitle = document.getElementById('editorPreviewTitle');
  const previewFile = document.getElementById('editorPreviewFile');

  // Add New Artwork Form Elements
  const newFieldType = document.getElementById('newFieldType');
  const newFieldYoutube = document.getElementById('newFieldYoutube');
  const newFieldYoutubeWrap = document.getElementById('newFieldYoutubeWrap');
  const newFieldFileLabel = document.getElementById('newFieldFileLabel');
  const newFieldFileWrap = document.getElementById('newFieldFileWrap');
  const newFieldItems = document.getElementById('newFieldItems');
  const newFieldItemsWrap = document.getElementById('newFieldItemsWrap');
  const newFieldFile = document.getElementById('newFieldFile');
  const newFieldTitle = document.getElementById('newFieldTitle');
  const newFieldPositionMode = document.getElementById('newFieldPositionMode');
  const newFieldSpecificPosWrap = document.getElementById('newFieldSpecificPosWrap');
  const newFieldSpecificPos = document.getElementById('newFieldSpecificPos');
  const newDccCheckboxGroup = document.getElementById('newDccCheckboxGroup');
  const newFieldRnd = document.getElementById('newFieldRnd');
  const newFieldCategory = document.getElementById('newFieldCategory');
  const newFieldYear = document.getElementById('newFieldYear');
  const newFieldDesc = document.getElementById('newFieldDesc');
  const newPreviewStrip = document.getElementById('newPreviewStrip');
  const newPreviewImg = document.getElementById('newPreviewImg');
  const newPreviewTitleText = document.getElementById('newPreviewTitleText');
  const newPreviewPathText = document.getElementById('newPreviewPathText');
  const btnSubmitNewWork = document.getElementById('btnSubmitNewWork');

  // Reorder Panel Elements
  const reorderList = document.getElementById('reorderList');
  const reorderSearchInput = document.getElementById('reorderSearchInput');
  const reorderCountBadge = document.getElementById('reorderCountBadge');
  const btnReorderReset = document.getElementById('btnReorderReset');

  // GitHub Sync Elements
  const syncHeaderToggle = document.getElementById('syncHeaderToggle');
  const syncBoxBody = document.getElementById('syncBoxBody');
  const ghRepoInput = document.getElementById('ghRepoInput');
  const ghBranchInput = document.getElementById('ghBranchInput');
  const ghTokenInput = document.getElementById('ghTokenInput');
  const btnPushGitHub = document.getElementById('btnPushGitHub');
  const ghSyncStatus = document.getElementById('ghSyncStatus');

  // Buttons
  const btnSaveItem = document.getElementById('btnSaveItem');
  const btnGoToReorder = document.getElementById('btnGoToReorder');
  const btnDownloadJs = document.getElementById('btnDownloadJs');
  const btnCopyJs = document.getElementById('btnCopyJs');
  const btnAddNewWork = document.getElementById('btnAddNewWork');
  const btnResetDefaults = document.getElementById('btnResetDefaults');
  const btnDeleteItem = document.getElementById('btnDeleteItem');

  const editFieldItemsWrap = document.getElementById('editFieldItemsWrap');
  let currentEditingItem = null;
  let editingItemIndex = -1; // >= 0 while one item of a project is being edited
  const ITEM_FIELDS = ['name', 'description', 'year', 'category', 'dcc', 'renderer'];
  let draggedItemIndex = null;

  function init() {
    if (!editorDialog) return;

    normalizeWorkIds(window.PORTFOLIO_WORKS);
    populateSelectOptions();
    populateNewArtworkPositionOptions();
    autoDetectGitHubConfig();
    bindEditorEvents();

    // Select first item by default
    if (window.PORTFOLIO_WORKS && window.PORTFOLIO_WORKS.length > 0) {
      loadItemIntoForm(window.PORTFOLIO_WORKS[0]);
    }
  }

  function normalizeWorkIds(works) {
    if (!Array.isArray(works)) return;
    works.forEach((w, idx) => {
      w.id = String(idx + 1).padStart(3, '0');
    });
  }

  function autoDetectGitHubConfig() {
    if (!ghRepoInput) return;

    const storedRepo = localStorage.getItem('portfolio_gh_repo');
    const storedToken = localStorage.getItem('portfolio_gh_token');
    const storedBranch = localStorage.getItem('portfolio_gh_branch');

    if (storedRepo) ghRepoInput.value = storedRepo;
    if (storedToken && ghTokenInput) ghTokenInput.value = storedToken;
    if (storedBranch && ghBranchInput) ghBranchInput.value = storedBranch;

    // Auto-detect if empty and hosted on github.io
    if (!ghRepoInput.value) {
      const host = window.location.hostname;
      const path = window.location.pathname.replace(/^\/|\/$/g, '');
      if (host.endsWith('.github.io')) {
        const user = host.split('.')[0];
        const repo = path.split('/')[0] || user;
        ghRepoInput.value = `${user}/${repo}`;
      }
    }
  }

  function populateSelectOptions(selectedId = null) {
    const works = window.PORTFOLIO_WORKS || [];
    selectWorkItem.innerHTML = works.map(w => {
      const source = isProject(w) ? `Project, ${w.items.length} items`
        : (w.youtube ? `YouTube ${getYouTubeId(w.youtube)}` : (w.file || '').split('/').pop());
      const label = `${w.id || '—'}: ${w.name || 'Untitled'} (${source})`;
      const isSelected = selectedId === w.id ? 'selected' : '';
      return `<option value="${w.id}" ${isSelected}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  // YouTube helpers live in app.js (loaded first)
  function getYouTubeId(value) {
    return window.PORTFOLIO_APP ? window.PORTFOLIO_APP.getYouTubeId(value) : '';
  }

  function toYouTubeLink(value) {
    const id = getYouTubeId(value);
    return id ? `https://youtu.be/${id}` : '';
  }

  // Image shown for a work in editor previews: its own image, or the YouTube thumbnail for videos without one
  function getPreviewImage(item) {
    if (!item) return '';
    const cover = isProject(item) ? item.items[0] : item;
    if (cover.file) return cover.file;
    return window.PORTFOLIO_APP ? window.PORTFOLIO_APP.getCardImage(cover) : '';
  }

  // Short label for a work's source: image path, YouTube link, or project size
  function getSourceLabel(item) {
    if (!item) return '';
    if (isProject(item)) return `Project #${item.project} (${item.items.length} items)`;
    if (item.youtube && !item.file) return toYouTubeLink(item.youtube) || item.youtube;
    if (item.youtube) return `${item.file} + ${toYouTubeLink(item.youtube)}`;
    return item.file || '';
  }

  // --- PROJECTS (helpers live in app.js) ---
  function isProject(item) {
    return !!(window.PORTFOLIO_APP && window.PORTFOLIO_APP.isProject(item));
  }

  // "images/a.jpg | Optional title" lines <-> [{ file, name }] / [{ youtube, name }]
  function parseMaterials(text) {
    return String(text || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [rawSource, ...rest] = line.split('|');
      const source = rawSource.trim();
      const name = rest.join('|').trim();
      const link = toYouTubeLink(source);
      let entry;
      if (link) {
        entry = { youtube: link };
      } else {
        entry = { file: (source.startsWith('images/') || source.startsWith('http')) ? source : `images/${source}` };
      }
      if (name) entry.name = name;
      return entry;
    });
  }

  function materialsToText(items) {
    return (items || []).map(it => {
      const source = it.youtube ? (toYouTubeLink(it.youtube) || it.youtube) : (it.file || '');
      return it.name ? `${source} | ${it.name}` : source;
    }).join('\n');
  }

  function uniqueProjectSlug(name, exceptItem) {
    const base = window.PORTFOLIO_APP ? window.PORTFOLIO_APP.slugify(name) : 'project';
    const taken = new Set((window.PORTFOLIO_WORKS || []).filter(w => w !== exceptItem && w.project).map(w => w.project));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  // ---- Editing one item of a project ----
  function itemView(project, index) {
    const { items, project: slug, file, youtube, ...meta } = project;
    const it = items[index] || {};
    const copy = obj => JSON.parse(JSON.stringify(obj));
    return {
      ...copy(meta),
      ...copy(it),
      name: it.name || project.name,
      description: it.description || project.description,
      year: it.year || project.year
    };
  }

  // Store only what differs from the project, so the item keeps following the project's info otherwise
  function commitItemView(project, index, view) {
    const it = project.items[index];
    if (!it) return;
    view.name = editFieldTitle.value.trim();
    ITEM_FIELDS.forEach(field => {
      const value = view[field];
      const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      if (empty || JSON.stringify(value) === JSON.stringify(project[field])) {
        delete it[field];
      } else {
        it[field] = Array.isArray(value) ? [...value] : value;
      }
    });
  }

  function updatePartSelect(item) {
    const wrap = document.getElementById('editFieldPartWrap');
    const select = document.getElementById('editFieldPart');
    if (!wrap || !select) return;
    if (!isProject(item)) {
      wrap.style.display = 'none';
      select.innerHTML = '';
      return;
    }
    wrap.style.display = '';
    select.innerHTML = `<option value="-1">Whole project (info shared by all items)</option>` +
      item.items.map((it, i) => {
        const source = it.youtube ? 'YouTube video' : (it.file || '').split('/').pop();
        return `<option value="${i}">Item ${i + 1}: ${escapeHtml(it.name || item.name || '')} (${escapeHtml(source)})</option>`;
      }).join('');
    select.value = String(editingItemIndex);
  }

  // Project items that are artworks already in the gallery take over that artwork's own title, description
  // and year, and the artwork moves into the project instead of staying a separate card
  function adoptExistingWorks(project) {
    const app = window.PORTFOLIO_APP;
    const works = window.PORTFOLIO_WORKS || [];
    if (!app || !app.fillItemTexts || !isProject(project)) return 0;
    app.fillItemTexts(project, [...(window.PORTFOLIO_ORIGINAL_WORKS || []), ...works]);
    const keys = new Set(project.items.map(it => app.getWorkKey(it)));
    let moved = 0;
    for (let i = works.length - 1; i >= 0; i--) {
      const w = works[i];
      if (w !== project && !isProject(w) && keys.has(app.getWorkKey(w))) {
        works.splice(i, 1);
        moved++;
      }
    }
    if (moved) normalizeWorkIds(works);
    return moved;
  }

  // Materials field (Edit tab): 2+ lines make/update a project, 1 line turns a project back into a single work
  function applyMaterials() {
    if (!currentEditingItem || !editFieldItems || editingItemIndex >= 0) return;
    const item = currentEditingItem;
    const previous = isProject(item) ? item.items : [];
    const items = parseMaterials(editFieldItems.value).map(entry => {
      const old = previous.find(p => (entry.youtube ? p.youtube && getYouTubeId(p.youtube) === getYouTubeId(entry.youtube) : p.file === entry.file));
      if (!old) return entry;
      const merged = { ...old, ...entry };
      if (!entry.name) delete merged.name;
      return merged;
    });
    if (items.length >= 2) {
      if (!item.project) item.project = uniqueProjectSlug(item.name, item);
      item.items = items;
      delete item.file;
      delete item.youtube;
      const moved = adoptExistingWorks(item);
      if (moved && window.PORTFOLIO_APP) {
        window.PORTFOLIO_APP.showToast(`${moved} artwork${moved > 1 ? 's' : ''} moved into the project "${item.name}".`);
      }
    } else if (items.length === 1 && isProject(item)) {
      delete item.project;
      delete item.items;
      if (items[0].file) item.file = items[0].file;
      if (items[0].youtube) item.youtube = items[0].youtube;
    } else {
      return;
    }
    saveCurrentItem(false);
    loadItemIntoForm(item);
    renderReorderList();
  }

  function getDccArray(item) {
    if (!item) return [];
    if (Array.isArray(item.dcc)) return item.dcc;
    if (typeof item.dcc === 'string' && item.dcc.trim()) return [item.dcc.trim()];
    return [];
  }

  function loadItemIntoForm(item, itemIndex = -1) {
    if (!item) return;
    currentEditingItem = item;
    editingItemIndex = isProject(item) && itemIndex >= 0 && itemIndex < item.items.length ? itemIndex : -1;
    // One item of a project: the form shows (and saves) that item's own info on top of the project's
    const view = editingItemIndex >= 0 ? itemView(item, editingItemIndex) : item;
    updatePartSelect(item);

    editFieldTitle.value = view.name || '';

    // Set DCC checkboxes (Multi-select)
    const itemDccs = getDccArray(view).map(d => d.toLowerCase());
    const checkboxes = dccCheckboxGroup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const val = cb.value.toLowerCase();
      const isChecked = itemDccs.some(d => d === val || (val === '3ds max' && d.includes('3ds')));
      cb.checked = isChecked;
      cb.closest('.dcc-checkbox-label').classList.toggle('is-checked', isChecked);
    });

    // Set Renderer dropdown
    if (editFieldRnd) {
      editFieldRnd.value = view.renderer || 'Corona';
    }

    // Set Category dropdown
    if (editFieldCategory) {
      editFieldCategory.value = view.category || 'Archviz';
    }

    // Set Year dropdown
    if (editFieldYear) {
      editFieldYear.value = view.year || '2024';
    }

    editFieldDesc.value = view.description || '';
    if (editFieldYoutube) editFieldYoutube.value = view.youtube ? toYouTubeLink(view.youtube) || view.youtube : '';
    if (editFieldYoutubeWrap) editFieldYoutubeWrap.style.display = isProject(item) ? 'none' : 'block';
    if (editFieldItems) {
      editFieldItems.value = isProject(item) ? materialsToText(item.items)
        : materialsToText([{ file: item.file, youtube: item.youtube }].filter(w => w.file || w.youtube));
    }

    previewImg.src = getPreviewImage(view);
    previewTitle.textContent = view.name || 'Untitled Render';
    previewFile.textContent = getSourceLabel(view);
    if (editingItemIndex >= 0) {
      if (editFieldYoutubeWrap) editFieldYoutubeWrap.style.display = 'none';
      if (editFieldItemsWrap) editFieldItemsWrap.style.display = 'none';
    } else if (editFieldItemsWrap) {
      editFieldItemsWrap.style.display = '';
    }
    selectWorkItem.value = item.id;
    updatePositionControls(item);
  }

  function saveCurrentItem(showToast = true) {
    if (!currentEditingItem) return;
    const project = currentEditingItem;
    const itemMode = editingItemIndex >= 0 && isProject(project);
    if (itemMode) currentEditingItem = itemView(project, editingItemIndex);

    currentEditingItem.name = editFieldTitle.value.trim() || 'Untitled Render';

    // Collect checked DCCs
    const checkboxes = dccCheckboxGroup.querySelectorAll('input[type="checkbox"]:checked');
    const selectedDccs = Array.from(checkboxes).map(cb => cb.value);
    currentEditingItem.dcc = selectedDccs.length > 0 ? selectedDccs : ['Blender'];

    // Renderer, Category, Year
    currentEditingItem.renderer = editFieldRnd ? editFieldRnd.value : 'Corona';
    currentEditingItem.category = editFieldCategory ? editFieldCategory.value : 'Archviz';
    currentEditingItem.year = editFieldYear ? editFieldYear.value : '2024';
    currentEditingItem.description = editFieldDesc.value.trim();

    // YouTube link: a valid link makes the work a video; clearing it turns it back into an image
    // (only possible when the work has an image file, otherwise the link is kept)
    if (editFieldYoutube && !isProject(currentEditingItem)) {
      const raw = editFieldYoutube.value.trim();
      const link = toYouTubeLink(raw);
      if (link) {
        currentEditingItem.youtube = link;
      } else if (!raw && currentEditingItem.file) {
        delete currentEditingItem.youtube;
      }
      previewImg.src = getPreviewImage(currentEditingItem);
      previewFile.textContent = getSourceLabel(currentEditingItem);
    }

    if (previewTitle) previewTitle.textContent = currentEditingItem.name;

    if (itemMode) {
      commitItemView(project, editingItemIndex, currentEditingItem);
      currentEditingItem = project;
      updatePartSelect(project);
    }

    // Refresh option title in dropdown
    populateSelectOptions(currentEditingItem.id);

    // Save to localStorage immediately so changes persist on refresh!
    try {
      localStorage.setItem('portfolio_saved_works', JSON.stringify(window.PORTFOLIO_WORKS));
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
    }

    // Sync with main app
    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(window.PORTFOLIO_WORKS);
      if (showToast) {
        window.PORTFOLIO_APP.showToast(`Saved "${currentEditingItem.name}" locally in your browser!`);
      }
    }
  }

  function deleteCurrentItem() {
    if (!currentEditingItem) return;

    if (editingItemIndex >= 0 && isProject(currentEditingItem)) {
      const project = currentEditingItem;
      const it = project.items[editingItemIndex];
      if (project.items.length <= 2) {
        alert('A project needs at least 2 items. To turn it back into a single artwork, leave one line in Project Materials (Whole project).');
        return;
      }
      if (!confirm(`Remove "${it.name || project.name}" from the project "${project.name}"? (The image file stays in the repository.)`)) return;
      project.items.splice(editingItemIndex, 1);
      loadItemIntoForm(project);
      saveCurrentItem(false);
      renderReorderList();
      return;
    }

    const itemName = currentEditingItem.name || 'this artwork';
    if (!confirm(`Delete "${itemName}" from the gallery? (Only the gallery entry is removed, the image file stays in the repository.)`)) {
      return;
    }

    const currentWorks = window.PORTFOLIO_WORKS || [];
    const index = currentWorks.indexOf(currentEditingItem);
    if (index === -1) return;

    currentWorks.splice(index, 1);
    normalizeWorkIds(currentWorks);

    try {
      localStorage.setItem('portfolio_saved_works', JSON.stringify(currentWorks));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(currentWorks);
      window.PORTFOLIO_APP.showToast(`Deleted "${itemName}" from the gallery. Download works.js or push to GitHub to publish.`);
    }

    if (currentWorks.length > 0) {
      const nextItem = currentWorks[Math.min(index, currentWorks.length - 1)];
      populateSelectOptions(nextItem.id);
      loadItemIntoForm(nextItem);
    } else {
      currentEditingItem = null;
      selectWorkItem.innerHTML = '';
    }
    populateNewArtworkPositionOptions();
    renderReorderList();
  }

  function generateFileContent() {
    normalizeWorkIds(window.PORTFOLIO_WORKS);
    const code = `/**
 * PORTFOLIO WORKS DATA
 * ----------------------------------------------------
 * Allowed DCC Tools: "3ds Max", "Blender", "Cinema 4D", "Autodesk Fusion", "ZBrush"
 * Allowed Render Engines: "Corona", "Cycles", "Redshift"
 * YouTube videos: add "youtube": "https://youtu.be/VIDEO_ID" ("file" is then an optional poster image)
 * Projects: "project": "url-slug" + "items": [{ "file": ... } or { "youtube": ... }, ...] (2+ items, first = cover)
 * Last updated: ${new Date().toISOString().split('T')[0]}
 */

window.PORTFOLIO_WORKS = ${JSON.stringify(window.PORTFOLIO_WORKS, null, 2)};
`;
    return code;
  }

  function downloadWorksFile() {
    const code = generateFileContent();
    const blob = new Blob([code], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'works.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.showToast('Downloaded works.js! Replace data/works.js with it and push to GitHub.');
    }
  }

  function copyCodeToClipboard() {
    const code = generateFileContent();
    navigator.clipboard.writeText(code).then(() => {
      if (window.PORTFOLIO_APP) {
        window.PORTFOLIO_APP.showToast('Copied works.js code to clipboard!');
      }
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (window.PORTFOLIO_APP) {
        window.PORTFOLIO_APP.showToast('Copied works.js code to clipboard!');
      }
    });
  }

  async function pushDirectlyToGitHub() {
    const repo = ghRepoInput ? ghRepoInput.value.trim() : '';
    const branch = (ghBranchInput && ghBranchInput.value.trim()) || 'main';
    const token = ghTokenInput ? ghTokenInput.value.trim() : '';

    if (!repo || !token) {
      alert('Please provide your GitHub repository (e.g. yourname/portfolio_rend) and a GitHub Personal Access Token with repo write permissions.');
      return;
    }

    // Store in localStorage for future convenience
    localStorage.setItem('portfolio_gh_repo', repo);
    localStorage.setItem('portfolio_gh_token', token);
    localStorage.setItem('portfolio_gh_branch', branch);

    if (ghSyncStatus) {
      ghSyncStatus.textContent = 'Connecting to GitHub...';
      ghSyncStatus.style.color = '#38bdf8';
    }

    try {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/data/works.js`;

      // 1. Fetch current file SHA
      const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      let sha = null;
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      // 2. Encode UTF-8 content to Base64
      const fileCode = generateFileContent();
      const b64Content = btoa(unescape(encodeURIComponent(fileCode)));

      // 3. Commit file via PUT
      const putPayload = {
        message: 'Update portfolio metadata from web editor',
        content: b64Content,
        branch: branch
      };
      if (sha) {
        putPayload.sha = sha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putPayload)
      });

      if (putRes.ok) {
        if (ghSyncStatus) {
          ghSyncStatus.textContent = '✓ Committed to GitHub! Live on Pages in ~60s.';
          ghSyncStatus.style.color = '#10b981';
        }
        if (window.PORTFOLIO_APP) {
          window.PORTFOLIO_APP.showToast('Successfully committed to GitHub repository!');
        }
      } else {
        const errorData = await putRes.json();
        const msg = errorData.message || 'Error pushing to GitHub';
        if (ghSyncStatus) {
          ghSyncStatus.textContent = `Error: ${msg}`;
          ghSyncStatus.style.color = '#f87171';
        }
      }
    } catch (err) {
      if (ghSyncStatus) {
        ghSyncStatus.textContent = `Failed: ${err.message}`;
        ghSyncStatus.style.color = '#f87171';
      }
    }
  }

  function updatePositionControls(item) {
    const works = window.PORTFOLIO_WORKS || [];
    const index = works.findIndex(w => w.id === (item ? item.id : null));
    if (index === -1) return;

    if (editCurrentPosBadge) {
      editCurrentPosBadge.textContent = `#${index + 1} of ${works.length}`;
    }
    if (btnMoveTop) btnMoveTop.disabled = (index === 0);
    if (btnMoveUp) btnMoveUp.disabled = (index === 0);
    if (btnMoveDown) btnMoveDown.disabled = (index === works.length - 1);
    if (btnMoveBottom) btnMoveBottom.disabled = (index === works.length - 1);

    if (selectJumpPosition) {
      selectJumpPosition.innerHTML = works.map((_, i) => {
        const pos = i + 1;
        const isSel = pos === (index + 1) ? 'selected' : '';
        return `<option value="${pos}" ${isSel}>#${pos}</option>`;
      }).join('');
    }
  }

  function populateNewArtworkPositionOptions() {
    if (!newFieldSpecificPos) return;
    const works = window.PORTFOLIO_WORKS || [];
    newFieldSpecificPos.innerHTML = works.map((w, idx) => {
      const pos = idx + 1;
      const label = `Position #${pos} — Before "${w.name || 'Artwork'}"`;
      return `<option value="${pos}">${escapeHtml(label)}</option>`;
    }).join('') + `<option value="${works.length + 1}" selected>Position #${works.length + 1} — At the very end</option>`;
  }

  function moveArtwork(fromIndex, toIndex, showToast = true) {
    const works = window.PORTFOLIO_WORKS || [];
    if (fromIndex < 0 || fromIndex >= works.length) return;
    if (toIndex < 0 || toIndex >= works.length) return;
    if (fromIndex === toIndex) return;

    const [item] = works.splice(fromIndex, 1);
    works.splice(toIndex, 0, item);
    normalizeWorkIds(works);

    // Save to localStorage immediately
    try {
      localStorage.setItem('portfolio_saved_works', JSON.stringify(works));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    // Refresh application & gallery
    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(works);
      if (showToast) {
        window.PORTFOLIO_APP.showToast(`Moved "${item.name}" to position #${toIndex + 1}!`);
      }
    }

    currentEditingItem = item;
    populateSelectOptions(item.id);
    updatePositionControls(item);
    populateNewArtworkPositionOptions();
    renderReorderList();
  }

  function renderReorderList() {
    if (!reorderList) return;
    const works = window.PORTFOLIO_WORKS || [];
    const query = (reorderSearchInput ? reorderSearchInput.value.toLowerCase().trim() : '');

    if (reorderCountBadge) {
      reorderCountBadge.textContent = `${works.length} artworks`;
    }

    reorderList.innerHTML = '';
    works.forEach((w, index) => {
      const matches = !query ||
        (w.name && w.name.toLowerCase().includes(query)) ||
        (w.file && w.file.toLowerCase().includes(query)) ||
        (w.youtube && String(w.youtube).toLowerCase().includes(query)) ||
        (w.category && w.category.toLowerCase().includes(query));

      if (!matches) return;

      const itemEl = document.createElement('div');
      itemEl.className = 'reorder-item';
      if (currentEditingItem && currentEditingItem.id === w.id) {
        itemEl.classList.add('is-selected');
      }
      itemEl.draggable = true;
      itemEl.dataset.index = index;

      const isFirst = index === 0;
      const isLast = index === works.length - 1;

      itemEl.classList.toggle('is-checked', mergeSelection.has(w));
      itemEl.innerHTML = `
        <input type="checkbox" class="reorder-check" title="Select to merge into a project" ${mergeSelection.has(w) ? 'checked' : ''}>
        <div class="reorder-handle" title="Drag to reorder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>
        <span class="reorder-index">#${index + 1}</span>
        <img class="reorder-thumb" src="${escapeHtml(getPreviewImage(w))}" alt="" loading="lazy">
        <div class="reorder-details">
          <span class="reorder-title">${isProject(w) ? '▣ ' : (w.youtube ? '▶ ' : '')}${escapeHtml(w.name || 'Untitled')}</span>
          <span class="reorder-meta">${escapeHtml(getSourceLabel(w))} • ${escapeHtml(w.category || 'Product')}</span>
        </div>
        <div class="reorder-controls">
          <button type="button" class="btn-icon-sm btn-reorder-top" title="Move to top" ${isFirst ? 'disabled' : ''}>⤒</button>
          <button type="button" class="btn-icon-sm btn-reorder-up" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-icon-sm btn-reorder-down" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-icon-sm btn-reorder-bottom" title="Move to bottom" ${isLast ? 'disabled' : ''}>⤓</button>
          <input type="number" min="1" max="${works.length}" value="${index + 1}" class="reorder-num-input" title="Type position number and press Enter">
        </div>
      `;

      itemEl.querySelector('.btn-reorder-top').addEventListener('click', (e) => {
        e.stopPropagation();
        moveArtwork(index, 0);
      });
      itemEl.querySelector('.btn-reorder-up').addEventListener('click', (e) => {
        e.stopPropagation();
        moveArtwork(index, index - 1);
      });
      itemEl.querySelector('.btn-reorder-down').addEventListener('click', (e) => {
        e.stopPropagation();
        moveArtwork(index, index + 1);
      });
      itemEl.querySelector('.btn-reorder-bottom').addEventListener('click', (e) => {
        e.stopPropagation();
        moveArtwork(index, works.length - 1);
      });

      const check = itemEl.querySelector('.reorder-check');
      check.addEventListener('click', (e) => e.stopPropagation());
      check.addEventListener('change', () => {
        if (check.checked) mergeSelection.add(w); else mergeSelection.delete(w);
        itemEl.classList.toggle('is-checked', check.checked);
        updateMergeBar();
      });

      const numInput = itemEl.querySelector('.reorder-num-input');
      numInput.addEventListener('click', (e) => e.stopPropagation());
      numInput.addEventListener('change', () => {
        const targetPos = parseInt(numInput.value, 10);
        if (!isNaN(targetPos) && targetPos >= 1 && targetPos <= works.length) {
          moveArtwork(index, targetPos - 1);
        } else {
          numInput.value = index + 1;
        }
      });
      numInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') numInput.blur();
      });

      // Quick-select in editor when clicking item
      itemEl.addEventListener('click', () => {
        loadItemIntoForm(w);
        switchTab('edit');
      });

      // HTML5 Drag & Drop
      itemEl.addEventListener('dragstart', (e) => {
        draggedItemIndex = index;
        itemEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });

      itemEl.addEventListener('dragend', () => {
        draggedItemIndex = null;
        itemEl.classList.remove('dragging');
        reorderList.querySelectorAll('.reorder-item').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });

      itemEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        e.dataTransfer.dropEffect = 'move';
        const rect = itemEl.getBoundingClientRect();
        const isTopHalf = (e.clientY - rect.top) < (rect.height / 2);
        itemEl.classList.toggle('drag-over-top', isTopHalf);
        itemEl.classList.toggle('drag-over-bottom', !isTopHalf);
      });

      itemEl.addEventListener('dragleave', () => {
        itemEl.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      itemEl.addEventListener('drop', (e) => {
        e.preventDefault();
        itemEl.classList.remove('drag-over-top', 'drag-over-bottom');
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        const rect = itemEl.getBoundingClientRect();
        const isTopHalf = (e.clientY - rect.top) < (rect.height / 2);
        let targetIdx = isTopHalf ? index : index + 1;
        if (draggedItemIndex < targetIdx) targetIdx--;
        moveArtwork(draggedItemIndex, targetIdx);
      });

      reorderList.appendChild(itemEl);
    });
    updateMergeBar();
  }

  // ---- Merge selected works into one project (Reorder tab) ----
  const mergeSelection = new Set();

  function updateMergeBar() {
    const works = window.PORTFOLIO_WORKS || [];
    mergeSelection.forEach(w => { if (!works.includes(w)) mergeSelection.delete(w); });
    const bar = document.getElementById('mergeBar');
    if (!bar) return;
    const count = mergeSelection.size;
    bar.hidden = count === 0;
    const label = document.getElementById('mergeBarCount');
    if (label) label.textContent = `${count} selected`;
    const btn = document.getElementById('btnMergeProject');
    if (btn) btn.disabled = count < 2;
  }

  // A work as project items: a project gives its own items, a single work becomes one item that keeps its own texts
  function workToItems(w, project) {
    if (isProject(w)) {
      return w.items.map(it => copyOwnInfo({ ...it }, w, project));
    }
    const entry = {};
    if (w.file) entry.file = w.file;
    if (w.youtube) entry.youtube = w.youtube;
    return [copyOwnInfo(entry, w, project)];
  }

  // Give an item the source work's info (title, description, year, category, tools / models) where it differs from the project's
  function copyOwnInfo(entry, source, project) {
    ITEM_FIELDS.forEach(field => {
      const value = source[field];
      const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      if (entry[field] !== undefined || empty || JSON.stringify(value) === JSON.stringify(project[field])) return;
      entry[field] = Array.isArray(value) ? [...value] : value;
    });
    return entry;
  }

  function mergeSelectedIntoProject() {
    const works = window.PORTFOLIO_WORKS || [];
    const selected = works.filter(w => mergeSelection.has(w)); // gallery order: the top-most one is the cover
    if (selected.length < 2) return;

    const first = selected[0];
    const name = prompt(
      `Merge ${selected.length} artworks into one project.\n\n` +
      `The first one ("${first.name || 'Untitled'}") is the cover and keeps its place, category, tools and description; ` +
      `the others are removed from the gallery and become pages of the project (each keeps its own title and description).\n\n` +
      `Project name:`, first.name || 'Untitled Project');
    if (name === null) return;

    // Each item keeps its own info (title, description, year, category, tools / models) where it differs from the project's
    const project = { ...first, name: name.trim() || first.name || 'Untitled Project' };
    const items = selected.flatMap(w => workToItems(w, project));
    if (items.length < 2) return;

    first.name = project.name;
    if (!first.project) first.project = uniqueProjectSlug(first.name, first);
    first.items = items;
    delete first.file;
    delete first.youtube;

    selected.slice(1).forEach(w => works.splice(works.indexOf(w), 1));
    normalizeWorkIds(works);
    mergeSelection.clear();

    try {
      localStorage.setItem('portfolio_saved_works', JSON.stringify(works));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(works);
      window.PORTFOLIO_APP.showToast(`Created project "${first.name}" with ${items.length} items. Download works.js or push to GitHub to publish.`);
    }
    populateSelectOptions(first.id);
    loadItemIntoForm(first);
    populateNewArtworkPositionOptions();
    renderReorderList();
    switchTab('edit');
  }

  function switchTab(tab) {
    const isAddNew = tab === 'addNew';
    const isReorder = tab === 'reorder';
    const isEdit = !isAddNew && !isReorder;

    if (tabEditExisting) {
      tabEditExisting.classList.toggle('active', isEdit);
      tabEditExisting.setAttribute('aria-selected', String(isEdit));
    }
    if (tabAddNew) {
      tabAddNew.classList.toggle('active', isAddNew);
      tabAddNew.setAttribute('aria-selected', String(isAddNew));
    }
    if (tabReorder) {
      tabReorder.classList.toggle('active', isReorder);
      tabReorder.setAttribute('aria-selected', String(isReorder));
    }

    if (panelEditExisting) panelEditExisting.style.display = isEdit ? 'flex' : 'none';
    if (panelAddNew) panelAddNew.style.display = isAddNew ? 'flex' : 'none';
    if (panelReorder) panelReorder.style.display = isReorder ? 'flex' : 'none';

    if (editorModalTitleText) {
      if (isReorder) {
        editorModalTitleText.textContent = 'Edit Gallery & Reorder Artworks';
      } else if (isAddNew) {
        editorModalTitleText.textContent = '+ Add New Artwork to Gallery';
      } else {
        editorModalTitleText.textContent = 'Edit Artwork Metadata';
      }
    }

    if (btnSaveItem) btnSaveItem.style.display = isEdit ? 'inline-flex' : 'none';
    if (btnDeleteItem) btnDeleteItem.style.display = isEdit ? 'inline-flex' : 'none';

    if (isAddNew) {
      populateNewArtworkPositionOptions();
      if (newFieldFile) newFieldFile.focus();
    } else if (isReorder) {
      renderReorderList();
      if (reorderSearchInput) reorderSearchInput.focus();
    } else {
      if (currentEditingItem) updatePositionControls(currentEditingItem);
    }
  }

  function isNewVideo() {
    return !!(newFieldType && newFieldType.value === 'video');
  }

  function isNewProject() {
    return !!(newFieldType && newFieldType.value === 'project');
  }

  function handleNewTypeChange() {
    const video = isNewVideo();
    const project = isNewProject();
    if (newFieldYoutubeWrap) newFieldYoutubeWrap.style.display = video ? 'block' : 'none';
    if (newFieldItemsWrap) newFieldItemsWrap.style.display = project ? 'block' : 'none';
    if (newFieldFileWrap) newFieldFileWrap.style.visibility = project ? 'hidden' : 'visible';
    if (newFieldFileLabel) {
      newFieldFileLabel.textContent = video ? 'Poster Image (optional, in images/)' : 'Image File Name (in images/)';
    }
    if (newFieldFile) {
      newFieldFile.placeholder = video ? 'Leave empty to use the YouTube thumbnail' : 'e.g. category_project-name_01.jpg';
    }
    handleNewImageFileInput();
  }

  function handleNewImageFileInput() {
    if (!newFieldFile) return;
    if (isNewProject()) {
      const items = parseMaterials(newFieldItems ? newFieldItems.value : '');
      if (newPreviewStrip && newPreviewImg && items.length) {
        newPreviewImg.src = getPreviewImage(items[0]);
        if (newPreviewTitleText) newPreviewTitleText.textContent = newFieldTitle.value || 'New Project';
        if (newPreviewPathText) newPreviewPathText.textContent = `Project, ${items.length} item${items.length === 1 ? '' : 's'} (cover: ${getSourceLabel(items[0])})`;
        newPreviewStrip.style.display = 'flex';
      } else if (newPreviewStrip) {
        newPreviewStrip.style.display = 'none';
      }
      return;
    }
    let filename = newFieldFile.value.trim();
    const videoLink = isNewVideo() && newFieldYoutube ? toYouTubeLink(newFieldYoutube.value) : '';
    if (!filename && !videoLink) {
      if (newPreviewStrip) newPreviewStrip.style.display = 'none';
      return;
    }

    let filePath = filename;
    if (filePath && !filePath.startsWith('images/') && !filePath.startsWith('http')) {
      filePath = `images/${filePath}`;
    }
    if (!filename) {
      if (newPreviewStrip && newPreviewImg) {
        newPreviewImg.src = getPreviewImage({ youtube: videoLink });
        if (newPreviewTitleText) newPreviewTitleText.textContent = newFieldTitle.value || 'New Video';
        if (newPreviewPathText) newPreviewPathText.textContent = videoLink;
        newPreviewStrip.style.display = 'flex';
      }
      return;
    }

    // Auto-suggest title if empty or previously auto-generated
    if (newFieldTitle && (!newFieldTitle.value || newFieldTitle.dataset.autoGenerated === 'true')) {
      const base = filename.replace(/^images\//, '').replace(/\.[^/.]+$/, '');
      const cleaned = base.replace(/^[0-9]+_/, '').replace(/_/g, ' ');
      newFieldTitle.value = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      newFieldTitle.dataset.autoGenerated = 'true';
    }

    if (newPreviewStrip && newPreviewImg) {
      newPreviewImg.src = filePath;
      if (newPreviewTitleText) newPreviewTitleText.textContent = newFieldTitle.value || 'New Artwork';
      if (newPreviewPathText) newPreviewPathText.textContent = filePath;
      newPreviewStrip.style.display = 'flex';
    }
  }

  function submitNewArtwork() {
    if (!newFieldFile) return;
    const video = isNewVideo();
    const project = isNewProject();
    const projectItems = project ? parseMaterials(newFieldItems ? newFieldItems.value : '') : [];
    const videoLink = video && newFieldYoutube ? toYouTubeLink(newFieldYoutube.value) : '';
    let rawFile = project ? '' : newFieldFile.value.trim();
    if (project && projectItems.length < 2) {
      alert('A project needs at least 2 materials: one image file or YouTube link per line.');
      if (newFieldItems) newFieldItems.focus();
      return;
    }
    if (project && !(newFieldTitle && newFieldTitle.value.trim())) {
      alert('Please give the project a name.');
      if (newFieldTitle) newFieldTitle.focus();
      return;
    }
    if (video && !videoLink) {
      alert('Please paste a valid YouTube link (e.g. https://youtu.be/VIDEO_ID).');
      if (newFieldYoutube) newFieldYoutube.focus();
      return;
    }
    if (!video && !project && !rawFile) {
      alert('Please enter an image file name (e.g. MyRender.jpg).');
      newFieldFile.focus();
      return;
    }

    let filePath = rawFile;
    if (filePath && !filePath.startsWith('images/') && !filePath.startsWith('http')) {
      filePath = `images/${filePath}`;
    }

    const title = (newFieldTitle && newFieldTitle.value.trim()) || 'New Artwork';

    // Collect DCC tools
    let selectedDccs = [];
    if (newDccCheckboxGroup) {
      const checkedBoxes = newDccCheckboxGroup.querySelectorAll('input[type="checkbox"]:checked');
      selectedDccs = Array.from(checkedBoxes).map(cb => cb.value);
    }
    if (selectedDccs.length === 0) selectedDccs = ['Blender'];

    const renderer = (newFieldRnd && newFieldRnd.value) || 'Cycles';
    const category = (newFieldCategory && newFieldCategory.value) || 'Concept Art';
    const year = (newFieldYear && newFieldYear.value) || String(new Date().getFullYear());
    const desc = (newFieldDesc && newFieldDesc.value.trim()) || 'New portfolio artwork render.';

    const currentWorks = window.PORTFOLIO_WORKS || [];

    // Determine target placement position
    let targetIndex = currentWorks.length; // default 'end'
    const posMode = (newFieldPositionMode && newFieldPositionMode.value) || 'end';
    if (posMode === 'start') {
      targetIndex = 0;
    } else if (posMode === 'specific' && newFieldSpecificPos) {
      const chosenPos = parseInt(newFieldSpecificPos.value, 10);
      if (!isNaN(chosenPos)) {
        targetIndex = Math.max(0, Math.min(currentWorks.length, chosenPos - 1));
      }
    }

    const newItem = {
      id: '000', // Re-indexed immediately below
      name: title
    };
    if (project) {
      newItem.project = uniqueProjectSlug(title);
      newItem.items = projectItems;
    }
    if (filePath) newItem.file = filePath;
    if (videoLink) newItem.youtube = videoLink;
    Object.assign(newItem, {
      dcc: selectedDccs,
      renderer: renderer,
      category: category,
      year: year,
      description: desc
    });

    currentWorks.splice(targetIndex, 0, newItem);
    if (project) adoptExistingWorks(newItem);
    normalizeWorkIds(currentWorks);

    // Save to localStorage immediately
    try {
      localStorage.setItem('portfolio_saved_works', JSON.stringify(currentWorks));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    // Refresh application & UI
    populateSelectOptions(newItem.id);
    updatePositionControls(newItem);
    populateNewArtworkPositionOptions();
    loadItemIntoForm(newItem);
    switchTab('reorder');

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(currentWorks);
      window.PORTFOLIO_APP.showToast(`Added "${newItem.name}" at position #${targetIndex + 1}!`);
    }

    // Reset add form fields
    newFieldFile.value = '';
    if (newFieldYoutube) newFieldYoutube.value = '';
    if (newFieldItems) newFieldItems.value = '';
    if (newFieldTitle) {
      newFieldTitle.value = '';
      delete newFieldTitle.dataset.autoGenerated;
    }
    if (newFieldDesc) newFieldDesc.value = '';
    if (newPreviewStrip) newPreviewStrip.style.display = 'none';
  }

  function bindEditorEvents() {
    // Tab switching
    if (tabEditExisting) {
      tabEditExisting.addEventListener('click', () => switchTab('edit'));
    }
    if (tabAddNew) {
      tabAddNew.addEventListener('click', () => switchTab('addNew'));
    }
    if (tabReorder) {
      tabReorder.addEventListener('click', () => switchTab('reorder'));
    }

    // Position controls in Edit Form
    if (btnMoveTop) {
      btnMoveTop.addEventListener('click', () => {
        const works = window.PORTFOLIO_WORKS || [];
        const idx = works.indexOf(currentEditingItem);
        if (idx > -1) moveArtwork(idx, 0);
      });
    }
    if (btnMoveUp) {
      btnMoveUp.addEventListener('click', () => {
        const works = window.PORTFOLIO_WORKS || [];
        const idx = works.indexOf(currentEditingItem);
        if (idx > 0) moveArtwork(idx, idx - 1);
      });
    }
    if (btnMoveDown) {
      btnMoveDown.addEventListener('click', () => {
        const works = window.PORTFOLIO_WORKS || [];
        const idx = works.indexOf(currentEditingItem);
        if (idx > -1 && idx < works.length - 1) moveArtwork(idx, idx + 1);
      });
    }
    if (btnMoveBottom) {
      btnMoveBottom.addEventListener('click', () => {
        const works = window.PORTFOLIO_WORKS || [];
        const idx = works.indexOf(currentEditingItem);
        if (idx > -1 && idx < works.length - 1) moveArtwork(idx, works.length - 1);
      });
    }
    if (selectJumpPosition) {
      selectJumpPosition.addEventListener('change', (e) => {
        const works = window.PORTFOLIO_WORKS || [];
        const idx = works.indexOf(currentEditingItem);
        const targetPos = parseInt(e.target.value, 10);
        if (idx > -1 && !isNaN(targetPos) && targetPos >= 1 && targetPos <= works.length) {
          moveArtwork(idx, targetPos - 1);
        }
      });
    }

    // Position mode toggle in Add New Form
    if (newFieldPositionMode) {
      newFieldPositionMode.addEventListener('change', () => {
        if (newFieldSpecificPosWrap) {
          newFieldSpecificPosWrap.style.display = newFieldPositionMode.value === 'specific' ? 'block' : 'none';
        }
      });
    }

    // Reorder panel search
    const btnMergeProject = document.getElementById('btnMergeProject');
    if (btnMergeProject) {
      btnMergeProject.addEventListener('click', mergeSelectedIntoProject);
    }
    const btnMergeClear = document.getElementById('btnMergeClear');
    if (btnMergeClear) {
      btnMergeClear.addEventListener('click', () => {
        mergeSelection.clear();
        renderReorderList();
      });
    }

    if (reorderSearchInput) {
      reorderSearchInput.addEventListener('input', renderReorderList);
    }

    // Reorder panel reset button
    if (btnReorderReset) {
      btnReorderReset.addEventListener('click', () => {
        if (confirm('Reset gallery order back to default repository order?')) {
          if (window.PORTFOLIO_APP && window.PORTFOLIO_APP.resetToDefaults) {
            window.PORTFOLIO_APP.resetToDefaults();
          }
        }
      });
    }

    // Real-time input handling for Add New Artwork
    if (newFieldFile) {
      newFieldFile.addEventListener('input', handleNewImageFileInput);
    }
    if (newFieldType) {
      newFieldType.addEventListener('change', handleNewTypeChange);
    }
    if (newFieldYoutube) {
      newFieldYoutube.addEventListener('input', handleNewImageFileInput);
    }
    if (newFieldItems) {
      newFieldItems.addEventListener('input', handleNewImageFileInput);
    }
    if (editFieldItems) {
      editFieldItems.addEventListener('change', applyMaterials);
    }
    if (newFieldTitle) {
      newFieldTitle.addEventListener('input', () => {
        delete newFieldTitle.dataset.autoGenerated;
        if (newPreviewTitleText) {
          newPreviewTitleText.textContent = newFieldTitle.value || 'New Artwork';
        }
      });
    }

    // DCC Checkbox styling for Add New form
    if (newDccCheckboxGroup) {
      newDccCheckboxGroup.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (cb) {
          cb.closest('.dcc-checkbox-label').classList.toggle('is-checked', cb.checked);
        }
      });
    }

    // Submit Add New Artwork button
    if (btnSubmitNewWork) {
      btnSubmitNewWork.addEventListener('click', submitNewArtwork);
    }

    // Open Edit Gallery button (in header)
    if (btnEditGallery) {
      btnEditGallery.addEventListener('click', () => {
        switchTab('reorder');
        editorDialog.showModal();
      });
    }

    // Open Edit Gallery button (in controls toolbar)
    if (btnControlsEditGallery) {
      btnControlsEditGallery.addEventListener('click', () => {
        switchTab('reorder');
        editorDialog.showModal();
      });
    }

    // Quick Add button in Reorder Panel
    if (btnReorderAddNew) {
      btnReorderAddNew.addEventListener('click', () => {
        switchTab('addNew');
      });
    }

    // Back to Reorder button in Add Artwork Panel
    if (btnBackToReorder) {
      btnBackToReorder.addEventListener('click', () => {
        switchTab('reorder');
      });
    }

    // Open editor (Metadata)
    if (btnOpenEditor) {
      btnOpenEditor.addEventListener('click', () => {
        switchTab('edit');
        editorDialog.showModal();
      });
    }

    // Close editor
    if (editorClose) {
      editorClose.addEventListener('click', () => {
        editorDialog.close();
      });
    }

    // Light dismiss
    editorDialog.addEventListener('click', (e) => {
      if (e.target === editorDialog) {
        editorDialog.close();
      }
    });

    // Auto-save on field changes in Edit form so edits are never lost
    const autoSaveInputFields = [editFieldTitle, editFieldDesc];
    autoSaveInputFields.forEach(field => {
      if (field) {
        field.addEventListener('input', () => saveCurrentItem(false));
      }
    });

    const autoSaveChangeFields = [editFieldRnd, editFieldCategory, editFieldYear, editFieldYoutube];
    autoSaveChangeFields.forEach(field => {
      if (field) {
        field.addEventListener('change', () => saveCurrentItem(false));
      }
    });

    // Checkbox styling toggle & auto-save on change (Edit form)
    if (dccCheckboxGroup) {
      dccCheckboxGroup.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (cb) {
          cb.closest('.dcc-checkbox-label').classList.toggle('is-checked', cb.checked);
        }
        saveCurrentItem(false);
      });
    }

    // Dropdown change: auto-save current item before switching
    const editFieldPart = document.getElementById('editFieldPart');
    if (editFieldPart) {
      editFieldPart.addEventListener('change', (e) => {
        const index = parseInt(e.target.value, 10); // read first: saving re-renders this dropdown
        saveCurrentItem(false);
        loadItemIntoForm(currentEditingItem, isNaN(index) ? -1 : index);
      });
    }

    selectWorkItem.addEventListener('change', (e) => {
      const targetId = e.target.value; // read first: saving re-renders this dropdown
      saveCurrentItem(false);
      const selected = (window.PORTFOLIO_WORKS || []).find(w => w.id === targetId);
      if (selected) {
        loadItemIntoForm(selected);
      }
    });

    // Toggle GitHub Sync Box
    if (syncHeaderToggle && syncBoxBody) {
      syncHeaderToggle.addEventListener('click', () => {
        syncHeaderToggle.classList.toggle('open');
        syncBoxBody.classList.toggle('open');
      });
    }

    // Manual Save button (shows explicit toast feedback)
    btnSaveItem.addEventListener('click', () => saveCurrentItem(true));

    // Download button
    btnDownloadJs.addEventListener('click', downloadWorksFile);

    // Copy button
    btnCopyJs.addEventListener('click', copyCodeToClipboard);

    // Direct GitHub Push button
    if (btnPushGitHub) {
      btnPushGitHub.addEventListener('click', pushDirectlyToGitHub);
    }

    // Delete current artwork
    if (btnDeleteItem) {
      btnDeleteItem.addEventListener('click', deleteCurrentItem);
    }

    // Reset to defaults
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        if (confirm('Revert all local changes and reset back to the default repository data?')) {
          if (window.PORTFOLIO_APP && window.PORTFOLIO_APP.resetToDefaults) {
            window.PORTFOLIO_APP.resetToDefaults();
          }
        }
      });
    }

    // Footer "+ Add New Image" button switches to Add New tab
    if (btnAddNewWork) {
      btnAddNewWork.addEventListener('click', () => switchTab('addNew'));
    }

    // Footer "↕ Reorder Gallery" button switches to Reorder tab
    if (btnGoToReorder) {
      btnGoToReorder.addEventListener('click', () => switchTab('reorder'));
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Public API
  window.PORTFOLIO_EDITOR = {
    openWithItem: function (item, itemIndex = -1) {
      if (!editorDialog) return;
      populateSelectOptions(item.id);
      loadItemIntoForm(item, typeof itemIndex === 'number' ? itemIndex : -1);
      editorDialog.showModal();
    },
    openReorder: function () {
      if (!editorDialog) return;
      switchTab('reorder');
      editorDialog.showModal();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
