(function () {
  const routes = {
    'home': window.NovelCastViews.home,
    'search': window.NovelCastViews.search,
    'library': window.NovelCastViews.library,
    'book': window.NovelCastViews.bookDetails,
    'reader': window.NovelCastViews.reader,
    'landing': window.NovelCastViews.landing,
    'login': window.NovelCastViews.login
  };

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const defaultRoute = 'landing';
    const hash = raw || defaultRoute;
    const [pathPart, queryPart] = hash.split('?');
    const path = pathPart.toLowerCase() || defaultRoute;
    const params = new URLSearchParams(queryPart || '');
    return { path, params };
  }

  function updateActiveNav(currentRoute) {
    document.querySelectorAll('[data-nav-route]').forEach(link => {
      const route = link.dataset.navRoute;
      const isActive = route === currentRoute;
      link.classList.toggle('nav-active', isActive);
      link.classList.toggle('text-goldAccent', isActive);
      if (isActive) {
        link.classList.add('bg-[#181D26]', 'shadow-[0_0_18px_rgba(243,209,130,0.22)]');
      } else {
        link.classList.remove('bg-[#181D26]', 'shadow-[0_0_18px_rgba(243,209,130,0.22)]');
      }
    });
  }

  function renderRoute() {
    const { path, params } = parseHash();

    // Guard: Library route requires authentication
    if (path === 'library') {
      const isAuth = window.NovelCastAuth && window.NovelCastAuth.isAuthenticated();
      if (!isAuth) {
        if (window.NovelCast && window.NovelCast.toast) {
          window.NovelCast.toast('Please sign in to access your personal library');
        }
        location.hash = '#/login?redirect=library';
        return;
      }
    }

    const view = routes[path] || routes['landing'];
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

    // Render view HTML
    container.innerHTML = view.render();

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

  // Intercept legacy relative links (e.g. href="book-details.html?book=ikigai")
  function interceptLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return;

      if (href.includes('.html')) {
        e.preventDefault();
        const [page, query] = href.split('?');
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
    navigate: function (path, params = {}) {
      const q = new URLSearchParams(params).toString();
      location.hash = `#/${path}${q ? '?' + q : ''}`;
    },
    init: function () {
      window.addEventListener('hashchange', renderRoute);
      interceptLinks();
      renderRoute();
    }
  };
})();
