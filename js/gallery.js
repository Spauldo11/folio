/* ═══════════════════════════════════════════
   GALLERY — Masonry Grid & Lightbox
   ═══════════════════════════════════════════ */

const Gallery = (() => {
  let files = [];
  let sortAsc = false;
  let currentLightboxIndex = -1;

  const grid    = document.getElementById('masonry-grid');
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lb-img');
  const lbCaption = document.getElementById('lb-caption');
  const lbCounter = document.getElementById('lb-counter');

  /* ─── Render the masonry grid ─── */
  function render(imageFiles) {
    files = imageFiles;
    grid.innerHTML = '';

    files.forEach((file, i) => {
      const item = document.createElement('article');
      item.className = 'grid-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');
      item.style.animationDelay = `${Math.min(i * 40, 600)}ms`;
      item.dataset.index = i;

      const img = document.createElement('img');
      img.className = 'loading';
      img.alt = file.name;
      img.loading = i < 12 ? 'eager' : 'lazy';

      // Set fetchpriority for LCP candidates (first visible images)
      if (i < 4) {
        img.fetchPriority = 'high';
      }

      img.src = Drive.imageUrl(file, 600);

      img.addEventListener('load', () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
      });

      img.addEventListener('error', () => {
        // Retry with auth header via fetch + blob URL
        _loadWithAuth(file, img);
      });

      const overlay = document.createElement('div');
      overlay.className = 'grid-item__overlay';

      const name = document.createElement('span');
      name.className = 'grid-item__name';
      name.textContent = _cleanFilename(file.name);

      overlay.appendChild(name);
      item.appendChild(img);
      item.appendChild(overlay);
      grid.appendChild(item);

      // Click / Enter to open lightbox
      item.addEventListener('click', () => openLightbox(i));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
      });
    });
  }

  /**
   * Fallback: load image via fetch with Authorization header,
   * then create a blob URL.
   */
  async function _loadWithAuth(file, imgEl) {
    try {
      const token = Auth.getToken();
      if (!token) return;
      const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      imgEl.src = URL.createObjectURL(blob);
    } catch {
      // silently fail — image just won't display
    }
  }

  /**
   * Strip common image extensions from filenames for cleaner display.
   */
  function _cleanFilename(name) {
    return name.replace(/\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i, '');
  }


  /* ─── Sorting ─── */
  function toggleSort() {
    sortAsc = !sortAsc;
    files.sort((a, b) => {
      const dA = new Date(a.createdTime || 0);
      const dB = new Date(b.createdTime || 0);
      return sortAsc ? dA - dB : dB - dA;
    });
    render(files);
    return sortAsc;
  }


  /* ─── Column Count ─── */
  function setColumns(n) {
    document.documentElement.style.setProperty('--cols', n);
  }


  /* ─── Lightbox ─── */
  function openLightbox(index) {
    if (index < 0 || index >= files.length) return;
    currentLightboxIndex = index;
    _updateLightboxContent();
    lightbox.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.close();
    document.body.style.overflow = '';
    // Return focus to the grid item
    const item = grid.querySelector(`[data-index="${currentLightboxIndex}"]`);
    item?.focus();
    currentLightboxIndex = -1;
  }

  function prevPhoto() {
    if (currentLightboxIndex <= 0) return;
    currentLightboxIndex--;
    _updateLightboxContent();
  }

  function nextPhoto() {
    if (currentLightboxIndex >= files.length - 1) return;
    currentLightboxIndex++;
    _updateLightboxContent();
  }

  function _updateLightboxContent() {
    const file = files[currentLightboxIndex];
    if (!file) return;

    lbImg.style.opacity = '0';

    // Use view transition if available
    const update = () => {
      lbImg.src = Drive.fullImageUrl(file);
      lbImg.alt = file.name;
      lbCaption.textContent = _cleanFilename(file.name);
      lbCounter.textContent = `${currentLightboxIndex + 1} / ${files.length}`;
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        update();
        lbImg.style.opacity = '1';
      });
    } else {
      update();
      lbImg.style.opacity = '1';
    }

    // Handle image load error in lightbox
    lbImg.onerror = () => {
      _loadWithAuth(file, lbImg);
    };

    lbImg.onload = () => {
      lbImg.style.opacity = '1';
    };

    // Update nav button states
    document.getElementById('lb-prev').disabled = currentLightboxIndex === 0;
    document.getElementById('lb-next').disabled = currentLightboxIndex === files.length - 1;
  }


  /* ─── Lightbox event wiring ─── */
  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', prevPhoto);
  document.getElementById('lb-next').addEventListener('click', nextPhoto);

  // Click outside the image to close
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  lightbox.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'Escape': closeLightbox(); break;
      case 'ArrowLeft': prevPhoto(); break;
      case 'ArrowRight': nextPhoto(); break;
    }
  });

  // Swipe support for touch devices
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) {
      if (dx > 0) prevPhoto();
      else nextPhoto();
    }
  }, { passive: true });


  return { render, toggleSort, setColumns, openLightbox, closeLightbox };
})();
