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
    const apiKey = FOLIO_CONFIG.API_KEY || '';

    if (!token && !apiKey) {
      const err = new Error('SIGN_IN_OR_KEY_REQUIRED');
      err.code = 'SIGN_IN_OR_KEY_REQUIRED';
      throw err;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let finalUrl = url;
    const headers = { Accept: 'application/json' };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (apiKey) {
      const sep = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${sep}key=${encodeURIComponent(apiKey)}`;
    }

    try {
      const resp = await fetch(finalUrl, {
        headers,
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
          errMessage = 'Folder not found or not accessible. Make sure the folder link is correct and set to "Anyone with the link can view".';
        } else if (resp.status === 401 || resp.status === 403) {
          if (!token) {
            errMessage = 'This folder requires sign-in or public sharing. Make sure the folder is set to "Anyone with the link can view", or sign in with Google.';
          } else {
            errMessage = 'Access denied. Make sure this folder is shared with your signed-in Google account.';
          }
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
      if (/=s\d+/.test(file.thumbnailLink)) {
        return file.thumbnailLink.replace(/=s\d+/, `=s${size}`);
      }
      return `${file.thumbnailLink}=s${size}`;
    }
    // High-performance public CDN URL for Drive images
    return `https://lh3.googleusercontent.com/d/${file.id}=s${size}`;
  }

  /**
   * Build a full-resolution image URL.
   */
  function fullImageUrl(file) {
    if (file.thumbnailLink) {
      if (/=s\d+/.test(file.thumbnailLink)) {
        return file.thumbnailLink.replace(/=s\d+/, '=s2048');
      }
      return `${file.thumbnailLink}=s2048`;
    }
    return `https://lh3.googleusercontent.com/d/${file.id}=s2048`;
  }

  /**
   * Fetch image data as a Blob URL using Authorization header or fallback to CDN URL.
   */
  async function fetchImageBlob(fileId) {
    const token = Auth.getToken();
    const apiKey = FOLIO_CONFIG.API_KEY || '';

    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (apiKey) {
      url += `&key=${encodeURIComponent(apiKey)}`;
    } else {
      // Direct CDN link for public files
      return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const resp = await fetch(url, { headers, signal: controller.signal });
      if (!resp.ok) {
        return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
      }
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    } catch {
      return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
    } finally {
      clearTimeout(timer);
    }
  }

  return { parseFolderId, getFolderMeta, listImages, imageUrl, fullImageUrl, fetchImageBlob };
})();
