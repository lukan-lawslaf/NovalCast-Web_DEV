/**
 * NovelCast Supabase Auth Service
 * Manages user authentication, session persistence, and auth guards
 */
(function () {
  // Retrieve Supabase credentials dynamically from environment (never hardcode in source)
  function getEnvCredentials() {
    const env = window.__ENV__ || {};
    return {
      url: env.SUPABASE_URL || env.Supabase_url || '',
      key: env.SUPABASE_ANON_KEY || env.Supabase_api || ''
    };
  }

  let client = null;
  const LOCAL_USER_KEY = 'novelcast.auth.user.v1';

  // Local fallback storage for fast synchronous state check
  function getStoredUser() {
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  let currentUser = getStoredUser();
  function getClient() {
    if (!client) {
      const { url, key } = getEnvCredentials();
      if (!url || !key) {
        console.warn('[NovelCast Auth] Supabase environment variables not found on window.__ENV__.');
        return null;
      }
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        client = window.supabase.createClient(url, key);
      } else {
        console.warn('[NovelCast Auth] Supabase library not loaded on window.');
      }
    }
    return client;
  }

  function setStoredUser(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
    dispatchAuthChange(user);
  }

  const listeners = [];
  function dispatchAuthChange(user) {
    listeners.forEach(cb => {
      try { cb(user); } catch (err) { console.error(err); }
    });
    // Trigger custom window event
    window.dispatchEvent(new CustomEvent('novelcast:auth', { detail: { user } }));
  }

  const NovelCastAuth = {
    init: async function () {
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
      if (!sb) return currentUser;

      try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (session && session.user) {
          setStoredUser(session.user);
        } else if (!session && !currentUser) {
          setStoredUser(null);
        }

        // Listen for Supabase auth state changes
        sb.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            setStoredUser(null);
          } else if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
            if (session && session.user) {
              setStoredUser(session.user);
            }
          } else if (session && session.user) {
            setStoredUser(session.user);
          }
        });
      } catch (err) {
        console.warn('[NovelCast Auth] Error checking session:', err);
      }
      return currentUser;
    },

    getUser: function () {
      return currentUser || getStoredUser();
    },

    isAuthenticated: function () {
      const u = this.getUser();
      if (!u) return false;
      // If user object has email confirmation metadata, ensure it is confirmed
      if (u.email_confirmed_at === null || u.confirmed_at === null) {
        return false;
      }
      return true;
    },

    onAuthStateChange: function (callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
        // Call immediately with current state
        callback(this.getUser());
      }
    },

    signUp: async function (email, password, options = {}) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client unavailable');
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: options.data || {},
          emailRedirectTo: window.location.origin + window.location.pathname + '#/login?confirmed=true'
        }
      });
      if (error) throw error;

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

    signIn: async function (email, password) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client unavailable');
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
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
      }
      return data;
    },

    resendConfirmation: async function (email) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client unavailable');
      const { data, error } = await sb.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname + '#/login?confirmed=true'
        }
      });
      if (error) throw error;
      return data;
    },

    signOut: async function () {
      const sb = getClient();
      if (sb) {
        try {
          await sb.auth.signOut();
        } catch (e) {
          console.warn('Sign out remote error:', e);
        }
      }
      setStoredUser(null);
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
