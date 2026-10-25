/* ═══════════════════════════════════════════
   APP — Main Controller & Saved Photo Books
   ═══════════════════════════════════════════ */

(async () => {
  const SAVED_FOLDERS_KEY = 'folio_saved_folders_v1';

  /* ─── DOM refs ─── */
  const logoLink           = document.getElementById('logo-link');
  const landing            = document.getElementById('landing');
  const workspace          = document.getElementById('workspace');
  const workspaceAvatar    = document.getElementById('workspace-avatar');
  const workspaceUsername  = document.getElementById('workspace-username');
  const workspaceEmail     = document.getElementById('workspace-email');
  const btnWorkspaceSignout = document.getElementById('btn-workspace-signout');

  const savedFoldersList   = document.getElementById('saved-folders-list');
  const savedFoldersCount  = document.getElementById('saved-folders-count');

  const loadingState       = document.getElementById('loading-state');
  const gallerySection     = document.getElementById('gallery-section');
  const galleryHeading     = document.getElementById('gallery-heading');
  const galleryCount       = document.getElementById('gallery-count');
  const loadingText        = document.getElementById('loading-text');

  const btnSignIn          = document.getElementById('btn-sign-in');
  const btnLandingSign     = document.getElementById('btn-landing-sign-in');
  const btnUserMenu        = document.getElementById('btn-user-menu');
  const userAvatar         = document.getElementById('user-avatar');
  const userName           = document.getElementById('user-name');
  const btnShare           = document.getElementById('btn-share');
  const btnFolderPicker    = document.getElementById('btn-folder-picker');
  const btnSort            = document.getElementById('btn-sort');
  const colSlider          = document.getElementById('col-slider');

  const folderForm         = document.getElementById('folder-form');
  const folderUrlInput     = document.getElementById('folder-url');

  const shareModal         = document.getElementById('share-modal');
  const shareUrl           = document.getElementById('share-url');
  const btnCopyLink        = document.getElementById('btn-copy-link');
  const shareCopied        = document.getElementById('share-copied');
  const shareClose         = document.getElementById('share-close');

  const userPopover        = document.getElementById('user-popover');
  const popoverEmail       = document.getElementById('popover-email');
  const btnSignOut         = document.getElementById('btn-sign-out');

  const toast              = document.getElementById('toast');

  /* ─── State ─── */
  let currentFolderId = null;
  let currentFolderName = '';

  /* ─── Toast helper ─── */
  let toastTimer = null;
  function showToast(msg, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.toggle('toast--error', isError);
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
  }

  /* ─── View switcher ─── */
  function showView(view) {
    landing.hidden        = view !== 'landing';
    workspace.hidden      = view !== 'workspace';
    loadingState.hidden   = view !== 'loading';
    gallerySection.hidden = view !== 'gallery';
  }

  /* ─── Saved Folders Management ─── */
  function getSavedFolders() {
    try {
      const raw = localStorage.getItem(SAVED_FOLDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveFolderRecord(folderId, folderName, photoCount) {
    const folders = getSavedFolders();
    const existingIdx = folders.findIndex(f => f.id === folderId);
    const record = {
      id: folderId,
      name: folderName || 'Untitled Folder',
      photoCount: photoCount || 0,
      updatedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      folders[existingIdx] = record;
    } else {
      folders.unshift(record);
    }

    if (folders.length > 25) folders.length = 25;
    try {
      localStorage.setItem(SAVED_FOLDERS_KEY, JSON.stringify(folders));
    } catch { /* storage full */ }
    renderSavedFolders();
  }

  function removeSavedFolder(folderId) {
    let folders = getSavedFolders();
    folders = folders.filter(f => f.id !== folderId);
    try {
      localStorage.setItem(SAVED_FOLDERS_KEY, JSON.stringify(folders));
    } catch { /* ignore */ }
    renderSavedFolders();
    showToast('Removed photo book');
  }

  function renderSavedFolders() {
    const folders = getSavedFolders();
    savedFoldersCount.textContent = `${folders.length} book${folders.length !== 1 ? 's' : ''}`;
    savedFoldersList.innerHTML = '';

    if (folders.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-saved';
      empty.textContent = 'No photo books saved yet. Paste a Google Drive link above to create your first gallery!';
      savedFoldersList.appendChild(empty);
      return;
    }

    folders.forEach(f => {
      const card = document.createElement('article');
      card.className = 'saved-folder-card';
      card.setAttribute('role', 'listitem');

      const info = document.createElement('div');
      info.className = 'saved-folder-info';
      info.setAttribute('tabindex', '0');
      info.setAttribute('role', 'button');
      info.setAttribute('aria-label', `Open photo book ${f.name}`);

      const icon = document.createElement('span');
      icon.className = 'saved-folder-icon';
      icon.textContent = '📁';

      const meta = document.createElement('div');
      meta.className = 'saved-folder-meta';

      const title = document.createElement('span');
      title.className = 'saved-folder-title';
      title.textContent = f.name;

      const detail = document.createElement('span');
      detail.className = 'saved-folder-detail';
      const dateStr = new Date(f.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      detail.textContent = `${f.photoCount} photo${f.photoCount !== 1 ? 's' : ''} • Last viewed ${dateStr}`;

      meta.appendChild(title);
      meta.appendChild(detail);
      info.appendChild(icon);
      info.appendChild(meta);

      const triggerLoad = () => {
        const url = new URL(window.location);
        url.searchParams.set('folder', f.id);
        history.pushState({}, '', url);
        loadFolder(f.id);
      };

      info.addEventListener('click', triggerLoad);
      info.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerLoad();
        }
      });

      const actions = document.createElement('div');
      actions.className = 'saved-folder-actions';

      const btnOpen = document.createElement('button');
      btnOpen.type = 'button';
      btnOpen.className = 'btn-open-folder';
      btnOpen.textContent = 'Open';
      btnOpen.addEventListener('click', triggerLoad);

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'btn-remove-folder';
      btnRemove.setAttribute('aria-label', `Remove ${f.name}`);
      btnRemove.textContent = '✕';
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSavedFolder(f.id);
      });

      actions.appendChild(btnOpen);
      actions.appendChild(btnRemove);

      card.appendChild(info);
      card.appendChild(actions);
      savedFoldersList.appendChild(card);
    });
  }

  /* ─── Auth state listener ─── */
  Auth.onAuthChange(({ signedIn, userProfile }) => {
    btnSignIn.hidden = signedIn;
    btnUserMenu.hidden = !signedIn;
    btnFolderPicker.hidden = !signedIn;

    if (signedIn) {
      const profile = userProfile || { name: 'User', email: '' };
      const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="%23e8a838"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`;

      userAvatar.src = profile.picture || defaultAvatar;
      userName.textContent = profile.name || 'User';
      popoverEmail.textContent = profile.email || '';

      workspaceAvatar.src = profile.picture || defaultAvatar;
      workspaceUsername.textContent = profile.name || 'Google User';
      workspaceEmail.textContent = profile.email || 'Drive connected';

      renderSavedFolders();

      // If there's a folder in the URL, load it; otherwise show workspace
      const urlFolderId = _getFolderFromURL();
      if (urlFolderId) {
        loadFolder(urlFolderId);
      } else {
        showView('workspace');
      }
    } else {
      showView('landing');
      btnShare.hidden = true;
      currentFolderId = null;
    }
  });

  Auth.onAuthError((errMsg) => {
    showToast(errMsg, true);
  });

  /* ─── Initialise auth ─── */
  try {
    await Auth.init();
  } catch (e) {
    console.error('Failed to initialise auth:', e);
    showToast(e.message || 'Failed to load Google auth.', true);
  }

  // Ensure clean initial UI state if not restored from session
  if (!Auth.isSignedIn()) {
    showView('landing');
    btnSignIn.hidden = false;
    btnUserMenu.hidden = true;
    btnFolderPicker.hidden = true;
    btnShare.hidden = true;
  }

  // Check URL params on initial load
  const initialFolderId = _getFolderFromURL();
  if (initialFolderId) {
    if (Auth.isSignedIn()) {
      loadFolder(initialFolderId);
    } else {
      // Guest opening a shared link on index.html: route directly to standalone photobook
      const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
      window.location.replace(`${basePath}/book.html?folder=${initialFolderId}`);
      return;
    }
  }

  /* ─── Sign in buttons ─── */
  btnSignIn.addEventListener('click', () => Auth.signIn());
  btnLandingSign.addEventListener('click', () => Auth.signIn());

  /* ─── Sign out buttons ─── */
  btnSignOut.addEventListener('click', () => {
    userPopover.hidePopover();
    Auth.signOut();
    showToast('Signed out');
  });

  btnWorkspaceSignout.addEventListener('click', () => {
    Auth.signOut();
    showToast('Signed out');
  });

  /* ─── User menu popover ─── */
  btnUserMenu.addEventListener('click', () => {
    userPopover.togglePopover();
  });

  /* ─── Navigation ─── */
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (Auth.isSignedIn()) {
      showView('workspace');
      btnShare.hidden = true;
      const url = new URL(window.location);
      url.searchParams.delete('folder');
      history.pushState({}, '', url);
    } else {
      showView('landing');
    }
  });

  btnFolderPicker.addEventListener('click', () => {
    showView('workspace');
    btnShare.hidden = true;
    const url = new URL(window.location);
    url.searchParams.delete('folder');
    history.pushState({}, '', url);
    folderUrlInput.focus();
  });

  /* ─── Folder form submission ─── */
  folderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = folderUrlInput.value;
    const folderId = Drive.parseFolderId(raw);
    if (!folderId) {
      showToast('Could not extract a folder ID from that link. Please check the URL.', true);
      return;
    }
    const url = new URL(window.location);
    url.searchParams.set('folder', folderId);
    history.pushState({}, '', url);
    loadFolder(folderId);
  });

  /* ─── Load folder ─── */
  async function loadFolder(folderId) {
    currentFolderId = folderId;
    showView('loading');
    loadingText.textContent = 'Scanning your folder…';

    try {
      // Fetch folder metadata
      const meta = await Drive.getFolderMeta(folderId);
      currentFolderName = meta.name || 'Untitled Folder';
      loadingText.textContent = `Loading photos from "${currentFolderName}"…`;

      // List images
      const images = await Drive.listImages(folderId);

      if (images.length === 0) {
        showToast(`No images found in "${currentFolderName}". Make sure the folder contains JPEG, PNG, or WebP images.`, true);
        showView('workspace');
        return;
      }

      // Automatically persist to Saved Photo Books
      saveFolderRecord(folderId, currentFolderName, images.length);

      // Update gallery header
      galleryHeading.textContent = currentFolderName;
      galleryCount.textContent = `${images.length} photo${images.length !== 1 ? 's' : ''}`;
      document.title = `${currentFolderName} — Folio`;

      // Render gallery
      Gallery.render(images);
      showView('gallery');
      btnShare.hidden = false;

    } catch (err) {
      console.error('Failed to load folder:', err);
      const msg = err.message || 'Failed to load folder';
      showToast(msg, true);
      showView('workspace');
    }
  }

  /* ─── Gallery controls ─── */
  colSlider.addEventListener('input', () => {
    Gallery.setColumns(colSlider.value);
  });

  btnSort.addEventListener('click', () => {
    const asc = Gallery.toggleSort();
    showToast(asc ? 'Sorted: oldest first' : 'Sorted: newest first');
  });

  /* ─── Share ─── */
  btnShare.addEventListener('click', () => {
    if (!currentFolderId) return;
    const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    const shareLink = `${window.location.origin}${basePath}/book.html?folder=${currentFolderId}`;
    shareUrl.value = shareLink;
    shareCopied.hidden = true;
    shareModal.showModal();
  });

  btnCopyLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl.value);
      shareCopied.hidden = false;
      btnCopyLink.textContent = 'Copied!';
      setTimeout(() => { btnCopyLink.textContent = 'Copy'; }, 2000);
    } catch {
      shareUrl.select();
      document.execCommand('copy');
      shareCopied.hidden = false;
    }
  });

  shareClose.addEventListener('click', () => shareModal.close());
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) shareModal.close();
  });

  /* ─── URL parsing ─── */
  function _getFolderFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('folder') || null;
  }

  /* ─── Browser back/forward navigation ─── */
  window.addEventListener('popstate', () => {
    const fid = _getFolderFromURL();
    if (fid && Auth.isSignedIn()) {
      loadFolder(fid);
    } else if (Auth.isSignedIn()) {
      showView('workspace');
      btnShare.hidden = true;
    } else {
      showView('landing');
      btnShare.hidden = true;
    }
  });

})();
