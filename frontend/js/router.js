// Map URL hashes to views, replace the main HTML, and clean up the screen being left.
(function () {
  let activeView = null;
  let pendingBookOpening;
  let bookTransition;
  const routes = {
    'home': window.NovelCastViews.home,
    'search': window.NovelCastViews.search,
    'library': window.NovelCastViews.library,
    'book': window.NovelCastViews.bookDetails,
    'reader': window.NovelCastViews.reader,
    'landing': window.NovelCastViews.landing,
    'login': window.NovelCastViews.login
  };

  // Read the screen name and query after #; unknown routes fall back to the landing page.
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const defaultRoute = 'landing';
    const hash = raw || defaultRoute;
    const [pathPart, queryPart] = hash.split('?');
    const route = pathPart.toLowerCase();
    const path = Object.hasOwn(routes, route) ? route : defaultRoute;
    const params = new URLSearchParams(queryPart || '');
    return { path, params };
  }

  // Mark the current sidebar link visually and for assistive technology.
  function updateActiveNav(currentRoute) {
    document.querySelectorAll('[data-nav-route]').forEach(link => {
      const route = link.dataset.navRoute;
      const isActive = route === currentRoute;
      link.classList.toggle('nav-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // Guard private routes, destroy the old view, insert new HTML, then bind its controls.
  function renderRoute() {
    const { path, params } = parseHash();

    // Guard: Library route requires authentication
    if (path === 'library') {
      const isAuth = window.NovelCastAuth && window.NovelCastAuth.isAuthenticated();
      if (!isAuth) {
        if (activeView && typeof activeView.destroy === 'function') activeView.destroy();
        activeView = null;
        document.getElementById('app-view')?.replaceChildren();
        if (window.NovelCast && window.NovelCast.toast) {
          window.NovelCast.toast('Please sign in to access your personal library');
        }
        location.hash = '#/login?redirect=library';
        return;
      }
    }

    const view = routes[path];
    const container = document.getElementById('app-view');
    if (!container) return;

    // Focused mode for landing and login pages: hide app sidebar and header, remove shell padding
    const isFocused = path === 'landing' || path === 'login';
    const sidebar = document.getElementById('app-sidebar');
    const header = document.getElementById('app-header');
    const wrapper = document.getElementById('app-content-wrapper');

    if (sidebar) {
      sidebar.style.display = isFocused ? 'none' : '';
    }
    if (header) {
      header.style.display = isFocused ? 'none' : '';
    }
    if (wrapper) {
      if (isFocused) {
        wrapper.className = 'flex-1 flex flex-col p-0 m-0 min-w-0 overflow-x-hidden transition-all';
      } else {
        wrapper.className = 'flex-1 flex flex-col px-4 sm:px-6 md:px-10 py-5 min-w-0 overflow-x-hidden transition-all';
      }
    }

    // Release route listeners and animations before replacing the DOM.
    if (activeView && typeof activeView.destroy === 'function') activeView.destroy();
    activeView = view;
    document.body.dataset.route = path;
    // Render view HTML
    container.innerHTML = view.render();
    window.NovelCastTheme?.syncToggles();

    // Call view-specific initializer
    if (typeof view.init === 'function') {
      view.init();
    }

    // Update active nav
    updateActiveNav(path);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Global interactive bindings
    if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
      window.NovelCastApp.bindInteractiveElements(container);
    }
  }

  // Handle hash navigation and optionally animate the selected book cover into its details view.
  function handleRouteChange() {
    if (bookTransition) {
      bookTransition.transition.skipTransition();
      bookTransition.cleanup();
      bookTransition = null;
    }
    const opening = pendingBookOpening;
    pendingBookOpening = null;
    if (!opening || opening.hash !== location.hash || !opening.cover?.isConnected ||
        typeof document.startViewTransition !== 'function' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderRoute();
      return;
    }

    const cover = opening.cover;
    const rect = cover.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    if (left + right >= window.innerWidth || top + bottom >= window.innerHeight) {
      renderRoute();
      return;
    }
    const root = document.documentElement;
    root.style.setProperty('--book-opening-inset', `${top}px ${right}px ${bottom}px ${left}px`);
    root.setAttribute('data-book-opening', '');
    cover.setAttribute('data-book-opening-source', '');

    const cleanup = () => {
      cover.removeAttribute('data-book-opening-source');
      root.removeAttribute('data-book-opening');
      root.style.removeProperty('--book-opening-inset');
    };
    let transition;
    try {
      transition = document.startViewTransition(() => {
        if (location.hash === opening.hash) renderRoute();
      });
    } catch {
      cleanup();
      renderRoute();
      return;
    }
    bookTransition = { transition, cleanup };
    const finished = () => {
      if (bookTransition?.transition !== transition) return;
      bookTransition = null;
      cleanup();
    };
    transition.ready.catch(() => {});
    transition.finished.then(finished, finished);
  }

  // Intercept legacy relative links (e.g. href="book-details.html?book=ikigai")
  function interceptLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return;

      const [page, query] = href.split('?');
      if (page.endsWith('.html') && !page.includes(':')) {
        e.preventDefault();
        const qStr = query ? '?' + query : '';
        if (page.includes('book-details')) {
          location.hash = `#/book${qStr}`;
        } else if (page.includes('read-book') || page.includes('read-scroll')) {
          location.hash = `#/reader${qStr}`;
        } else if (page.includes('library')) {
          location.hash = `#/library${qStr}`;
        } else if (page.includes('search')) {
          location.hash = `#/search${qStr}`;
        } else if (page.includes('home')) {
          location.hash = `#/home${qStr}`;
        } else if (page.includes('index')) {
          location.hash = `#/landing${qStr}`;
        }
      }
    });
  }

  window.NovelCastRouter = {
    openBook: function (hash, cover) {
      pendingBookOpening = { hash, cover };
      location.hash = hash;
    },
    navigate: function (path, params = {}) {
      const q = new URLSearchParams(params).toString();
      location.hash = `#/${path}${q ? '?' + q : ''}`;
    },
    init: function () {
      window.addEventListener('hashchange', handleRouteChange);
      let accountId = window.NovelCastAuth?.getUser()?.id || null;
      window.addEventListener('novelcast:auth', event => {
        const nextId = event.detail.user?.id || null;
        if (nextId === accountId) return;
        accountId = nextId;
        if (nextId && parseHash().path === 'login') {
          const redirect = parseHash().params.get('redirect') || 'library';
          location.hash = `#/${Object.hasOwn(routes, redirect) ? redirect : 'library'}`;
          return;
        }
        // Release private view listeners immediately, including sign-out from another tab.
        renderRoute();
      });
      interceptLinks();
      renderRoute();
    }
  };
})();
