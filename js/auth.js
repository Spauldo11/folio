/* ═══════════════════════════════════════════
   AUTH — Google Identity Services
   ═══════════════════════════════════════════ */

const Auth = (() => {
  let tokenClient = null;
  let accessToken = null;
  let userProfile = null;
  let gapiReady = false;

  /** Listeners for auth state changes */
  const listeners = new Set();

  function onAuthChange(fn) {
    listeners.add(fn);
  }

  function _notify() {
    console.log('[Auth] notify — signedIn:', !!accessToken, 'profile:', userProfile?.name);
    for (const fn of listeners) {
      try { fn({ signedIn: !!accessToken, userProfile, accessToken }); }
      catch (e) { console.error('[Auth] listener error:', e); }
    }
  }

  /**
   * Wait for the Google Identity Services script to load.
   */
  function _waitForGIS() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) { resolve(); return; }
      let waited = 0;
      const iv = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(iv); resolve(); return; }
        waited += 100;
        if (waited > 15000) { clearInterval(iv); reject(new Error('Google Identity Services failed to load. Check your network connection.')); }
      }, 100);
    });
  }

  /**
   * Wait for the gapi client to load and initialise with the Drive discovery doc.
   */
  function _waitForGapi() {
    return new Promise((resolve, reject) => {
      if (window.gapi?.client?.drive) { gapiReady = true; resolve(); return; }

      let waited = 0;
      const iv = setInterval(() => {
        if (window.gapi) {
          clearInterval(iv);
          gapi.load('client', {
            callback: async () => {
              try {
                await gapi.client.init({ discoveryDocs: [FOLIO_CONFIG.DISCOVERY_DOC] });
                gapiReady = true;
                console.log('[Auth] gapi client ready, drive API loaded');
                resolve();
              } catch (e) {
                console.error('[Auth] gapi.client.init failed:', e);
                reject(new Error('Failed to load Google Drive API: ' + (e.message || e)));
              }
            },
            onerror: () => {
              reject(new Error('Failed to load gapi client module'));
            },
          });
          return;
        }
        waited += 100;
        if (waited > 15000) { clearInterval(iv); reject(new Error('Google API client script failed to load. Check your network connection.')); }
      }, 100);
    });
  }

  /**
   * Initialise the token client (does NOT prompt the user yet).
   */
  async function init() {
    console.log('[Auth] init — waiting for GIS + gapi…');
    await Promise.all([_waitForGIS(), _waitForGapi()]);
    console.log('[Auth] GIS + gapi ready, creating token client');

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: FOLIO_CONFIG.CLIENT_ID,
      scope: FOLIO_CONFIG.SCOPES,
      callback: _handleTokenResponse,
      error_callback: (err) => {
        // Fires when the popup is blocked, closed, or consent fails
        console.error('[Auth] token client error:', err);
        _notifyError('Sign-in failed: ' + (err.message || err.type || 'popup was closed or blocked'));
      },
    });

    console.log('[Auth] init complete');
  }

  /** Error listeners */
  const errorListeners = new Set();
  function onAuthError(fn) { errorListeners.add(fn); }
  function _notifyError(msg) {
    for (const fn of errorListeners) {
      try { fn(msg); } catch (e) { console.error('[Auth] error listener threw:', e); }
    }
  }

  /**
   * Prompt the user to sign in and consent.
   */
  function signIn() {
    if (!tokenClient) {
      _notifyError('Google auth is still loading. Please wait a moment and try again.');
      return;
    }
    console.log('[Auth] requesting access token…');
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  /**
   * Sign the user out and revoke the token.
   */
  function signOut() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    userProfile = null;
    try { gapi.client.setToken(null); } catch { /* ignore */ }
    _notify();
  }

  /**
   * Handle the token response from GIS.
   * Wrapped in try/catch so the UI always updates or shows an error.
   */
  async function _handleTokenResponse(response) {
    try {
      console.log('[Auth] token response received');

      if (response.error) {
        console.error('[Auth] token response error:', response.error, response.error_description);
        _notifyError('Sign-in error: ' + (response.error_description || response.error));
        return;
      }

      accessToken = response.access_token;
      console.log('[Auth] access token acquired');

      // Set the token on gapi client so Drive API calls are authenticated
      if (gapiReady && gapi.client) {
        gapi.client.setToken({ access_token: accessToken });
        console.log('[Auth] gapi token set');
      } else {
        console.warn('[Auth] gapi client not ready — waiting…');
        await _waitForGapi();
        gapi.client.setToken({ access_token: accessToken });
        console.log('[Auth] gapi token set (after wait)');
      }

      // Fetch minimal profile info
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          userProfile = await res.json();
          console.log('[Auth] profile fetched:', userProfile.name, userProfile.email);
        } else {
          console.warn('[Auth] userinfo request failed:', res.status);
          userProfile = { name: 'User', email: '' };
        }
      } catch (e) {
        console.warn('[Auth] userinfo fetch error:', e);
        userProfile = { name: 'User', email: '' };
      }

      _notify();

    } catch (e) {
      console.error('[Auth] _handleTokenResponse crashed:', e);
      _notifyError('Sign-in succeeded but setup failed: ' + e.message);
    }
  }

  function getToken() { return accessToken; }
  function getProfile() { return userProfile; }
  function isSignedIn() { return !!accessToken; }
  function isGapiReady() { return gapiReady; }

  return { init, signIn, signOut, onAuthChange, onAuthError, getToken, getProfile, isSignedIn, isGapiReady };
})();
