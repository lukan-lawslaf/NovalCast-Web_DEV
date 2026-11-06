(function () {
  function photoUrl(user) {
    const sources = [user.user_metadata, ...(Array.isArray(user.identities)
      ? user.identities.map(identity => identity?.identity_data) : [])];
    for (const source of sources) {
      for (const candidate of [source?.avatar_url, source?.picture]) {
        if (typeof candidate !== 'string' || !candidate.trim()) continue;
        try {
          const url = new URL(candidate);
          if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
        } catch {
          // A malformed provider URL should leave the initials visible.
        }
      }
    }
    return '';
  }

  function initials(user) {
    const metadata = user.user_metadata || {};
    const emailName = typeof user.email === 'string' ? user.email.split('@')[0] : '';
    const name = [metadata.full_name, metadata.name, emailName]
      .find(value => typeof value === 'string' && value.trim());
    const words = name?.match(/[\p{L}\p{N}]+/gu) || [];
    return words.slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase() || 'NC';
  }

  function init() {
    const button = document.getElementById('header-user-btn');
    const auth = window.NovelCastAuth;
    if (!button || !auth) return;
    const guest = button.querySelector('[data-profile-guest]');
    const fallback = button.querySelector('[data-profile-initials]');
    auth.onAuthStateChange(user => {
      const signedIn = Boolean(user && auth.isAuthenticated());
      button.querySelector('img')?.remove();
      button.href = signedIn ? '#/library' : '#/login';
      const label = signedIn ? 'Account and My Library' : 'Sign in';
      button.setAttribute('aria-label', label);
      button.title = label;
      guest.hidden = signedIn;
      fallback.hidden = !signedIn;
      fallback.textContent = signedIn ? initials(user) : '';
      if (!signedIn) return;

      const url = photoUrl(user);
      if (!url) return;
      const photo = document.createElement('img');
      photo.alt = '';
      photo.referrerPolicy = 'no-referrer';
      photo.hidden = true;
      photo.addEventListener('load', () => {
        if (!photo.isConnected) return;
        fallback.hidden = true;
        photo.hidden = false;
      }, { once: true });
      photo.addEventListener('error', () => photo.remove(), { once: true });
      button.append(photo);
      photo.src = url;
    });
  }

  window.NovelCastProfile = { init };
})();
