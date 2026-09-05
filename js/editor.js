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
  const tabEditExisting = document.getElementById('tabEditExisting');
  const tabAddNew = document.getElementById('tabAddNew');
  const panelEditExisting = document.getElementById('panelEditExisting');
  const panelAddNew = document.getElementById('panelAddNew');

  // Edit Existing Form Elements
  const selectWorkItem = document.getElementById('selectWorkItem');
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
  const btnDownloadJs = document.getElementById('btnDownloadJs');
  const btnCopyJs = document.getElementById('btnCopyJs');
  const btnAddNewWork = document.getElementById('btnAddNewWork');
  const btnResetDefaults = document.getElementById('btnResetDefaults');

  let currentEditingItem = null;

  function init() {
    if (!editorDialog) return;

    populateSelectOptions();
    autoDetectGitHubConfig();
    bindEditorEvents();

    // Select first item by default
    if (window.PORTFOLIO_WORKS && window.PORTFOLIO_WORKS.length > 0) {
      loadItemIntoForm(window.PORTFOLIO_WORKS[0]);
    }
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
  }

  function saveCurrentItem() {
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

    previewTitle.textContent = currentEditingItem.name;

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
      window.PORTFOLIO_APP.showToast(`Saved "${currentEditingItem.name}" locally in your browser!`);
    }
  }

  function generateFileContent() {
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

  function switchTab(tab) {
    if (tab === 'addNew') {
      if (tabAddNew) {
        tabAddNew.classList.add('active');
        tabAddNew.setAttribute('aria-selected', 'true');
      }
      if (tabEditExisting) {
        tabEditExisting.classList.remove('active');
        tabEditExisting.setAttribute('aria-selected', 'false');
      }
      if (panelAddNew) panelAddNew.style.display = 'flex';
      if (panelEditExisting) panelEditExisting.style.display = 'none';
      if (btnSaveItem) btnSaveItem.style.display = 'none';
      if (newFieldFile) newFieldFile.focus();
    } else {
      if (tabEditExisting) {
        tabEditExisting.classList.add('active');
        tabEditExisting.setAttribute('aria-selected', 'true');
      }
      if (tabAddNew) {
        tabAddNew.classList.remove('active');
        tabAddNew.setAttribute('aria-selected', 'false');
      }
      if (panelEditExisting) panelEditExisting.style.display = 'flex';
      if (panelAddNew) panelAddNew.style.display = 'none';
      if (btnSaveItem) btnSaveItem.style.display = 'inline-flex';
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
      alert('Please enter an image file name (e.g. 030_NewRender.jpg).');
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

    // Calculate next ID
    const currentWorks = window.PORTFOLIO_WORKS || [];
    const maxNum = currentWorks.reduce((max, w) => {
      const num = parseInt(w.id, 10);
      return !isNaN(num) && num > max ? num : max;
    }, currentWorks.length);
    const nextId = String(maxNum + 1).padStart(3, '0');

    const newItem = {
      id: nextId,
      name: title,
      file: filePath,
      dcc: selectedDccs,
      renderer: renderer,
      category: category,
      year: year,
      description: desc
    };

    currentWorks.push(newItem);

    // Save to localStorage immediately
    try {
      localStorage.setItem('portfolio_saved_works', JSON.stringify(currentWorks));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    // Refresh application & UI
    populateSelectOptions(newItem.id);
    loadItemIntoForm(newItem);
    switchTab('edit');

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(currentWorks);
      window.PORTFOLIO_APP.showToast(`Added "${newItem.name}" to gallery!`);
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

    // Open editor
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

    // Dropdown change
    selectWorkItem.addEventListener('change', (e) => {
      const selected = (window.PORTFOLIO_WORKS || []).find(w => w.id === e.target.value);
      if (selected) {
        loadItemIntoForm(selected);
      }
    });

    // Checkbox styling toggle on change (Edit form)
    if (dccCheckboxGroup) {
      dccCheckboxGroup.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (cb) {
          cb.closest('.dcc-checkbox-label').classList.toggle('is-checked', cb.checked);
        }
      });
    }

    // Toggle GitHub Sync Box
    if (syncHeaderToggle && syncBoxBody) {
      syncHeaderToggle.addEventListener('click', () => {
        syncHeaderToggle.classList.toggle('open');
        syncBoxBody.classList.toggle('open');
      });
    }

    // Save button
    btnSaveItem.addEventListener('click', saveCurrentItem);

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
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
