/* ═══════════════════════════════════════════
   DRIVE — Google Drive API Interactions (Native Fetch)
   ═══════════════════════════════════════════ */

const Drive = (() => {

  /**
   * Extract a folder ID from a Google Drive URL or raw ID string.
   */
  function parseFolderId(input) {
    if (!input) return null;
    const trimmed = input.trim();

    // Standard folders URL: /folders/ABC123
    const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];

    // Direct ID parameter: ?id=ABC123 or &id=ABC123
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) return idParamMatch[1];

    // Raw alphanumeric ID (typically 25+ chars, but allow 10+)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

    return null;
  }

  /**
   * Helper for authenticated Drive API fetch with timeout.
   */
  async function _fetchDriveApi(url, timeoutMs = 15000) {
    const token = Auth.getToken();
    if (!token) {
      throw new Error('Not signed in. Please sign in with your Google account.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!resp.ok) {
        let errMessage = `Google Drive API error (HTTP ${resp.status})`;
        try {
          const errBody = await resp.json();
          if (errBody?.error?.message) {
            errMessage = errBody.error.message;
          }
        } catch { /* ignore JSON parse error */ }

        if (resp.status === 404) {
          errMessage = 'Folder not found or you do not have permission to view it. Make sure the folder is shared with your signed-in Google account.';
        } else if (resp.status === 401) {
          errMessage = 'Session expired. Please sign in again.';
        }
        throw new Error(errMessage);
      }

      return await resp.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Google Drive request timed out after 15 seconds. Please check your connection and try again.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fetch metadata for a folder (name, etc).
   */
  async function getFolderMeta(folderId) {
    const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,shared&supportsAllDrives=true`;
    return await _fetchDriveApi(url);
  }

  /**
   * List all image files inside a folder (handles pagination with a safety cap).
   */
  async function listImages(folderId) {
    const mimeFilter = FOLIO_CONFIG.IMAGE_MIMES
      .map(m => `mimeType='${m}'`)
      .join(' or ');

    const query = `'${folderId}' in parents and (${mimeFilter}) and trashed=false`;
    const fields = 'nextPageToken, files(id, name, mimeType, thumbnailLink, createdTime, imageMediaMetadata, size)';

    let allFiles = [];
    let pageToken = null;
    let pageCount = 0;
    const maxPages = 20; // Cap at 2000 images to prevent infinite loops

    do {
      pageCount++;
      const params = new URLSearchParams({
        q: query,
        fields,
        pageSize: String(FOLIO_CONFIG.PAGE_SIZE || 100),
        orderBy: 'createdTime desc',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
      const data = await _fetchDriveApi(url);

      if (data.files && Array.isArray(data.files)) {
        allFiles = allFiles.concat(data.files);
      }

      pageToken = data.nextPageToken || null;
      if (pageCount >= maxPages) break;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Build an image URL that can be loaded in an <img> tag.
   */
  function imageUrl(file, size = 600) {
    if (file.thumbnailLink) {
      return file.thumbnailLink.replace(/=s\d+/, `=s${size}`);
    }
    return `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  }

  /**
   * Build a full-resolution image URL.
   */
  function fullImageUrl(file) {
    if (file.thumbnailLink) {
      return file.thumbnailLink.replace(/=s\d+/, '=s2048');
    }
    return `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  }

  /**
   * Fetch image data as a Blob URL using Authorization header.
   */
  async function fetchImageBlob(fileId) {
    const token = Auth.getToken();
    if (!token) throw new Error('Not signed in');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Failed to load image (HTTP ${resp.status})`);
      }

      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    } finally {
      clearTimeout(timer);
    }
  }

  return { parseFolderId, getFolderMeta, listImages, imageUrl, fullImageUrl, fetchImageBlob };
})();
