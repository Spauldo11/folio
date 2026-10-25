/* ═══════════════════════════════════════════
   CONFIG TEMPLATE — Google API Credentials
   ═══════════════════════════════════════════
   1. Copy this file to `js/config.js`
   2. Replace CLIENT_ID with your own Google Cloud
      OAuth 2.0 Web Client ID.
   3. See README.md for full setup instructions.
   ═══════════════════════════════════════════ */

const FOLIO_CONFIG = Object.freeze({
  // OAuth 2.0 Client ID (Web application type)
  // Create at: https://console.cloud.google.com/apis/credentials
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com',

  // Google Cloud API Key (Optional — allows anyone to view shared public folders without signing in!)
  // Create at: https://console.cloud.google.com/apis/credentials -> + Create Credentials -> API key
  API_KEY: '',

  // Google Apps Script Web App URL (Zero-Login public viewing)
  // Create at: https://script.google.com -> Deploy as Web App (Anyone)
  APPS_SCRIPT_URL: '',

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
