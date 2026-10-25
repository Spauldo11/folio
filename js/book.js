/* ═══════════════════════════════════════════
   BOOK — Standalone Photo Book Controller
   ═══════════════════════════════════════════ */

(async () => {
  const loadingState     = document.getElementById('loading-state');
  const loadingText      = document.getElementById('loading-text');
  const gallerySection   = document.getElementById('gallery-section');
  const bookHeading      = document.getElementById('book-heading');
  const bookCount        = document.getElementById('book-count');
  const colSlider        = document.getElementById('col-slider');
  const btnSort          = document.getElementById('btn-sort');
  const btnFullscreen    = document.getElementById('btn-fullscreen');

  const authModal        = document.getElementById('auth-prompt-modal');
  const btnModalSignIn   = document.getElementById('btn-modal-signin');
  const toast            = document.getElementById('toast');

  let toastTimer = null;
  function showToast(msg, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.toggle('toast--error', isError);
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
  }

  function getFolderId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('folder');
  }

  const folderId = getFolderId();

  if (!folderId) {
    loadingText.textContent = 'No photo book selected. Please open with a valid folder link.';
    return;
  }

  // Initialize auth in background (in case of cached session or private folders)
  try {
    await Auth.init();
  } catch (e) {
    console.warn('[Book] Auth init skipped or failed:', e);
  }

  async function openBook() {
    loadingState.hidden = false;
    gallerySection.hidden = true;
    loadingText.textContent = 'Opening photo book…';

    try {
      // 1. Fetch metadata
      let folderName = 'Photo Book';
      try {
        const meta = await Drive.getFolderMeta(folderId);
        if (meta?.name) folderName = meta.name;
      } catch {
        // Fallback name if folder meta query isn't fully permitted
      }

      bookHeading.textContent = folderName;
      document.title = `${folderName} — Photo Book`;

      // 2. Fetch images
      loadingText.textContent = `Loading photos from "${folderName}"…`;
      const images = await Drive.listImages(folderId);

      if (!images || images.length === 0) {
        loadingText.textContent = 'No photos found in this folder.';
        return;
      }

      bookCount.textContent = `${images.length} photo${images.length !== 1 ? 's' : ''}`;

      // 3. Render gallery
      Gallery.render(images);
      loadingState.hidden = true;
      gallerySection.hidden = false;

    } catch (err) {
      console.error('[Book] Error opening book:', err);
      loadingState.hidden = true;

      if (err.code === 'SIGN_IN_OR_KEY_REQUIRED' || err.message?.includes('sign in')) {
        authModal.showModal();
      } else {
        showToast(err.message || 'Failed to load photo book', true);
        loadingState.hidden = false;
        loadingText.textContent = err.message || 'Could not load photos.';
      }
    }
  }

  // Handle modal sign-in
  btnModalSignIn.addEventListener('click', () => {
    Auth.signIn();
  });

  // When auth changes (e.g. user signs in via modal), retry loading
  Auth.onAuthChange(({ signedIn }) => {
    if (signedIn) {
      authModal.close();
      openBook();
    }
  });

  Auth.onAuthError((msg) => {
    showToast(msg, true);
  });

  // Controls
  colSlider.addEventListener('input', () => {
    Gallery.setColumns(colSlider.value);
  });

  btnSort.addEventListener('click', () => {
    const asc = Gallery.toggleSort();
    showToast(asc ? 'Sorted: oldest first' : 'Sorted: newest first');
  });

  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Start opening
  openBook();
})();
