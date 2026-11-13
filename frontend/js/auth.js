// Expose account helpers to views; Supabase owns credentials, while the backend verifies protected requests.
/**
 * NovelCast Supabase Auth Service
 * Manages user authentication, session persistence, and auth guards
 */
(function () {
  // Retrieve Supabase credentials dynamically from environment (never hardcode in source)
  // Read public browser configuration used to initialize the authentication client.
  function getEnvCredentials() {
    const env = window.__ENV__ || {};
    return {
      url: env.SUPABASE_URL || env.Supabase_url || '',
      key: env.SUPABASE_ANON_KEY || env.Supabase_api || ''
    };
  }

  let client = null;
  const LOCAL_USER_KEY = 'novelcast.auth.user.v1';

  // Turn provider/network failures into messages the login screen can safely show.
  function authError(error) {
    const message = error && error.message || '';
    if (error && (error.status === 0 || error.status >= 500) ||
        /networkerror|failed to fetch|fetch failed|load failed|timed?\s*out|aborted/i.test(message)) {
      return Object.assign(new Error('The sign-in service is currently unreachable. Please try again later.'), { code: 'auth_unavailable' });
    }
    if (error && error.status === 429) return new Error('Too many attempts. Please wait a moment before trying again.');
    return error instanceof Error ? error : Object.assign(new Error(message || 'Unable to complete authentication.'), { code: error && error.code });
  }

  // Abort the actual network request after the timeout and remove temporary signal listeners.
  // Combine cancellation and a timeout so stalled authentication requests can be stopped.
  async function authFetch(url, options = {}) {
    const controller = new AbortController();
    const originalSignal = options.signal;
    // Propagate caller cancellation to the timeout-controlled request.
    const onAbort = () => controller.abort();
    if (originalSignal) {
      if (originalSignal.aborted) controller.abort();
      else originalSignal.addEventListener('abort', onAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      if (originalSignal) originalSignal.removeEventListener('abort', onAbort);
    }
  }

  // Call one Supabase account method and normalize its success/error result.
  async function authRequest(method, payload) {
    try {
      const sb = getClient();
      if (!sb) throw new Error('Sign-in is unavailable because authentication is not configured or has not loaded. Please reload the page.');
      const result = await sb.auth[method](payload);
      if (result.error) throw result.error;
      return result.data;
    } catch (error) {
      throw authError(error);
    }
  }

  // Local fallback storage for fast synchronous state check
  // Recover the cached display identity; server-verified authentication remains authoritative.
  function getStoredUser() {
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  let currentUser = getStoredUser();
  let initPromise;
  let authVersion = 0;
  let signingOut = false;
  // Create the authentication client only when its public configuration and library are available.
  function getClient() {
    if (!client) {
      const { url, key } = getEnvCredentials();
      if (!url || !key) {
        console.warn('[NovelCast Auth] Supabase environment variables not found on window.__ENV__.');
        return null;
      }
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
          client = window.supabase.createClient(url, key, { global: { fetch: authFetch } });
        } catch {
          console.warn('[NovelCast Auth] Invalid authentication configuration.');
          return null;
        }
      } else {
        console.warn('[NovelCast Auth] Supabase library not loaded on window.');
      }
    }
    return client;
  }

  // Cache account metadata and notify views; never store the submitted password here.
  function setStoredUser(user) {
    if (signingOut && user) return;
    currentUser = user;
    authVersion++;
    try {
      if (user) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(LOCAL_USER_KEY);
    } catch { /* Session remains usable even when the browser denies cache writes. */ }
    dispatchAuthChange(user);
  }

  const listeners = [];
  // Notify service callbacks first, then send the account-change event to the app.
  // Notify registered callbacks and the rest of the page when the signed-in identity changes.
  function dispatchAuthChange(user) {
    listeners.forEach(cb => {
      try { cb(user); } catch (err) { console.error(err); }
    });
    // Trigger custom window event
    window.dispatchEvent(new CustomEvent('novelcast:auth', { detail: { user } }));
  }

  const NovelCastAuth = {
    // Reuse the initial restore promise so repeated startup calls do not duplicate subscriptions.
    init: function () {
      if (!initPromise) initPromise = this.restoreSession();
      return initPromise;
    },

    // Restore the session and keep a newer sign-out from being undone by an older response.
    restoreSession: async function () {
      currentUser = getStoredUser();

      // If __ENV__ is not available synchronously, attempt to fetch env.json
      if (!window.__ENV__ || (!window.__ENV__.SUPABASE_URL && !window.__ENV__.Supabase_url)) {
        try {
          const res = await fetch('env.json');
          if (res.ok) {
            window.__ENV__ = await res.json();
          }
        } catch (e) {
          // env.json not reachable
        }
      }

      const sb = getClient();
      if (!sb) { setStoredUser(null); return null; }

      try {
        // Subscribe before reading the initial session so an intervening sign-out wins.
        // Reflect sign-in, sign-out and session changes in the local user state.
        sb.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session?.user) setStoredUser(null);
          else setStoredUser(session.user);
        });
        const version = authVersion;
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) throw error;
        if (version === authVersion) setStoredUser(session?.user || null);
      } catch (err) {
        setStoredUser(null);
        console.warn('[NovelCast Auth] Error checking session:', err);
      }
      return currentUser;
    },

    // Obtain the active token and update account identity before a protected request is sent.
    getAccessToken: async function () {
      if (signingOut) return null;
      const sb = getClient();
      if (!sb) return null;
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (signingOut) return null;
      if (data.session?.user && data.session.user.id !== currentUser?.id) setStoredUser(data.session.user);
      else if (!data.session && currentUser) setStoredUser(null);
      return data.session ? data.session.access_token : null;
    },

    // Expose the current cached identity to views; protected API requests still need a token.
    getUser: function () {
      return currentUser;
    },

    // Treat anonymous and explicitly unconfirmed identities as signed out in the interface.
    isAuthenticated: function () {
      const u = this.getUser();
      if (!u || !u.id || u.is_anonymous) return false;
      // If user object has email confirmation metadata, ensure it is confirmed
      if (u.email_confirmed_at === null || u.confirmed_at === null) {
        return false;
      }
      return true;
    },

    // Register a listener and immediately give it the current identity for initial rendering.
    onAuthStateChange: function (callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
        // Call immediately with current state
        callback(this.getUser());
      }
    },

    // Send registration to Supabase; a returned user without a session is not signed in.
    signUp: async function (email, password, options = {}) {
      const data = await authRequest('signUp', {
        email: email.trim(),
        password: password,
        options: {
          data: options.data || {},
          emailRedirectTo: window.location.origin + window.location.pathname + '#/login?confirmed=true'
        }
      });

      // Only authenticate immediately if an active session is returned (i.e. if email confirmation is turned off)
      // When email confirmation is required, data.session is null and data.user.identities exists
      if (data.session && data.user) {
        setStoredUser(data.user);
      } else {
        // Confirmation email dispatched by Supabase; user cannot directly sign in until confirmed
        setStoredUser(null);
      }
      return data;
    },

    // Sign in with a trimmed email, and give unconfirmed accounts a specific recoverable error.
    // Only publish a signed-in user after the provider returns both a user and a session.
    signIn: async function (email, password) {
      let data;
      try {
        data = await authRequest('signInWithPassword', { email: email.trim(), password });
      } catch (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('not confirmed') || msg.includes('email not confirmed')) {
          const unconfirmedErr = new Error('Your email address has not been confirmed yet. Please verify your inbox and click the confirmation link sent by Supabase before signing in.');
          unconfirmedErr.code = 'email_not_confirmed';
          unconfirmedErr.email = email.trim();
          throw unconfirmedErr;
        }
        throw error;
      }

      if (data.session && data.user) {
        setStoredUser(data.user);
      } else {
        throw new Error('Sign-in did not complete. Please try again.');
      }
      return data;
    },

    // Ask the provider to resend the signup confirmation link back to this application's login route.
    resendConfirmation: async function (email) {
      const data = await authRequest('resend', {
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname + '#/login?confirmed=true'
        }
      });
      return data;
    },

    // Hide private state immediately, even when remote sign-out is slow or fails.
    signOut: async function () {
      const sb = getClient();
      signingOut = true;
      // Hide private data immediately, even if the remote service is slow or offline.
      setStoredUser(null);
      if (sb) {
        try {
          await sb.auth.signOut();
        } catch (e) {
          console.warn('Sign out remote error:', e);
        }
      }
      setStoredUser(null);
      signingOut = false;
      if (window.NovelCast && window.NovelCast.toast) {
        window.NovelCast.toast('Signed out successfully');
      }
      if (window.NovelCastRouter) {
        window.NovelCastRouter.navigate('home');
      }
    }
  };

  window.NovelCastAuth = NovelCastAuth;
})();
