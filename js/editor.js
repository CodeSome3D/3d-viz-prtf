/**
 * 3D CGI ARTIST PORTFOLIO — IN-BROWSER METADATA EDITOR & EXPORTER
 * ----------------------------------------------------
 * Allows on-the-fly editing of Name, DCC (multi-select), Renderer,
 * Category, Year, and Description from clean dropdowns.
 */

(function () {
  'use strict';

  const editorDialog = document.getElementById('editorModal');
  const editorClose = document.getElementById('editorClose');
  const btnOpenEditor = document.getElementById('btnOpenEditor');
  const selectWorkItem = document.getElementById('selectWorkItem');

  // Form Fields
  const editFieldTitle = document.getElementById('editFieldTitle');
  const dccCheckboxGroup = document.getElementById('dccCheckboxGroup');
  const editFieldRnd = document.getElementById('editFieldRnd');
  const editFieldCategory = document.getElementById('editFieldCategory');
  const editFieldYear = document.getElementById('editFieldYear');
  const editFieldDesc = document.getElementById('editFieldDesc');
  const previewImg = document.getElementById('editorPreviewImg');
  const previewTitle = document.getElementById('editorPreviewTitle');
  const previewFile = document.getElementById('editorPreviewFile');

  // Buttons
  const btnSaveItem = document.getElementById('btnSaveItem');
  const btnDownloadJs = document.getElementById('btnDownloadJs');
  const btnCopyJs = document.getElementById('btnCopyJs');
  const btnAddNewWork = document.getElementById('btnAddNewWork');

  let currentEditingItem = null;

  function init() {
    if (!editorDialog) return;

    populateSelectOptions();
    bindEditorEvents();

    // Select first item by default
    if (window.PORTFOLIO_WORKS && window.PORTFOLIO_WORKS.length > 0) {
      loadItemIntoForm(window.PORTFOLIO_WORKS[0]);
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

    // Sync with main app
    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(window.PORTFOLIO_WORKS);
      window.PORTFOLIO_APP.showToast(`Saved "${currentEditingItem.name}" metadata!`);
    }
  }

  function generateFileContent() {
    const code = `/**
 * PORTFOLIO WORKS DATA
 * ----------------------------------------------------
 * Configured via on-page metadata editor.
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
      window.PORTFOLIO_APP.showToast('Downloaded works.js! Replace data/works.js with it.');
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

  function addNewArtwork() {
    const filename = prompt('Enter image filename inside images/ folder (e.g. 023_NewRender.jpg):');
    if (!filename || !filename.trim()) return;

    const nextIndex = String((window.PORTFOLIO_WORKS || []).length + 1).padStart(3, '0');
    const newItem = {
      id: nextIndex,
      name: filename.replace(/\.[^/.]+$/, '').replace(/^[0-9]+_/, '').replace(/_/g, ' '),
      file: `images/${filename.trim()}`,
      dcc: ['Blender'],
      renderer: 'Cycles',
      category: 'Archviz',
      year: new Date().getFullYear().toString(),
      description: 'New portfolio artwork render.'
    };

    window.PORTFOLIO_WORKS.push(newItem);
    populateSelectOptions(newItem.id);
    loadItemIntoForm(newItem);

    if (window.PORTFOLIO_APP) {
      window.PORTFOLIO_APP.refreshData(window.PORTFOLIO_WORKS);
      window.PORTFOLIO_APP.showToast(`Added new item #${newItem.id}!`);
    }
  }

  function bindEditorEvents() {
    // Open editor
    if (btnOpenEditor) {
      btnOpenEditor.addEventListener('click', () => {
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

    // Checkbox styling toggle on change
    if (dccCheckboxGroup) {
      dccCheckboxGroup.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"]');
        if (cb) {
          cb.closest('.dcc-checkbox-label').classList.toggle('is-checked', cb.checked);
        }
      });
    }

    // Save button
    btnSaveItem.addEventListener('click', saveCurrentItem);

    // Download button
    btnDownloadJs.addEventListener('click', downloadWorksFile);

    // Copy button
    btnCopyJs.addEventListener('click', copyCodeToClipboard);

    // Add new button
    if (btnAddNewWork) {
      btnAddNewWork.addEventListener('click', addNewArtwork);
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
