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
  const previewImg = document.getElementById('editorPreviewImg');
  const previewTitle = document.getElementById('editorPreviewTitle');
  const previewFile = document.getElementById('editorPreviewFile');

  // Add New Artwork Form Elements
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

  let currentEditingItem = null;
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
      const label = `${w.id || '—'}: ${w.name || 'Untitled'} (${w.file.split('/').pop()})`;
      const isSelected = selectedId === w.id ? 'selected' : '';
      return `<option value="${w.id}" ${isSelected}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  function getDccArray(item) {
    if (!item) return [];
    if (Array.isArray(item.dcc)) return item.dcc;
    if (typeof item.dcc === 'string' && item.dcc.trim()) return [item.dcc.trim()];
    return [];
  }

  function loadItemIntoForm(item) {
    if (!item) return;
    currentEditingItem = item;

    editFieldTitle.value = item.name || '';

    // Set DCC checkboxes (Multi-select)
    const itemDccs = getDccArray(item).map(d => d.toLowerCase());
    const checkboxes = dccCheckboxGroup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const val = cb.value.toLowerCase();
      const isChecked = itemDccs.some(d => d === val || (val === '3ds max' && d.includes('3ds')));
      cb.checked = isChecked;
      cb.closest('.dcc-checkbox-label').classList.toggle('is-checked', isChecked);
    });

    // Set Renderer dropdown
    if (editFieldRnd) {
      editFieldRnd.value = item.renderer || 'Corona';
    }

    // Set Category dropdown
    if (editFieldCategory) {
      editFieldCategory.value = item.category || 'Archviz';
    }

    // Set Year dropdown
    if (editFieldYear) {
      editFieldYear.value = item.year || '2024';
    }

    editFieldDesc.value = item.description || '';

    previewImg.src = item.file || '';
    previewTitle.textContent = item.name || 'Untitled Render';
    previewFile.textContent = item.file || '';
    selectWorkItem.value = item.id;
    updatePositionControls(item);
  }

  function saveCurrentItem(showToast = true) {
    if (!currentEditingItem) return;

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

    if (previewTitle) previewTitle.textContent = currentEditingItem.name;

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

  function generateFileContent() {
    normalizeWorkIds(window.PORTFOLIO_WORKS);
    const code = `/**
 * PORTFOLIO WORKS DATA
 * ----------------------------------------------------
 * Allowed DCC Tools: "3ds Max", "Blender", "Cinema 4D", "Autodesk Fusion", "ZBrush"
 * Allowed Render Engines: "Corona", "Cycles", "Redshift"
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

      itemEl.innerHTML = `
        <div class="reorder-handle" title="Drag to reorder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>
        <span class="reorder-index">#${index + 1}</span>
        <img class="reorder-thumb" src="${escapeHtml(w.file)}" alt="" loading="lazy">
        <div class="reorder-details">
          <span class="reorder-title">${escapeHtml(w.name || 'Untitled')}</span>
          <span class="reorder-meta">${escapeHtml(w.file)} • ${escapeHtml(w.category || 'Product')}</span>
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

  function handleNewImageFileInput() {
    if (!newFieldFile) return;
    let filename = newFieldFile.value.trim();
    if (!filename) {
      if (newPreviewStrip) newPreviewStrip.style.display = 'none';
      return;
    }

    let filePath = filename;
    if (!filePath.startsWith('images/') && !filePath.startsWith('http')) {
      filePath = `images/${filePath}`;
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
    let rawFile = newFieldFile.value.trim();
    if (!rawFile) {
      alert('Please enter an image file name (e.g. MyRender.jpg).');
      newFieldFile.focus();
      return;
    }

    let filePath = rawFile;
    if (!filePath.startsWith('images/') && !filePath.startsWith('http')) {
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
      name: title,
      file: filePath,
      dcc: selectedDccs,
      renderer: renderer,
      category: category,
      year: year,
      description: desc
    };

    currentWorks.splice(targetIndex, 0, newItem);
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

    const autoSaveChangeFields = [editFieldRnd, editFieldCategory, editFieldYear];
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
    selectWorkItem.addEventListener('change', (e) => {
      saveCurrentItem(false);
      const selected = (window.PORTFOLIO_WORKS || []).find(w => w.id === e.target.value);
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
    openWithItem: function (item) {
      if (!editorDialog) return;
      populateSelectOptions(item.id);
      loadItemIntoForm(item);
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
