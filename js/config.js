/* ═══════════════════════════════════════════
   CONFIG — Google API Credentials
   ═══════════════════════════════════════════
   Replace these with your own Google Cloud
   Console credentials. See README.md for setup.
   ═══════════════════════════════════════════ */

const FOLIO_CONFIG = Object.freeze({
  // OAuth 2.0 Client ID (Web application type)
  // Create at: https://console.cloud.google.com/apis/credentials
  CLIENT_ID: '545626497983-nm2fee24h4ntsne4av1kl00f7id9g496.apps.googleusercontent.com',

  // Google Drive API — read-only scope
  SCOPES: 'https://www.googleapis.com/auth/drive.readonly',

  // Discovery doc for Google Drive API v3
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',

  // Supported image MIME types
  IMAGE_MIMES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
  ],

  // Max results per page when listing Drive files
  PAGE_SIZE: 100,
});
