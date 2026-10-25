/* ═══════════════════════════════════════════
   APP — Main Controller
   ═══════════════════════════════════════════ */

(async () => {
  /* ─── DOM refs ─── */
  const landing       = document.getElementById('landing');
  const folderInput   = document.getElementById('folder-input');
  const loadingState  = document.getElementById('loading-state');
  const gallerySection = document.getElementById('gallery-section');
  const galleryHeading = document.getElementById('gallery-heading');
  const galleryCount   = document.getElementById('gallery-count');
  const loadingText    = document.getElementById('loading-text');

  const btnSignIn      = document.getElementById('btn-sign-in');
  const btnLandingSign = document.getElementById('btn-landing-sign-in');
  const btnUserMenu    = document.getElementById('btn-user-menu');
  const userAvatar     = document.getElementById('user-avatar');
  const userName       = document.getElementById('user-name');
  const btnShare       = document.getElementById('btn-share');
  const btnFolderPicker = document.getElementById('btn-folder-picker');
  const btnSort        = document.getElementById('btn-sort');
  const colSlider      = document.getElementById('col-slider');

  const folderForm     = document.getElementById('folder-form');
  const folderUrlInput = document.getElementById('folder-url');

  const shareModal     = document.getElementById('share-modal');
  const shareUrl       = document.getElementById('share-url');
  const btnCopyLink    = document.getElementById('btn-copy-link');
  const shareCopied    = document.getElementById('share-copied');
  const shareClose     = document.getElementById('share-close');

  const userPopover    = document.getElementById('user-popover');
  const popoverEmail   = document.getElementById('popover-email');
  const btnSignOut     = document.getElementById('btn-sign-out');

  const toast          = document.getElementById('toast');

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
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  /* ─── View helpers ─── */
  function showView(view) {
    landing.hidden       = view !== 'landing';
    folderInput.hidden   = view !== 'folder';
    loadingState.hidden  = view !== 'loading';
    gallerySection.hidden = view !== 'gallery';
  }

  /* ─── Auth state listener ─── */
  Auth.onAuthChange(({ signedIn, userProfile }) => {
    btnSignIn.hidden = signedIn;
    btnUserMenu.hidden = !signedIn;
    btnFolderPicker.hidden = !signedIn;

    if (signedIn && userProfile) {
      userAvatar.src = userProfile.picture || '';
      userName.textContent = userProfile.name || 'User';
      popoverEmail.textContent = userProfile.email || '';

      // If there's a folder in the URL, load it; otherwise show folder input
      const urlFolderId = _getFolderFromURL();
      if (urlFolderId) {
        loadFolder(urlFolderId);
      } else {
        showView('folder');
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

  // Check if there's a folder ID in the URL on load (user may need to sign in first)
  const urlFolderId = _getFolderFromURL();
  if (urlFolderId && Auth.isSignedIn()) {
    loadFolder(urlFolderId);
  }

  /* ─── Sign in buttons ─── */
  btnSignIn.addEventListener('click', () => Auth.signIn());
  btnLandingSign.addEventListener('click', () => Auth.signIn());

  /* ─── User menu ─── */
  btnUserMenu.addEventListener('click', () => {
    userPopover.togglePopover();
  });

  btnSignOut.addEventListener('click', () => {
    userPopover.hidePopover();
    Auth.signOut();
    showToast('Signed out');
  });

  /* ─── Folder picker nav button ─── */
  btnFolderPicker.addEventListener('click', () => {
    showView('folder');
    folderUrlInput.focus();
  });

  /* ─── Folder form submission ─── */
  folderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = folderUrlInput.value;
    const folderId = Drive.parseFolderId(raw);
    if (!folderId) {
      showToast('Could not parse a folder ID from that input.', true);
      return;
    }
    // Update URL with folder ID
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
        showToast('No images found in this folder.', true);
        showView('folder');
        return;
      }

      // Update gallery header
      galleryHeading.textContent = currentFolderName;
      galleryCount.textContent = `${images.length} photo${images.length !== 1 ? 's' : ''}`;
      document.title = `${currentFolderName} — Folio`;

      // Render the gallery
      Gallery.render(images);
      showView('gallery');
      btnShare.hidden = false;

    } catch (err) {
      console.error('Failed to load folder:', err);
      const msg = err?.result?.error?.message || err.message || 'Failed to load folder';
      showToast(msg, true);
      showView('folder');
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
    const shareLink = `${window.location.origin}${window.location.pathname}?folder=${currentFolderId}`;
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
      // Fallback
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

  /* ─── Handle browser back/forward ─── */
  window.addEventListener('popstate', () => {
    const fid = _getFolderFromURL();
    if (fid && Auth.isSignedIn()) {
      loadFolder(fid);
    } else if (Auth.isSignedIn()) {
      showView('folder');
      btnShare.hidden = true;
    }
  });

})();
