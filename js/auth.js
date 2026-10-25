/* ═══════════════════════════════════════════
   AUTH — Google Identity Services
   ═══════════════════════════════════════════ */

const Auth = (() => {
  const STORAGE_KEY = 'folio_auth_session';

  let tokenClient = null;
  let accessToken = null;
  let userProfile = null;

  /** Listeners for auth state changes */
  const listeners = new Set();
  const errorListeners = new Set();

  function onAuthChange(fn) {
    listeners.add(fn);
  }

  function onAuthError(fn) {
    errorListeners.add(fn);
  }

  function _notify() {
    console.log('[Auth] notify — signedIn:', !!accessToken, 'profile:', userProfile?.name);
    for (const fn of listeners) {
      try { fn({ signedIn: !!accessToken, userProfile, accessToken }); }
      catch (e) { console.error('[Auth] listener error:', e); }
    }
  }

  function _notifyError(msg) {
    console.error('[Auth] error:', msg);
    for (const fn of errorListeners) {
      try { fn(msg); } catch (e) { console.error('[Auth] error listener threw:', e); }
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
        if (waited > 10000) {
          clearInterval(iv);
          reject(new Error('Google Identity Services script failed to load. Check your internet connection or ad-blocker.'));
        }
      }, 100);
    });
  }

  /**
   * Save session to sessionStorage.
   */
  function _saveSession(token, expiresInSecs, profile) {
    try {
      const expiresAt = Date.now() + ((expiresInSecs || 3600) * 1000);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt, profile }));
    } catch {
      // Ignore sessionStorage errors
    }
  }

  /**
   * Restore existing session from sessionStorage if valid.
   */
  function _restoreSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      // Ensure token is valid for at least 60 seconds
      if (data.token && data.expiresAt && data.expiresAt > Date.now() + 60000) {
        accessToken = data.token;
        userProfile = data.profile || { name: 'User', email: '' };
        console.log('[Auth] session restored from sessionStorage:', userProfile.name);
        return true;
      }
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return false;
  }

  /**
   * Initialise the token client.
   */
  async function init() {
    console.log('[Auth] init — waiting for GIS…');
    await _waitForGIS();
    console.log('[Auth] GIS ready, initializing token client');

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: FOLIO_CONFIG.CLIENT_ID,
      scope: FOLIO_CONFIG.SCOPES,
      callback: _handleTokenResponse,
      error_callback: (err) => {
        console.error('[Auth] token client error:', err);
        const detail = err.message || err.type || 'popup was closed or blocked';
        _notifyError(`Sign-in error: ${detail}. If using an unverified Google Cloud project, make sure your email is added to "Test users" in Google Cloud Console.`);
      },
    });

    console.log('[Auth] init complete');

    // Check if session was already active before page reload
    if (_restoreSession()) {
      _notify();
    }
  }

  /**
   * Prompt the user to sign in.
   */
  function signIn() {
    if (!tokenClient) {
      _notifyError('Google sign-in is still initializing. Please wait a moment and try again.');
      return;
    }
    console.log('[Auth] requesting access token…');
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  /**
   * Sign the user out and clear tokens.
   */
  function signOut() {
    if (accessToken) {
      try {
        google.accounts.oauth2.revoke(accessToken, () => {});
      } catch { /* ignore */ }
    }
    accessToken = null;
    userProfile = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    _notify();
  }

  /**
   * Handle the token response from GIS.
   */
  async function _handleTokenResponse(response) {
    try {
      console.log('[Auth] token response received', response);

      if (response.error) {
        const desc = response.error_description || response.error;
        _notifyError(`Sign-in error: ${desc}. Please verify that Authorized JavaScript Origins in Google Cloud Console includes ${window.location.origin}`);
        return;
      }

      accessToken = response.access_token;
      const expiresIn = Number(response.expires_in) || 3600;
      console.log('[Auth] access token acquired successfully');

      // Fetch user profile info
      userProfile = { name: 'User', email: '' };
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          userProfile = await res.json();
          console.log('[Auth] profile fetched:', userProfile.name, userProfile.email);
        }
      } catch (e) {
        console.warn('[Auth] userinfo fetch non-critical error:', e);
      }

      // Persist to session storage so refresh doesn't wipe auth
      _saveSession(accessToken, expiresIn, userProfile);

      _notify();

    } catch (e) {
      console.error('[Auth] _handleTokenResponse crashed:', e);
      _notifyError('Sign-in setup failed: ' + e.message);
    }
  }

  function getToken() { return accessToken; }
  function getProfile() { return userProfile; }
  function isSignedIn() { return !!accessToken; }

  return { init, signIn, signOut, onAuthChange, onAuthError, getToken, getProfile, isSignedIn };
})();
