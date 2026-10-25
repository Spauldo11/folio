/* ═══════════════════════════════════════════
   DRIVE — Google Drive API Interactions
   ═══════════════════════════════════════════ */

const Drive = (() => {

  /**
   * Extract a folder ID from a Google Drive URL or raw ID string.
   * Supports various URL formats:
   *   - https://drive.google.com/drive/folders/ABC123
   *   - https://drive.google.com/drive/u/0/folders/ABC123
   *   - https://drive.google.com/drive/folders/ABC123?usp=sharing
   *   - Plain folder ID: ABC123
   */
  function parseFolderId(input) {
    if (!input) return null;
    const trimmed = input.trim();

    // Try to pull folder ID from a URL
    const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];

    // If it looks like a raw ID (alphanumeric, dashes, underscores)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

    return null;
  }

  /**
   * Fetch metadata for a folder (name, etc).
   */
  async function getFolderMeta(folderId) {
    const resp = await gapi.client.drive.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,shared',
      supportsAllDrives: true,
    });
    return resp.result;
  }

  /**
   * List all image files inside a folder (handles pagination).
   * Returns an array of file objects with { id, name, mimeType, thumbnailLink, createdTime, imageMediaMetadata }.
   */
  async function listImages(folderId) {
    const mimeFilter = FOLIO_CONFIG.IMAGE_MIMES
      .map(m => `mimeType='${m}'`)
      .join(' or ');

    const query = `'${folderId}' in parents and (${mimeFilter}) and trashed=false`;
    const fields = 'nextPageToken, files(id, name, mimeType, thumbnailLink, createdTime, imageMediaMetadata, size)';

    let allFiles = [];
    let pageToken = null;

    do {
      const resp = await gapi.client.drive.files.list({
        q: query,
        fields,
        pageSize: FOLIO_CONFIG.PAGE_SIZE,
        pageToken: pageToken || undefined,
        orderBy: 'createdTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (resp.result.files) {
        allFiles = allFiles.concat(resp.result.files);
      }
      pageToken = resp.result.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Build an image URL that can be loaded in an <img> tag.
   * Uses the Drive thumbnail link with a larger size,
   * or falls back to the content download URL.
   */
  function imageUrl(file, size = 800) {
    // thumbnailLink is something like "https://lh3.googleusercontent.com/drive-viewer/..."
    // We can adjust the size parameter
    if (file.thumbnailLink) {
      return file.thumbnailLink.replace(/=s\d+/, `=s${size}`);
    }
    // Fallback: direct content URL (requires auth)
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

  return { parseFolderId, getFolderMeta, listImages, imageUrl, fullImageUrl };
})();
